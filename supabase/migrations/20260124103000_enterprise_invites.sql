-- 1. UPGRADE ORGANIZATION_INVITES TABLE
-- Migration to Hashed Tokens Schema

-- Remove the plain text token column (Wait! We need to migrate data first if we cared about preserving old invites, 
-- but since this is dev/new feature, we can just replace or add. Let's add hash first).

ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS token_hash TEXT, -- Storing SHA256 Hash
ADD COLUMN IF NOT EXISTS invite_type TEXT DEFAULT 'email' CHECK (invite_type IN ('email', 'link', 'domain')),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS used_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Make hash unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_token_hash ON public.organization_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_invites_org_status ON public.organization_invites(organization_id, status);

-- Drop old plain text token constraints if needed, but let's keep the column nullable for legacy 
-- or drop it if we are sure. For Phase 2 clean start:
ALTER TABLE public.organization_invites DROP COLUMN IF EXISTS token;


-- 2. SECURE ATOMIC ACCEPTANCE FUNCTION (RPC)
-- This function handles the "Check -> Update -> Insert" flow in a SINGLE transaction
-- preventing race conditions where a token is used multiple times simultaneously.

CREATE OR REPLACE FUNCTION public.accept_invite_secure(
    p_token_hash TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as Owner to bypass RLS during the transaction steps if needed, but safer to check logic inside
SET search_path = public
AS $$
DECLARE
    v_invite RECORD;
    v_role_priority INT;
    v_membership_exists BOOLEAN;
BEGIN
    -- A. Lock the invite row for update
    SELECT * INTO v_invite
    FROM public.organization_invites
    WHERE token_hash = p_token_hash
    FOR UPDATE; -- CRITICAL: Locks row

    -- B. Validations
    IF v_invite IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVITE_NOT_FOUND');
    END IF;

    IF v_invite.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVITE_NOT_PENDING', 'status', v_invite.status);
    END IF;

    IF v_invite.expires_at < now() THEN
        -- Auto-expire if we catch it
        UPDATE public.organization_invites SET status = 'expired' WHERE id = v_invite.id;
        RETURN jsonb_build_object('success', false, 'error', 'INVITE_EXPIRED');
    END IF;

    IF v_invite.used_count >= v_invite.max_uses THEN
         RETURN jsonb_build_object('success', false, 'error', 'INVITE_MAX_USES');
    END IF;

    -- C. Idempotency Check: Is user already a member?
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = v_invite.organization_id AND user_id = p_user_id
    ) INTO v_membership_exists;

    IF v_membership_exists THEN
         RETURN jsonb_build_object('success', false, 'error', 'ALREADY_MEMBER');
    END IF;

    -- D. Execute Acceptance (Atomic)
    
    -- 1. Insert Member
    INSERT INTO public.organization_members (organization_id, user_id, role_id, status, joined_at)
    VALUES (v_invite.organization_id, p_user_id, v_invite.role_id, 'active', now());

    -- 2. Update Invite
    -- Increment used count
    UPDATE public.organization_invites
    SET used_count = used_count + 1,
        accepted_at = now(),
        status = CASE 
            WHEN used_count + 1 >= max_uses THEN 'accepted' 
            ELSE 'pending' 
        END
    WHERE id = v_invite.id;

    -- 3. Audit Log (System level log)
    INSERT INTO public.activity_logs (
        organization_id, 
        actor_id, 
        action, 
        target_type, 
        target_id, 
        metadata
    ) VALUES (
        v_invite.organization_id,
        p_user_id,
        'INVITE_ACCEPTED',
        'invite',
        v_invite.id,
        jsonb_build_object('method', 'token_hash')
    );

    RETURN jsonb_build_object('success', true, 'organization_id', v_invite.organization_id);

EXCEPTION WHEN OTHERS THEN
    -- Catch all error to allow clean API response
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
