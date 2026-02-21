-- Phase 7 Migration: Analytics & Replay

-- 1. Create ELO History Table
CREATE TABLE IF NOT EXISTS public.elo_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    game_type TEXT NOT NULL,
    old_elo INTEGER NOT NULL,
    new_elo INTEGER NOT NULL,
    match_id UUID REFERENCES public.match_history(id), -- Optional link to specific match
    reason TEXT, -- 'match', 'decay', 'adjustment'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read (public profiles)
CREATE POLICY "Public read elo history" ON public.elo_history FOR SELECT USING (true);

-- Only system/service role usually inserts, but for this app architecture (Supabase client):
-- Allow users to insert records about themselves (if we do client-side ELO calculation, which we shouldn't really, but typically do for MVP)
-- Ideally this is handled by a Database Trigger or Edge Function.
-- For MVP, we will allow authenticated users to insert their *own* history.
CREATE POLICY "User insert own elo history" ON public.elo_history FOR INSERT WITH CHECK (auth.uid() = player_id);
