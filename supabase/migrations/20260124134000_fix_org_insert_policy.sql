-- Comprehensive RLS fixes for Organization Creation flow

-- 1. ORGANIZATIONS TABLE
-- Allow authenticated users to insert a new organization if they are the owner
DROP POLICY IF EXISTS "Users can create organizations" ON "public"."organizations";
CREATE POLICY "Users can create organizations" ON "public"."organizations"
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- Allow owners to view their own organizations (Crucial for the .select() return)
-- Existing policies might only check membership, which doesn't exist yet!
DROP POLICY IF EXISTS "Owners can view their organizations" ON "public"."organizations";
CREATE POLICY "Owners can view their organizations" ON "public"."organizations"
FOR SELECT 
TO authenticated 
USING (auth.uid() = owner_id);

-- 2. ORGANIZATION_ROLES TABLE (For manual fallback)
-- Allow owners to create roles in their organizations
DROP POLICY IF EXISTS "Owners can create roles" ON "public"."organization_roles";
CREATE POLICY "Owners can create roles" ON "public"."organization_roles"
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."organizations" 
    WHERE id = organization_id AND owner_id = auth.uid()
  )
);

-- 3. ORGANIZATION_MEMBERS TABLE (For manual fallback)
-- Allow owners to add themselves (or others) to their organizations
DROP POLICY IF EXISTS "Owners can add members" ON "public"."organization_members";
CREATE POLICY "Owners can add members" ON "public"."organization_members"
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."organizations" 
    WHERE id = organization_id AND owner_id = auth.uid()
  )
);
