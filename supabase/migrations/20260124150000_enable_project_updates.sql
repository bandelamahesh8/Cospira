-- ENABLE UPDATE/DELETE POLICIES FOR PROJECTS (Soft Delete Support)

-- 1. DROP EXISTING POLICIES (To be safe and avoid conflicts)
DROP POLICY IF EXISTS "Members update projects" ON "public"."projects";
DROP POLICY IF EXISTS "Members delete projects" ON "public"."projects";

-- 2. CREATE UPDATE POLICY
-- Allows members to update projects (e.g. for Soft Delete 'status' = 'deleted')
CREATE POLICY "Members update projects" ON "public"."projects"
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- 3. CREATE DELETE POLICY
-- Allows members to hard-delete (if needed in future, or for cleanup)
CREATE POLICY "Members delete projects" ON "public"."projects"
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);
