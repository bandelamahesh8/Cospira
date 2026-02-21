-- Create elo_history table
CREATE TABLE IF NOT EXISTS public.elo_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    old_elo INTEGER,
    new_elo INTEGER NOT NULL,
    match_id UUID,
    reason TEXT
);
-- Enable RLS for elo_history
ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;
-- Create policy for elo_history: Users can read their own history
CREATE POLICY "Users can view their own ELO history"
ON public.elo_history FOR SELECT
USING (auth.uid() = player_id);
-- Create match_history table
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    game_type TEXT NOT NULL,
    players JSONB NOT NULL, -- Stores array of player objects
    winner_id UUID,
    move_history JSONB,
    initial_state JSONB,
    final_state JSONB
);
-- Enable RLS for match_history
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;
-- Create policy for match_history: Everyone can view matches (or restrict if needed)
CREATE POLICY "Users can view all matches"
ON public.match_history FOR SELECT
USING (true);
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_elo_history_player ON public.elo_history(player_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON public.match_history(created_at DESC);