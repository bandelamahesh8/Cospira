-- ─────────────────────────────────────────────────────────────
-- Migration: Dynamic RLS Ownership for Audit Log (GAP 4)
-- Created: 2026-02-25
-- ─────────────────────────────────────────────────────────────
-- Replaces any cached-ownership SELECT policy on breakout_audit_events
-- with a truly DYNAMIC lookup against the organizations table.
--
-- Why this matters:
--   If org ownership is transferred, the old owner must INSTANTLY
--   lose access and the new owner INSTANTLY gain it.
--   RLS subquery re-evaluates on every query — no cache, no stale grants.
-- ─────────────────────────────────────────────────────────────

-- Drop the static policy from the previous migration if it exists
DROP POLICY IF EXISTS "audit_owner_select" ON breakout_audit_events;

-- Create dynamic ownership lookup policy
-- Uses a correlated subquery — evaluated fresh on EVERY SELECT.
-- auth.uid() is always current-session, never cached.
CREATE POLICY "audit_dynamic_owner_select"
  ON breakout_audit_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organizations
      WHERE organizations.id = breakout_audit_events.org_id
        AND organizations.owner_id = auth.uid()
    )
  );

-- Ensure INSERT is still denied for authenticated clients
-- (service-role key bypasses RLS — only the server can write)
DROP POLICY IF EXISTS "audit_client_no_insert" ON breakout_audit_events;
CREATE POLICY "audit_client_no_insert"
  ON breakout_audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Confirm no UPDATE or DELETE policies exist (append-only guarantee)
-- These are intentionally absent. Supabase denies by default when RLS is enabled.
-- You can verify with: SELECT * FROM pg_policies WHERE tablename = 'breakout_audit_events';
