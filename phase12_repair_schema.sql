-- Phase 12 Repair: Fix missing columns for Meta System

-- 1. Ensure game_stats has elo
ALTER TABLE public.game_stats 
ADD COLUMN IF NOT EXISTS elo INTEGER DEFAULT 1000;

-- 2. Ensure player_profiles has tournaments_won (optional cache column)
ALTER TABLE public.player_profiles 
ADD COLUMN IF NOT EXISTS tournaments_won INTEGER DEFAULT 0;

-- 3. Re-create the OSS View with robust logic
DROP VIEW IF EXISTS public.oss_leaderboard;

CREATE OR REPLACE VIEW public.oss_leaderboard AS
SELECT 
    p.id,
    p.username,
    p.avatar_url,
    -- Get Chess ELO (or default 1200)
    COALESCE(
        (SELECT elo FROM public.game_stats WHERE player_id = p.id AND game_type = 'chess' LIMIT 1), 
        1200
    ) as chess_elo,
    COALESCE(s.total_wins, 0) as total_wins,
    COALESCE(s.total_games, 0) as total_games,
    -- Count actual tournament wins
    (SELECT COUNT(*) FROM public.tournament_participants WHERE player_id = p.id AND status = 'winner') as tournaments_won,
    (
        -- 1. Chess Component (40% weight)
        (COALESCE(
            (SELECT elo FROM public.game_stats WHERE player_id = p.id AND game_type = 'chess' LIMIT 1), 
            1200
        ) * 0.4) +
        
        -- 2. Win Rate Component (30%)
        (
            CASE WHEN COALESCE(s.total_games, 0) > 0 
            THEN ((COALESCE(s.total_wins, 0)::FLOAT / s.total_games) * 1000 * 0.3)
            ELSE 0 END
        ) +

        -- 3. Tournament Component (30%)
        ((SELECT COUNT(*) FROM public.tournament_participants WHERE player_id = p.id AND status = 'winner') * 50 * 0.3)
    )::INTEGER as oss
FROM 
    public.player_profiles p
LEFT JOIN 
    (
        SELECT player_id, SUM(wins) as total_wins, SUM(wins + losses) as total_games 
        FROM public.game_stats 
        GROUP BY player_id
    ) s ON p.id = s.player_id
ORDER BY 
    oss DESC;

-- Grant permissions again just in case
GRANT SELECT ON public.oss_leaderboard TO authenticated;
GRANT SELECT ON public.oss_leaderboard TO anon;
