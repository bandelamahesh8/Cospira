-- Phase 19: Cospira Brain Architecture

-- 1. Player Intelligence DNA
CREATE TABLE IF NOT EXISTS public.player_intelligence (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    skill_level FLOAT DEFAULT 1000, -- Dynamic Skill Rating (distinct from ELO)
    aggression_index FLOAT DEFAULT 0.5, -- 0.0 (Defensive) to 1.0 (Aggressive)
    consistency_score FLOAT DEFAULT 0.5, -- Low variance = High consistency
    toxicity_score FLOAT DEFAULT 0.0, -- 0.0 (Saint) to 1.0 (Toxic)
    play_style TEXT CHECK (play_style IN ('aggressive', 'defensive', 'balanced', 'chaotic')),
    learning_rate FLOAT DEFAULT 0.0, -- Improvement slope
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Game Meta Analysis
CREATE TABLE IF NOT EXISTS public.game_meta (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id TEXT NOT NULL, -- 'chess', 'tictactoe'
    strategy_key TEXT NOT NULL, -- 'sicilian_defense', 'center_opening'
    win_rate FLOAT DEFAULT 0.5,
    usage_rate FLOAT DEFAULT 0.0,
    trend_score FLOAT DEFAULT 0.0, -- Positive = Rising, Negative = Falling
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, strategy_key)
);

-- 3. RLS
ALTER TABLE public.player_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own DNA" ON public.player_intelligence FOR SELECT USING (auth.uid() = user_id);
-- In a real app, only System/Admin updates this. For MVP, we might allow service-role or client RPC if secure.
-- Allowing public read for meta analysis (Trending strategies)
CREATE POLICY "Public read meta" ON public.game_meta FOR SELECT USING (true);


-- 4. Seed Intelligence (Mock for current user later) & Meta
INSERT INTO public.game_meta (game_id, strategy_key, win_rate, usage_rate, trend_score) VALUES
('chess', 'sicilian_defense', 0.54, 0.18, 0.05),
('chess', 'ruy_lopez', 0.52, 0.12, 0.01),
('chess', 'kings_gambit', 0.48, 0.05, -0.02),
('tictactoe', 'center_first', 0.72, 0.60, 0.00),
('tictactoe', 'corner_first', 0.65, 0.30, 0.02)
ON CONFLICT DO NOTHING;
