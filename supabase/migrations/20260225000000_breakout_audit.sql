-- ─────────────────────────────────────────────────────────────
-- Migration: Breakout System — Audit Table + Status Constraint
-- Created: 2026-02-25
-- ─────────────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor or via supabase db push

-- 1. Update breakout_sessions status constraint to include PAUSED
-- ─────────────────────────────────────────────────────────────
ALTER TABLE breakout_sessions
  DROP CONSTRAINT IF EXISTS breakout_sessions_status_check;

ALTER TABLE breakout_sessions
  ADD CONSTRAINT breakout_sessions_status_check
  CHECK (status IN ('CREATED', 'LIVE', 'PAUSED', 'CLOSED'));

-- Add updated_at column if not present
ALTER TABLE breakout_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ─────────────────────────────────────────────────────────────
-- 2. ULTRA Secure Immutable Audit Event Log
-- ─────────────────────────────────────────────────────────────
-- Append-only table. No UPDATE or DELETE policies = tamper-evident.

CREATE TABLE IF NOT EXISTS breakout_audit_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL,
  breakout_id   uuid        NULL,
  actor_id      uuid        NOT NULL,

  -- Action type (matches AuditAction in organization.ts)
  action        text        NOT NULL
    CHECK (action IN (
      'BREAKOUT_CREATED', 'BREAKOUT_STARTED', 'BREAKOUT_PAUSED',
      'BREAKOUT_RESUMED', 'BREAKOUT_CLOSED',
      'HOST_ASSIGNED', 'PARTICIPANT_ASSIGNED', 'PARTICIPANT_REMOVED',
      'HOST_REASSIGNED', 'OWNER_JOINED', 'MODE_SWITCHED',
      'POLICY_DENIED'
    )),

  -- Tamper-evident payload hash (SHA-256 of payload JSON)
  payload_hash  text        NOT NULL,
  payload       jsonb       NOT NULL DEFAULT '{}',

  -- Effective org mode at time of action (captured server-side)
  mode          text        NOT NULL
    CHECK (mode IN ('FUN', 'PROF', 'ULTRA_SECURE', 'MIXED')),

  -- Populated for POLICY_DENIED events
  audit_code    text        NULL,
  denial_reason text        NULL,

  -- Immutable timestamp — set by DB, never by client
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. Indexes for common queries
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bae_org_id
  ON breakout_audit_events (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bae_breakout_id
  ON breakout_audit_events (breakout_id, created_at DESC)
  WHERE breakout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bae_denied
  ON breakout_audit_events (org_id, action)
  WHERE action = 'POLICY_DENIED';

-- ─────────────────────────────────────────────────────────────
-- 4. Row Level Security (Append-Only Enforcement)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE breakout_audit_events ENABLE ROW LEVEL SECURITY;

-- INSERT: server only (service role bypasses RLS — clients use anon key)
-- Client inserts are intentionally blocked. Server uses service role key.
CREATE POLICY "audit_client_no_insert"
  ON breakout_audit_events
  FOR INSERT
  TO authenticated    -- blocks authenticated client inserts
  WITH CHECK (false); -- only service role (which bypasses RLS) can insert

-- SELECT: org owner only
CREATE POLICY "audit_owner_select"
  ON breakout_audit_events
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- No UPDATE policy = UPDATE is denied
-- No DELETE policy = DELETE is denied
-- → Tamper-evident by design

-- ─────────────────────────────────────────────────────────────
-- 5. Realtime (optional — let owner see live audit feed)
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE breakout_audit_events;

-- ─────────────────────────────────────────────────────────────
-- 6. Foreign key constraints (add if orgs + users tables exist)
-- ─────────────────────────────────────────────────────────────
-- Uncomment if your organizations table exists:
-- ALTER TABLE breakout_audit_events
--   ADD CONSTRAINT fk_bae_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Uncomment if your breakout_sessions table exists at migration time:
-- ALTER TABLE breakout_audit_events
--   ADD CONSTRAINT fk_bae_breakout FOREIGN KEY (breakout_id) REFERENCES breakout_sessions(id) ON DELETE SET NULL;
