-- Phase 6 Migration: Tournaments

-- 1. Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    game_type TEXT NOT NULL, -- 'chess', 'xoxo', etc.
    status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'active', 'completed')),
    start_time TIMESTAMPTZ,
    max_players INTEGER NOT NULL DEFAULT 8,
    entry_fee INTEGER DEFAULT 0,
    prize_pool INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.player_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.player_profiles(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tournament_id, player_id)
);

-- 3. Create matches table (Bracket)
CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL, -- 1 = Ro8, 2 = Ro4, 3 = Final
    match_index INTEGER NOT NULL, -- Position in the round (0, 1, 2, 3)
    player1_id UUID REFERENCES public.player_profiles(id),
    player2_id UUID REFERENCES public.player_profiles(id),
    winner_id UUID REFERENCES public.player_profiles(id),
    next_match_id UUID REFERENCES public.tournament_matches(id), -- Pointer to where the winner goes
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS Policies

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Tournaments: Everyone can read. Authenticated can insert.
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Auth insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creator update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = created_by);

-- Participants: Everyone can read. Auth can insert (join).
CREATE POLICY "Public read participants" ON public.tournament_participants FOR SELECT USING (true);
CREATE POLICY "Auth join participants" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Matches: Everyone can read.
CREATE POLICY "Public read matches" ON public.tournament_matches FOR SELECT USING (true);
-- Updates usually handled by server/admin, but allowing participants to update strictly their match might be needed later.
-- For now, open update for MVP or restrict to creator.
CREATE POLICY "Creator update matches" ON public.tournament_matches FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);
