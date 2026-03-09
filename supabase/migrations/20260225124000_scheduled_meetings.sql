-- Create scheduled_meetings table
CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- Policies for scheduled_meetings
CREATE POLICY "Users can view scheduled meetings of their organizations"
    ON public.scheduled_meetings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = scheduled_meetings.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can manage scheduled meetings"
    ON public.scheduled_meetings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            JOIN public.organization_roles ON organization_roles.id = organization_members.role_id
            WHERE organization_members.organization_id = scheduled_meetings.organization_id
            AND organization_members.user_id = auth.uid()
            AND (organization_roles.name IN ('Owner', 'Admin') OR organization_roles.is_system_role = true)
        )
    );

-- Update organizations table policies to allow soft-delete via status
-- The existing policy for UPDATE is: auth.uid() = owner_id
-- We should ensure that a deleted organization is not typically visible unless specifically requested,
-- but the RLS for SELECT already checks membership.
-- If an org is deleted, we might want to prevent selection for members.

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_org_id ON public.scheduled_meetings(organization_id);
