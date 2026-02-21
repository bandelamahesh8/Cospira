-- Phase 13: Real Matchmaking

-- 1. Add Behavior Score
ALTER TABLE public.player_profiles
ADD COLUMN IF NOT EXISTS behavior_score INTEGER DEFAULT 100 CHECK (behavior_score >= 0 AND behavior_score <= 100);

-- 2. Index for fast matchmaking lookup
CREATE INDEX IF NOT EXISTS idx_gamestats_elo ON public.game_stats(elo);
CREATE INDEX IF NOT EXISTS idx_player_behavior ON public.player_profiles(behavior_score);

-- 3. Update Matchmaking Pool (if using DB-based queue)
-- We will assume the queue happens in-memory (Redis/Socket) for speed, 
-- but if we had a persistent table:
-- ALTER TABLE public.matchmaking_pool ADD COLUMN latency_ms INTEGER;
