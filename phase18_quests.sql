-- Phase 18: Retention (Daily Quests)

-- 1. Quest Definitions (Templates)
CREATE TABLE IF NOT EXISTS public.quest_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    target_count INTEGER NOT NULL DEFAULT 1,
    reward_type TEXT DEFAULT 'coins',
    reward_amount INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN DEFAULT true
);

-- 2. Player Quests (Daily Instances)
CREATE TABLE IF NOT EXISTS public.player_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    quest_id UUID REFERENCES public.quest_definitions(id) NOT NULL,
    current_progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    assigned_at DATE DEFAULT CURRENT_DATE, -- Rotates daily
    UNIQUE(user_id, quest_id, assigned_at)
);

-- 3. RLS
ALTER TABLE public.quest_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read quest defs" ON public.quest_definitions FOR SELECT USING (true);
CREATE POLICY "Users read own quests" ON public.player_quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own quests" ON public.player_quests FOR UPDATE USING (auth.uid() = user_id);
-- System inserts quests, usually via trigger or service. Allowing auth insert for MVP service logic.
CREATE POLICY "Users insert own quests" ON public.player_quests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Seed Standard Quests
INSERT INTO public.quest_definitions (title, description, target_count, reward_type, reward_amount) VALUES
('First Blood', 'Win 1 Match', 1, 'coins', 100),
('Marathon', 'Play 3 Matches', 3, 'xp', 500),
('Socialite', 'Send 5 Chat Messages', 5, 'coins', 50)
ON CONFLICT DO NOTHING;
