-- REPAIR SCRIPT FOR MISSING COLUMNS AND RPC AMBIGUITY

-- 1. FIX PROJECTS TABLE SCHEMA
-- Ensure 'status' column exists (CREATE TABLE IF NOT EXISTS skipped it if table existed)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. FIX TEAMS TABLE SCHEMA
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. REPAIR SECURE RPC FUNCTION (Resolve Ambiguity)
-- We rename aliases and fully qualify every single column reference to avoid "ambiguous column" errors.
CREATE OR REPLACE FUNCTION public.get_organization_members_secure(p_org_id UUID)
RETURNS TABLE (
    user_id UUID,
    role_id UUID,
    status TEXT,
    joined_at TIMESTAMPTZ,
    organization_roles JSON,
    profiles JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Permission Check
    -- Check if the requesting user (auth.uid()) is a member of the target org (p_org_id)
    -- We use 'om_check' alias to be safe
    IF NOT EXISTS (
        SELECT 1 
        FROM public.organization_members AS om_check 
        WHERE om_check.organization_id = p_org_id 
        AND om_check.user_id = auth.uid()
    ) THEN
        RETURN; -- Unauthorized: Return empty set
    END IF;

    -- 2. Return Data
    RETURN QUERY
    SELECT 
        m.user_id,
        m.role_id,
        m.status,
        m.joined_at,
        to_json(r.*) as organization_roles,
        json_build_object(
            'display_name', p.display_name, 
            'email', u.email,
            'avatar_url', p.avatar_url
        ) as profiles
    FROM public.organization_members AS m
    JOIN public.organization_roles AS r ON m.role_id = r.id
    LEFT JOIN public.profiles AS p ON m.user_id = p.id
    LEFT JOIN auth.users AS u ON m.user_id = u.id
    WHERE m.organization_id = p_org_id;
END;
$$;
