-- 1. UPGRADE EXISTING TABLES
-- organizations: Add SaaS identity columns
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS domain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- organization_members: Add RBAC columns (leaving 'role' for now for safe migration)
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS role_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'blocked')),
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Drop old valid index if exists to replace with more specific one if needed, 
-- but strict unique constraint on (org_id, user_id) should already exist.
-- We'll ensure an index exists for performance.
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON public.organization_members(user_id, organization_id);


-- 2. CREATE RBAC CORE TABLES
-- permissions: Global system capabilities
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    description TEXT
);

-- organization_roles: Roles definitions per organization
CREATE TABLE IF NOT EXISTS public.organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (organization_id, name)
);

-- role_permissions: Join table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.organization_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


-- 3. CREATE AUXILIARY TABLES
-- organization_policies: Global rules per org
CREATE TABLE IF NOT EXISTS public.organization_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB,
    UNIQUE (organization_id, key)
);

-- projects: Resource container
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- teams: User groups
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- team_members: Users in teams
CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- team_projects: Projects assigned to teams
CREATE TABLE IF NOT EXISTS public.team_projects (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, project_id)
);

-- organization_invites: Secure invitations
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_id UUID REFERENCES public.organization_roles(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- activity_logs: Audit trail
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_type TEXT,
    target_id UUID,
    action TEXT NOT NULL,
    severity TEXT DEFAULT 'low',
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- 4. ENABLE RLS (STRICT ISOLATION)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;


-- 5. DEFINE POLICIES
-- Permissions: Public read (or authenticated read)
CREATE POLICY "Permissions are viewable by everyone" ON public.permissions FOR SELECT USING (true);

-- Organization Roles: Viewable by members of the org
CREATE POLICY "Roles viewable by org members" ON public.organization_roles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = organization_roles.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

-- Organization Policies: Viewable by members
CREATE POLICY "Policies viewable by org members" ON public.organization_policies FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = organization_policies.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

-- Activity Logs: Viewable by Admins/Owners only (using RBAC check ideally, but simplified for bootstrap)
CREATE POLICY "Logs viewable by org members" ON public.activity_logs FOR SELECT USING (
     EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = activity_logs.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

-- Projects: Tenant Isolation
CREATE POLICY "Projects viewable by org members" ON public.projects FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = projects.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);


-- 6. DATA SEEDING & MIGRATION SCRIPT
-- 6.1 Seed Global Permissions
INSERT INTO public.permissions (key, description) VALUES
('ORG_VIEW', 'View organization details'),
('ORG_UPDATE', 'Update organization settings'),
('MEMBER_INVITE', 'Invite new members'),
('MEMBER_REMOVE', 'Remove members'),
('ROLE_CREATE', 'Create new roles'),
('ROLE_ASSIGN', 'Assign roles to members'),
('PROJECT_CREATE', 'Create new projects'),
('PROJECT_DELETE', 'Delete projects'),
('TEAM_MANAGE', 'Manage teams'),
('BILLING_VIEW', 'View billing information')
ON CONFLICT (key) DO NOTHING;

-- 6.2 Backfill Function (The "Migration" Logic)
CREATE OR REPLACE FUNCTION public.migrate_organization_roles()
RETURNS void AS $$
DECLARE
    org_rec RECORD;
    owner_role_id UUID;
    admin_role_id UUID;
    member_role_id UUID;
    perm_rec RECORD;
BEGIN
    -- Loop through all existing organizations
    FOR org_rec IN SELECT * FROM public.organizations LOOP
        
        -- A. Create Roles for this Org if they don't exist
        
        -- Owner Role
        INSERT INTO public.organization_roles (organization_id, name, is_system_role)
        VALUES (org_rec.id, 'Owner', true)
        ON CONFLICT (organization_id, name) DO UPDATE SET is_system_role = true
        RETURNING id INTO owner_role_id;

        -- Admin Role
        INSERT INTO public.organization_roles (organization_id, name, is_system_role)
        VALUES (org_rec.id, 'Admin', true)
        ON CONFLICT (organization_id, name) DO UPDATE SET is_system_role = true
        RETURNING id INTO admin_role_id;

        -- Member Role
        INSERT INTO public.organization_roles (organization_id, name, is_system_role)
        VALUES (org_rec.id, 'Member', true)
        ON CONFLICT (organization_id, name) DO UPDATE SET is_system_role = true
        RETURNING id INTO member_role_id;


        -- B. Map Permissions to Roles (Basic Default Setup)
        -- Owner: All Permissions
        FOR perm_rec IN SELECT id FROM public.permissions LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (owner_role_id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Admin: All except specialized (simplified for now, giving most)
        FOR perm_rec IN SELECT id FROM public.permissions WHERE key != 'ORG_DELETE' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (admin_role_id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Member: View Permissions
        FOR perm_rec IN SELECT id FROM public.permissions WHERE key IN ('ORG_VIEW', 'PROJECT_CREATE') LOOP
             INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (member_role_id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;


        -- C. Migrate Members (The Dual Write Backfill)
        -- Map existing 'owner' string to new Owner ID
        UPDATE public.organization_members
        SET role_id = owner_role_id
        WHERE organization_id = org_rec.id AND role = 'owner';

        -- Map existing 'admin' string to new Admin ID
        UPDATE public.organization_members
        SET role_id = admin_role_id
        WHERE organization_id = org_rec.id AND role = 'admin';

        -- Map 'member' logic
        UPDATE public.organization_members
        SET role_id = member_role_id
        WHERE organization_id = org_rec.id AND (role = 'member' OR role IS NULL);
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT public.migrate_organization_roles();

-- Drop the function after use
DROP FUNCTION public.migrate_organization_roles();

-- 7. ADD FOREIGN KEY CONSTRAINT TO ORGANIZATION_MEMBERS
-- Now that we've backfilled, we can enforce the FK, but we should make sure it's valid first.
ALTER TABLE public.organization_members 
ADD CONSTRAINT fk_organization_members_role
FOREIGN KEY (role_id) REFERENCES public.organization_roles(id);
