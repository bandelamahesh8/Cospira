-- Migration: Add RPC to join organization by ID (Code)

CREATE OR REPLACE FUNCTION public.join_organization_by_id(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_member_role_id UUID;
    v_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Check if organization exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization not found. Invalid code.');
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = p_org_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already a member');
    END IF;

    -- Get default "Member" role ID for the organization
    SELECT id INTO v_member_role_id
    FROM organization_roles
    WHERE organization_id = p_org_id AND name = 'Member' AND is_system_role = TRUE
    LIMIT 1;

    -- Fallback: If no system role found, try just returning the first role
    IF v_member_role_id IS NULL THEN
        SELECT id INTO v_member_role_id
        FROM organization_roles
        WHERE organization_id = p_org_id
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- Auto-generate a fallback Member role if for some reason the organization has no roles
    IF v_member_role_id IS NULL THEN
        INSERT INTO organization_roles (organization_id, name, description, is_system_role, permissions)
        VALUES (
            p_org_id, 
            'Member', 
            'Standard participant with limited room powers', 
            TRUE, 
            '{"ROOM_JOIN": true, "ROOM_CHAT": true}'::jsonb
        ) RETURNING id INTO v_member_role_id;
    END IF;

    -- Add the user to the organization
    INSERT INTO organization_members (organization_id, user_id, role_id)
    VALUES (p_org_id, v_user_id, v_member_role_id);

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
