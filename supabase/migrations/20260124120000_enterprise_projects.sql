-- 1. UPGRADE PROJECTS TABLE
-- Ensure Enterprise fields exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ensure Unique Name per Org
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS unique_project_name_per_org;

ALTER TABLE public.projects 
ADD CONSTRAINT unique_project_name_per_org UNIQUE (organization_id, name);


-- 2. UPGRADE TEAMS TABLE
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS unique_team_name_per_org;

ALTER TABLE public.teams 
ADD CONSTRAINT unique_team_name_per_org UNIQUE (organization_id, name);


-- 3. UPGRADE TEAM_MEMBERS
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id);


-- 4. CREATE PROJECT_TEAMS (Scope Link)
CREATE TABLE IF NOT EXISTS public.project_teams (
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (project_id, team_id)
);

-- Enable RLS
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;


-- 5. CREATE PROJECT_MEMBERS (Direct Scope)
CREATE TABLE IF NOT EXISTS public.project_members (
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;


-- 6. SECURITY: RLS POLICIES (THE SCOPE ENGINE)

-- 6.1 Policy for PROJECT_TEAMS
-- Visible if you are in the Org
CREATE POLICY "Project teams viewable by org members" ON public.project_teams FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = project_teams.project_id
        AND om.user_id = auth.uid()
    )
);

-- 6.2 Policy for PROJECT_MEMBERS
-- Visible if you are in the Org
CREATE POLICY "Project members viewable by org members" ON public.project_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = project_members.project_id
        AND om.user_id = auth.uid()
    )
);


-- 6.3 MAIN PROJECT ACCESS POLICY (Enterprise Requirement)
-- Drop old simple policy
DROP POLICY IF EXISTS "Projects viewable by org members" ON public.projects;

-- Create New Scope-Based Policy
CREATE POLICY "Enterprise Project Access" ON public.projects FOR SELECT USING (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
    )
    AND (
        -- 1. Org Admin/Owner (Access All)
        EXISTS (
            SELECT 1 FROM public.organization_members om
            JOIN public.organization_roles r ON om.role_id = r.id
            WHERE om.organization_id = projects.organization_id
            AND om.user_id = auth.uid()
            AND (r.name IN ('Owner', 'Admin') OR r.priority <= 10)
        )
        OR 
        -- 2. Direct Member
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id
            AND pm.user_id = auth.uid()
        )
        OR
        -- 3. Team Member (via Project-Team link)
        EXISTS (
            SELECT 1 FROM public.team_members tm
            JOIN public.project_teams pt ON tm.team_id = pt.team_id
            WHERE pt.project_id = projects.id
            AND tm.user_id = auth.uid()
        )
        OR
        -- 4. Creator (Fail safe)
        created_by = auth.uid()
    )
);

-- Note: Insert/Update/Delete policies usually restricted to Admins or those with specific permissions.
-- For now, we enforce Read Scope aggressively. Write scope relies on Service Layer Permission checks (PROJECT_CREATE etc).
