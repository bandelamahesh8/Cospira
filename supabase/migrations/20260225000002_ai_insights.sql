-- ─────────────────────────────────────────────────────────────
-- Migration: AI Integration — Insights + Audit + Org Flag
-- Created: 2026-02-25
-- ─────────────────────────────────────────────────────────────

-- 1. Per-org AI feature flag (default OFF — deployed disabled)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false;

-- 2. ai_insights — Advisory output store (never raw content)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_insights (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL,
  breakout_id   uuid        NULL,

  -- AI insight type (matches AI_INSIGHT_TYPE in BreakoutAIIngest.js)
  type          text        NOT NULL
    CHECK (type IN (
      'MODERATION_FLAG', 'ASSIGNMENT_SUGGESTION', 'SESSION_SUMMARY',
      'ENGAGEMENT_ALERT', 'RISK_ALERT', 'FRICTION_SIGNAL',
      'HOST_BRIEF', 'POST_MORTEM', 'GOVERNANCE_EXPLAIN',
      'POLICY_DRIFT', 'ORG_TRUST_UPDATE', 'ONBOARDING_ADVICE',
      'CAPACITY_ALERT'
    )),

  -- Effective org mode at time of insight generation
  mode          text        NOT NULL
    CHECK (mode IN ('FUN', 'PROF', 'ULTRA_SECURE', 'MIXED')),

  -- Advisory content — NEVER raw transcripts or raw user content
  content       jsonb       NOT NULL DEFAULT '{}',

  -- AI confidence score 0.00–1.00
  confidence    numeric(4,3) NULL CHECK (confidence BETWEEN 0 AND 1),

  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_org
  ON ai_insights (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_breakout
  ON ai_insights (breakout_id, created_at DESC)
  WHERE breakout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_insights_type
  ON ai_insights (org_id, type);

-- RLS (owner-only read, service-role-only write)
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_insights_owner_select"
  ON ai_insights FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = ai_insights.org_id
        AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "ai_insights_no_client_insert"
  ON ai_insights FOR INSERT TO authenticated
  WITH CHECK (false);

-- Realtime for owner to see live insights
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;

-- 3. ai_audit_events — ULTRA only AI action trail
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_audit_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL,
  ai_action     text        NOT NULL,
  model         text        NOT NULL,
  input_type    text        NOT NULL,

  -- SHA-256 of the AI output (not the input — no raw content stored)
  output_hash   text        NOT NULL,

  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS (owner-only read, service-role-only write, no UPDATE/DELETE)
ALTER TABLE ai_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_audit_owner_select"
  ON ai_audit_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = ai_audit_events.org_id
        AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "ai_audit_no_client_insert"
  ON ai_audit_events FOR INSERT TO authenticated
  WITH CHECK (false);
