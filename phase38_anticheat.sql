-- Phase 38: AI Anti-Cheat System

CREATE TYPE cheat_status AS ENUM ('CLEAN', 'MONITORING', 'SHADOW_QUEUE', 'BANNED');

CREATE TABLE IF NOT EXISTS public.brain_cheat_scores (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    cheat_probability FLOAT DEFAULT 0.0, -- 0.0 to 1.0
    status cheat_status DEFAULT 'CLEAN',
    flagged_reason TEXT, -- e.g. "Impossible Reaction Time"
    last_flagged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.brain_cheat_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id),
    match_id TEXT,
    evidence JSONB, -- { "apm": 600, "cursor_jumps": true }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brain_cheat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_cheat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cheat scores" ON public.brain_cheat_scores FOR SELECT USING (true);
