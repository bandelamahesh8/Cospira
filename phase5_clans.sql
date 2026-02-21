-- Phase 5 Extension: Clans & Titles

-- 1. Create Clans Table
CREATE TABLE IF NOT EXISTS public.clans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    owner_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Clan Members Table
CREATE TABLE IF NOT EXISTS public.clan_members (
    clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.player_profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'elder', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (clan_id, user_id)
);

-- 3. Create Titles Table
CREATE TABLE IF NOT EXISTS public.titles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    condition TEXT -- Description of how to unlock, logic handled in application code
);

-- 4. Create User Titles Table (Unlocks)
CREATE TABLE IF NOT EXISTS public.user_titles (
    user_id UUID REFERENCES public.player_profiles(id) ON DELETE CASCADE NOT NULL,
    title_id UUID REFERENCES public.titles(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, title_id)
);

-- 5. Update Player Profiles
ALTER TABLE public.player_profiles 
ADD COLUMN IF NOT EXISTS selected_title_id UUID REFERENCES public.titles(id);

-- 6. RLS Policies

-- Clans: Everyone can read
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read clans" ON public.clans FOR SELECT USING (true);
CREATE POLICY "Authenticated create clans" ON public.clans FOR INSERT WITH CHECK (auth.uid() = owner_id);
-- Only owner can update (basic policy, could be refined for elders)
CREATE POLICY "Owner update clan" ON public.clans FOR UPDATE USING (auth.uid() = owner_id);

-- Clan Members: Everyone can read
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read clan members" ON public.clan_members FOR SELECT USING (true);
-- Members can join (insert themselves) strictly handled via service logic usually, but here:
-- Allow users to insert THEMSELVES (joining)
CREATE POLICY "User join clan" ON public.clan_members FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Allow users to leave (delete themselves)
CREATE POLICY "User leave clan" ON public.clan_members FOR DELETE USING (auth.uid() = user_id);

-- Titles: Public read
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read titles" ON public.titles FOR SELECT USING (true);

-- User Titles: Public read, System insert (or user insert if logic permits)
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read user titles" ON public.user_titles FOR SELECT USING (true);
-- Allow users to insert triggers/Edge Functions ideally, but for MVP client-side service:
CREATE POLICY "User unlock title" ON public.user_titles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- seed some titles
INSERT INTO public.titles (name, description, rarity, condition) VALUES
('Novice', 'Just getting started', 'common', 'Create an account'),
('Strategist', 'Win 10 Chess Games', 'rare', 'Win 10 Chess matches'),
('Grandmaster', 'Reach 2000 ELO in Chess', 'legendary', 'Chess ELO >= 2000'),
('Lucky', 'Win a game of Snakes & Ladders', 'common', 'Win 1 Snakes & Ladders match')
ON CONFLICT (name) DO NOTHING;
