-- Phase 12: Meta System (Overall Skill Score)

-- 1. Create View for OSS Leaderboard
-- We assume 'chess' ELO is stored in game_stats or profile. 
-- For MVP, we'll pull from player_profiles directly if ELO is there, or join game_stats.
-- Let's check schema: player_profiles has 'elo' (generic/chess).
-- game_stats has detailed records.

CREATE OR REPLACE VIEW public.oss_leaderboard AS
SELECT 
    p.id,
    p.username,
    p.avatar_url,
    COALESCE(
        (SELECT elo FROM public.game_stats WHERE player_id = p.id AND game_type = 'chess' LIMIT 1), 
        1200
    ) as chess_elo,
    COALESCE(s.total_wins, 0) as total_wins,
    COALESCE(s.total_games, 0) as total_games,
    (SELECT COUNT(*) FROM public.tournament_participants WHERE player_id = p.id AND status = 'winner') as tournaments_won,
    (
        -- 1. Chess Component (40% weight, baseline 1200)
        (COALESCE(
            (SELECT elo FROM public.game_stats WHERE player_id = p.id AND game_type = 'chess' LIMIT 1), 
            1200
        ) * 0.4) +
        
        -- 2. Win Rate Component (30% weight, scaled to ~1000 pts)
        (
            CASE WHEN COALESCE(s.total_games, 0) > 0 
            THEN ((COALESCE(s.total_wins, 0)::FLOAT / s.total_games) * 1000 * 0.3)
            ELSE 0 END
        ) +

        -- 3. Tournament Component (30% weight, 50pts per win)
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

-- 2. Grant permissions
GRANT SELECT ON public.oss_leaderboard TO authenticated;
GRANT SELECT ON public.oss_leaderboard TO anon;

-- 3. Add index if needed on base tables for performance
CREATE INDEX IF NOT EXISTS idx_profiles_elo ON public.player_profiles(elo);
CREATE INDEX IF NOT EXISTS idx_game_stats_player ON public.game_stats(player_id);
