-- Phase 6 Extension: Clan Wars & Championships

-- 1. Create Clan Wars Table
CREATE TABLE IF NOT EXISTS public.clan_wars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenger_clan_id UUID REFERENCES public.clans(id) NOT NULL,
    defender_clan_id UUID REFERENCES public.clans(id) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined')),
    challenger_score INTEGER DEFAULT 0,
    defender_score INTEGER DEFAULT 0,
    game_type TEXT NOT NULL, -- 'chess', 'all', etc.
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    winner_clan_id UUID REFERENCES public.clans(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Clan War Battles (Individual Matches)
CREATE TABLE IF NOT EXISTS public.clan_war_battles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    war_id UUID REFERENCES public.clan_wars(id) ON DELETE CASCADE NOT NULL,
    player1_id UUID REFERENCES public.player_profiles(id) NOT NULL, -- From Challenger
    player2_id UUID REFERENCES public.player_profiles(id) NOT NULL, -- From Defender
    winner_id UUID REFERENCES public.player_profiles(id),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed')),
    match_id UUID, -- Link to actual game match ID if available
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update Tournaments for Championships
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly'));

-- 4. RLS Policies

-- Wars
ALTER TABLE public.clan_wars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read clan wars" ON public.clan_wars FOR SELECT USING (true);
CREATE POLICY "Clan leaders create wars" ON public.clan_wars FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.clan_members 
        WHERE clan_id = challenger_clan_id 
        AND user_id = auth.uid() 
        AND role IN ('leader', 'elder')
    )
);
CREATE POLICY "Clan leaders update wars" ON public.clan_wars FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.clan_members 
        WHERE (clan_id = challenger_clan_id OR clan_id = defender_clan_id) 
        AND user_id = auth.uid() 
        AND role IN ('leader', 'elder')
    )
);

-- Battles
ALTER TABLE public.clan_war_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read battles" ON public.clan_war_battles FOR SELECT USING (true);
CREATE POLICY "Participants update battles" ON public.clan_war_battles FOR UPDATE USING (
    auth.uid() = player1_id OR auth.uid() = player2_id
);
