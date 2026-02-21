-- 1. UPGRADE ORGANIZATION_ROLES TABLE
-- Add Priority & System Lock Columns

ALTER TABLE public.organization_roles
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 50 NOT NULL, -- 0=Owner, 10=Admin, 50=Member, 80=Viewer
ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create Uniqueness Constraint on (Org, Name) to prevent ambiguous roles
ALTER TABLE public.organization_roles 
ADD CONSTRAINT unique_org_role_name UNIQUE (organization_id, name);


-- 2. CREATE DEFAULT SYSTEM ROLES (If not exists)
-- This is tricky for existing orgs, but for new/clean slate:
-- We'll assume the helper function `seed_organization_roles` (from Phase 1) needs update or we run a script.
-- For now, let's just ensure the COLUMNS are ready. The Application Logic handles creation.

-- 3. SECURE ROLE MANAGEMENT FUNCTIONS (RPCs)

-- A. Create Custom Role (Secure)
CREATE OR REPLACE FUNCTION public.create_role_secure(
    p_org_id UUID,
    p_name TEXT,
    p_priority INT,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_priority INT;
    v_new_role_id UUID;
BEGIN
    -- 1. Get Actor's Priority
    SELECT oroles.priority INTO v_actor_priority
    FROM public.organization_members om
    JOIN public.organization_roles oroles ON om.role_id = oroles.id
    WHERE om.organization_id = p_org_id AND om.user_id = p_actor_id;

    IF v_actor_priority IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACTOR_NOT_MEMBER');
    END IF;

    -- 2. Enforce Anti-Escalation: Cannot create role higher or equal to self? 
    -- Actually, usually Admin (10) can create Moderator (20). 
    -- Logic: New Priority MUST be > Actor Priority (Lower value = Higher Power).
    -- Wait, Admin (10) can create Admin (10) peer? Usually no.
    IF p_priority <= v_actor_priority THEN
         RETURN jsonb_build_object('success', false, 'error', 'ROLE_ESCALATION_BLOCKED: Cannot create role with higher/equal priority');
    END IF;

    -- 3. Clamp Priority (Max 100)
    IF p_priority > 100 THEN p_priority := 100; END IF;

    -- 4. Insert
    INSERT INTO public.organization_roles (organization_id, name, priority, is_system_role, is_deletable, is_editable)
    VALUES (p_org_id, p_name, p_priority, false, true, true)
    RETURNING id INTO v_new_role_id;

    -- 5. Audit
    INSERT INTO public.activity_logs (organization_id, actor_id, action, target_type, target_id, metadata)
    VALUES (p_org_id, p_actor_id, 'ROLE_CREATED', 'role', v_new_role_id, jsonb_build_object('name', p_name, 'priority', p_priority));

    RETURN jsonb_build_object('success', true, 'role_id', v_new_role_id);
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'ROLE_NAME_EXISTS');
WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- B. Delete Role (Safe)
CREATE OR REPLACE FUNCTION public.delete_role_safe(
    p_role_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role RECORD;
    v_member_count INT;
    v_org_id UUID;
    v_actor_priority INT;
BEGIN
    -- 1. Get Role Details
    SELECT * INTO v_role FROM public.organization_roles WHERE id = p_role_id;
    IF v_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROLE_NOT_FOUND');
    END IF;
    v_org_id := v_role.organization_id;

    -- 2. Check Permissions/Priority of Actor
    SELECT oroles.priority INTO v_actor_priority
    FROM public.organization_members om
    JOIN public.organization_roles oroles ON om.role_id = oroles.id
    WHERE om.organization_id = v_org_id AND om.user_id = p_actor_id;

    IF v_actor_priority >= v_role.priority THEN
         RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_PRIVILEGES');
    END IF;

    -- 3. System Role Check
    IF v_role.is_deletable = false THEN
        RETURN jsonb_build_object('success', false, 'error', 'SYSTEM_ROLE_PROTECTED');
    END IF;

    -- 4. Orphan Check (Are users assigned?)
    SELECT COUNT(*) INTO v_member_count FROM public.organization_members WHERE role_id = p_role_id;
    IF v_member_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROLE_IN_USE', 'count', v_member_count);
    END IF;

    -- 5. Delete (Cascade handles permissions)
    DELETE FROM public.organization_roles WHERE id = p_role_id;

    -- 6. Audit
    INSERT INTO public.activity_logs (organization_id, actor_id, action, target_type, target_id, metadata)
    VALUES (v_org_id, p_actor_id, 'ROLE_DELETED', 'role', p_role_id, jsonb_build_object('name', v_role.name));

    RETURN jsonb_build_object('success', true);
END;
$$;

-- C. Update Role Permissions (Atomic Diff)
-- This is complex to do purely in SQL without passing arrays. 
-- For simplicity in Phase 3 verification, we will handle Diffing in Backend and use a Transaction there, 
-- or we can use a simpler function that just wipes and inserts if we trust the backend logic.
-- Given Supabase 'rpc' limitations with arrays sometimes, let's trust the Service Layer for this one specific Task 
-- BUT enforce Critical Permission guard here.

CREATE OR REPLACE FUNCTION public.guard_system_role_permissions()
RETURNS TRIGGER AS $$
DECLARE
    v_role_is_system BOOLEAN;
    v_perm_key TEXT;
BEGIN
    -- Check if role is system
    SELECT is_system_role INTO v_role_is_system FROM public.organization_roles WHERE id = OLD.role_id;
    
    IF v_role_is_system THEN
        -- Check if removing critical permission
        SELECT key INTO v_perm_key FROM public.permissions WHERE id = OLD.permission_id;
        
        IF v_perm_key IN ('ORG_DELETE', 'ROLE_MANAGE', 'OWNER_TRANSFER') THEN
            RAISE EXCEPTION 'Cannot remove critical permission % from system role', v_perm_key;
        END IF;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protect_system_role_perms
BEFORE DELETE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.guard_system_role_permissions();
