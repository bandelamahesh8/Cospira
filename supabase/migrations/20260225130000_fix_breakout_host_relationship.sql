-- ─────────────────────────────────────────────────────────────
-- Migration: Fix Breakout Host Relationship
-- Created: 2026-02-25
-- ─────────────────────────────────────────────────────────────

-- The previous definition referenced auth.users which prevents PostgREST 
-- from automatically traversing to player_profiles for enriched fields.
-- We re-align the host_id to point directly to the public profile.

ALTER TABLE breakout_sessions
  DROP CONSTRAINT IF EXISTS breakout_sessions_host_id_fkey;

ALTER TABLE breakout_sessions
  ADD CONSTRAINT breakout_sessions_host_id_fkey 
  FOREIGN KEY (host_id) 
  REFERENCES player_profiles(id) 
  ON DELETE SET NULL;

-- Ensure indexes exist for performance on host lookup
CREATE INDEX IF NOT EXISTS idx_breakout_sessions_host_id ON breakout_sessions(host_id);

-- Re-expose the relationship to the schema cache by updating the comment (PostgREST hint)
COMMENT ON COLUMN breakout_sessions.host_id IS 'References the player profile of the assigned host.';
