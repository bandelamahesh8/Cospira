-- Phase 26: Learning Decision Engine (RL-Lite)

-- 1. Decision Outcome Store
CREATE TABLE IF NOT EXISTS public.brain_decision_outcomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decision_id UUID REFERENCES public.brain_actions(id), -- Link to the action taken (if we linked them deeply)
    -- actually brain_actions doesn't have a decision_id link easily without refactor. 
    -- Let's just link to user and generic decision type for now for simplicity in this demo.
    user_id UUID,
    decision_type TEXT NOT NULL, -- e.g. RETENTION_REWARD
    
    outcome TEXT CHECK (outcome IN ('IMPROVED', 'WORSENED', 'NEUTRAL')),
    reward_score FLOAT, -- e.g. +1.0 for retention, -0.5 for churn
    
    metrics_before JSONB, -- Snapshot of state before
    metrics_after JSONB, -- Snapshot of state after
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.brain_decision_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read outcomes" ON public.brain_decision_outcomes FOR SELECT USING (true);
