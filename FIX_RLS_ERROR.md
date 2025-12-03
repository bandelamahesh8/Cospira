# Quick Fix for RLS Infinite Recursion Error

## The Problem
Your Supabase database has an infinite recursion error in the RLS policies for the `organization_members` table.

## The Solution
Copy and paste the SQL below into your **Supabase SQL Editor**:

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `ysessmuraxozobczjfbq`
3. Click "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Copy and Paste This SQL

```sql
-- Fix infinite recursion in organization_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.organization_members;

-- Create helper function to check membership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_organization_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
        AND organization_members.user_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is admin/owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
        AND organization_members.user_id = user_id
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using helper functions
CREATE POLICY "Users can view members of their organizations"
    ON public.organization_members
    FOR SELECT
    USING (
        public.is_organization_member(organization_id, auth.uid())
    );

CREATE POLICY "Owners and admins can insert members"
    ON public.organization_members
    FOR INSERT
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
    );

CREATE POLICY "Owners and admins can update members"
    ON public.organization_members
    FOR UPDATE
    USING (
        public.is_organization_admin(organization_id, auth.uid())
    );

CREATE POLICY "Owners and admins can delete members"
    ON public.organization_members
    FOR DELETE
    USING (
        public.is_organization_admin(organization_id, auth.uid())
    );
```

### Step 3: Run the Query
Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)

### Step 4: Verify
Refresh your application at http://localhost and the 500 error should be gone!

---

## What This Does
- **Drops** the problematic RLS policies that cause infinite recursion
- **Creates** helper functions with `SECURITY DEFINER` that bypass RLS when checking membership
- **Recreates** the policies using these helper functions to avoid the recursion

This is a standard pattern for fixing RLS infinite recursion issues in Supabase/PostgreSQL.
