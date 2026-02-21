-- Phase 23: Self-Evolving Meta Engine

-- 1. Meta Evolution Store
CREATE TABLE IF NOT EXISTS public.meta_evolution (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id TEXT NOT NULL,
    strategy_key TEXT NOT NULL,
    trend_score FLOAT DEFAULT 0.0,
    mutation_suggestion JSONB, -- { "action": "nerf", "parameter": "damage", "change": -10 }
    status TEXT DEFAULT 'PENDING', -- PENDING, APPLIED, REJECTED
    applied_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, strategy_key)
);

-- 2. RLS
ALTER TABLE public.meta_evolution ENABLE ROW LEVEL SECURITY;

-- Public read for transparency? Or Admin only? 
-- Let's make it Public Read, Admin Write (System).
CREATE POLICY "Public read meta evolution" ON public.meta_evolution FOR SELECT USING (true);
