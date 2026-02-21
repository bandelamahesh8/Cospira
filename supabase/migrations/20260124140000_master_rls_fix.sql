-- MASTER RLS FIX FOR COSPIRA ORGANIZATIONS & PROJECTS
-- This script fixes "403 Forbidden" and empty result issues by establishing
-- a baseline of permissive-but-secure policies for Owners and Members.

-- ==========================================
-- 1. ORGANIZATIONS
-- ==========================================

-- Allow ANY authenticated user to create an organization (becoming owner)
DROP POLICY IF EXISTS "Users can create organizations" ON "public"."organizations";
CREATE POLICY "Users can create organizations" ON "public"."organizations"
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- Allow users to view organizations they own OR are a member of
-- (Using a simplified EXISTS clause to avoid infinite recursion)
DROP POLICY IF EXISTS "Users can view their organizations" ON "public"."organizations";
CREATE POLICY "Users can view their organizations" ON "public"."organizations"
FOR SELECT 
TO authenticated 
USING (
  owner_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_members.organization_id = organizations.id 
    AND organization_members.user_id = auth.uid()
  )
);

-- ==========================================
-- 2. ORGANIZATION MEMBERS & ROLES
-- ==========================================

-- Allow users to view their own membership and others in their orgs
DROP POLICY IF EXISTS "View members of my orgs" ON "public"."organization_members";
CREATE POLICY "View members of my orgs" ON "public"."organization_members"
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() -- View self
  OR
  organization_id IN ( -- View others in orgs I belong to
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow Owners to manage members (Add/Remove)
DROP POLICY IF EXISTS "Owners manage members" ON "public"."organization_members";
CREATE POLICY "Owners manage members" ON "public"."organization_members"
FOR ALL
TO authenticated 
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

-- Allow viewing roles for orgs I belong to
DROP POLICY IF EXISTS "View roles of my orgs" ON "public"."organization_roles";
CREATE POLICY "View roles of my orgs" ON "public"."organization_roles"
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow owners to create roles
-- Note: 'organization_roles' RLS is tricky on INSERT because row doesn't exist yet to check org ownership.
-- We check if the user OWNS the organization_id specified in the new row.
DROP POLICY IF EXISTS "Owners create roles" ON "public"."organization_roles";
CREATE POLICY "Owners create roles" ON "public"."organization_roles"
FOR INSERT
TO authenticated
WITH CHECK (
   EXISTS (
     SELECT 1 FROM organizations 
     WHERE id = organization_id 
     AND owner_id = auth.uid()
   )
);

-- ==========================================
-- 3. PROJECTS & TEAMS
-- ==========================================

-- Allow members to VIEW projects in their org
DROP POLICY IF EXISTS "View projects in my org" ON "public"."projects";
CREATE POLICY "View projects in my org" ON "public"."projects"
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow owners (or those with permission) to CREATE projects
-- Simplified: Allow any member for now, can be restricted to 'PROJECT_CREATE' permission later
DROP POLICY IF EXISTS "Members create projects" ON "public"."projects";
CREATE POLICY "Members create projects" ON "public"."projects"
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow members to VIEW teams
DROP POLICY IF EXISTS "View teams in my org" ON "public"."teams";
CREATE POLICY "View teams in my org" ON "public"."teams"
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow members to CREATE teams
DROP POLICY IF EXISTS "Members create teams" ON "public"."teams";
CREATE POLICY "Members create teams" ON "public"."teams"
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow linking Teams to Projects
DROP POLICY IF EXISTS "Link teams to projects" ON "public"."project_teams";
CREATE POLICY "Link teams to projects" ON "public"."project_teams"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_teams.project_id 
    AND organization_id IN (
       SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);

-- Allow viewing/adding Team Members
DROP POLICY IF EXISTS "Manage team members" ON "public"."team_members";
CREATE POLICY "Manage team members" ON "public"."team_members"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_members.team_id
    AND organization_id IN (
       SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);
