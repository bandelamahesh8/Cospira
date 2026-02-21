-- Phase 24: Brain Control System

-- 1. Brain Action Log
CREATE TABLE IF NOT EXISTS public.brain_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL, -- CHANGE_MATCHMAKING_RULE, BUFF_STRATEGY, etc.
    target_id TEXT, -- UserID or GameID depending on action
    payload JSONB, -- The parameters of the action
    status TEXT DEFAULT 'EXECUTED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.brain_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read brain actions" ON public.brain_actions FOR SELECT USING (true);
