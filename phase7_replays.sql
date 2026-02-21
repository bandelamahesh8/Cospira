-- Phase 7 Extension: Game Replays

-- 1. Create Game Replays Table
CREATE TABLE IF NOT EXISTS public.game_replays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES public.match_history(id) ON DELETE SET NULL, -- Can exist without match_id for casual/practice
    game_type TEXT NOT NULL,
    moves JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of move objects
    snapshot JSONB, -- Final board state or critical info
    players JSONB, -- Snapshot of player names/elos at the time
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.game_replays ENABLE ROW LEVEL SECURITY;

-- Everyone can view replays (shareable)
CREATE POLICY "Public read replays" ON public.game_replays FOR SELECT USING (true);

-- Authenticated users can save replays (usually triggered by system or winner)
CREATE POLICY "Auth insert replays" ON public.game_replays FOR INSERT WITH CHECK (auth.role() = 'authenticated');
