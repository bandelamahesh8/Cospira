-- ─────────────────────────────────────────────────────────────
-- Migration: Room Event Logs — Scalable Scaling Layer
-- Created: 2026-03-05
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS room_event_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text        NOT NULL,
  breakout_id   uuid        NOT NULL,
  payload       jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexing for fast lookups by room and time
CREATE INDEX IF NOT EXISTS idx_rel_breakout_id
  ON room_event_logs (breakout_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rel_event_type
  ON room_event_logs (event_type);

-- RLS Policies
ALTER TABLE room_event_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: org owner only
CREATE POLICY "logs_owner_select"
  ON room_event_logs
  FOR SELECT
  TO authenticated
  USING (
    breakout_id IN (
      SELECT id FROM breakout_sessions 
      WHERE organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- INSERT: allow internal system (anyone authenticated for now)
CREATE POLICY "logs_insert"
  ON room_event_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE room_event_logs;
