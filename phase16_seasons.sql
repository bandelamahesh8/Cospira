-- Phase 16: Events & Seasons

-- 1. Seasons Table
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    theme_color TEXT DEFAULT 'indigo', -- 'indigo', 'amber', 'rose'
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Battle Pass Levels
CREATE TABLE IF NOT EXISTS public.battle_pass_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    reward_type TEXT CHECK (reward_type IN ('coins', 'asset', 'xp')),
    reward_value TEXT NOT NULL, -- '100', 'avatar_uuid', etc
    is_premium BOOLEAN DEFAULT false,
    UNIQUE(season_id, level)
);

-- 3. Player Progress
CREATE TABLE IF NOT EXISTS public.player_season_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    season_id UUID REFERENCES public.seasons(id) NOT NULL,
    current_xp INTEGER DEFAULT 0,
    claimed_levels INTEGER[] DEFAULT '{}',
    is_premium BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, season_id)
);

-- 4. RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_pass_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_season_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Public read levels" ON public.battle_pass_levels FOR SELECT USING (true);
CREATE POLICY "Public read progress" ON public.player_season_progress FOR SELECT USING (true);
CREATE POLICY "Auth update own progress" ON public.player_season_progress FOR UPDATE USING (auth.uid() = user_id);
-- Insert via system functions mostly, but auth insert for init is fine
CREATE POLICY "Auth insert progress" ON public.player_season_progress FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 5. Seed Season 1
DO $$
DECLARE
    s_id UUID;
BEGIN
    INSERT INTO public.seasons (name, description, start_at, end_at, is_active, theme_color)
    VALUES ('Season 1: Genesis', 'The beginning of the Cospira Elite Era.', NOW(), NOW() + INTERVAL '30 days', true, 'purple')
    RETURNING id INTO s_id;

    -- Seed Levels
    INSERT INTO public.battle_pass_levels (season_id, level, reward_type, reward_value, is_premium)
    VALUES 
    (s_id, 1, 'coins', '100', false),
    (s_id, 2, 'coins', '200', false),
    (s_id, 3, 'xp', '500', false),
    (s_id, 4, 'coins', '500', true), -- Premium
    (s_id, 5, 'asset', 'frame_gold_01', true); -- Assuming we have asset logic or just text for now
END $$;
