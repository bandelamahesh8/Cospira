-- Phase 15: Game Balancing Engine

-- 1. Create Config Table
CREATE TABLE IF NOT EXISTS public.game_balance_configs (
    game_id TEXT PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.player_profiles(id)
);

-- 2. RLS Policies
ALTER TABLE public.game_balance_configs ENABLE ROW LEVEL SECURITY;

-- Everyone can read stats/configs (clients need them)
CREATE POLICY "Public read configs" ON public.game_balance_configs FOR SELECT USING (true);

-- Only Admins can update (We'll assume specific user IDs or a role check for now)
-- For MVP, strict check:
-- CREATE POLICY "Admin update configs" ON public.game_balance_configs FOR UPDATE USING (auth.uid() IN (SELECT id FROM admins));
-- Since we don't have an admins table yet, we'll leave it open for 'authenticated' to simulate the admin panel for the user.
CREATE POLICY "Auth update configs" ON public.game_balance_configs FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Seed Initial Configs
INSERT INTO public.game_balance_configs (game_id, config) VALUES
(
    'chess', 
    '{
        "modes": {
            "blitz": { "time": 300, "increment": 0 },
            "rapid": { "time": 600, "increment": 5 },
            "bullet": { "time": 60, "increment": 0 }
        },
        "points": { "win": 1, "draw": 0.5, "loss": 0 }
    }'::jsonb
),
(
    'ludo', 
    '{
        "dice": {
            "six_probability": 0.166,
            "weighted_mode": false
        },
        "board": {
            "safe_spots": [0, 8, 13, 21, 26, 34, 39, 47],
            "star_bonus_xp": 10
        }
    }'::jsonb
)
ON CONFLICT (game_id) DO NOTHING;
