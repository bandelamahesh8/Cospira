-- Elite Gaming System Database Schema
-- Phase 1: Foundation Architecture

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PLAYER PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (length(username) >= 3 AND length(username) <= 20),
  display_name TEXT CHECK (length(display_name) <= 50),
  avatar_url TEXT,
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  xp INTEGER DEFAULT 0 CHECK (xp >= 0),
  title TEXT DEFAULT 'Rookie',
  bio TEXT CHECK (length(bio) <= 500),
  country_code TEXT CHECK (length(country_code) = 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GAME STATISTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('chess', 'xoxo', 'ludo', 'snakeladder', 'connect4', 'checkers')),
  
  -- ELO & Ranking
  elo INTEGER DEFAULT 1000 CHECK (elo >= 0 AND elo <= 5000),
  rank TEXT DEFAULT 'Bronze' CHECK (rank IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Legend')),
  peak_elo INTEGER DEFAULT 1000 CHECK (peak_elo >= 0),
  
  -- Match Statistics
  wins INTEGER DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER DEFAULT 0 CHECK (losses >= 0),
  draws INTEGER DEFAULT 0 CHECK (draws >= 0),
  total_matches INTEGER DEFAULT 0 CHECK (total_matches >= 0),
  win_rate DECIMAL GENERATED ALWAYS AS (
    CASE WHEN total_matches > 0 
    THEN ROUND((wins::DECIMAL / total_matches) * 100, 2)
    ELSE 0 END
  ) STORED,
  
  -- Performance Metrics
  avg_match_duration INTEGER CHECK (avg_match_duration >= 0),
  longest_win_streak INTEGER DEFAULT 0 CHECK (longest_win_streak >= 0),
  current_win_streak INTEGER DEFAULT 0,
  
  -- Game-specific stats (JSONB for flexibility)
  game_specific_stats JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(player_id, game_type)
);

-- ============================================================================
-- MATCH HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type TEXT NOT NULL CHECK (game_type IN ('chess', 'xoxo', 'ludo', 'snakeladder', 'connect4', 'checkers')),
  mode TEXT NOT NULL CHECK (mode IN ('casual', 'ranked', 'tournament', 'private')),
  
  -- Players (JSONB array)
  players JSONB NOT NULL,
  winner_id UUID REFERENCES player_profiles(id),
  
  -- Match Data
  initial_state JSONB NOT NULL,
  final_state JSONB NOT NULL,
  move_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  duration INTEGER CHECK (duration >= 0),
  elo_changes JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_reward INTEGER DEFAULT 0 CHECK (xp_reward >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Achievements (Junction Table)
CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Player profiles
CREATE INDEX IF NOT EXISTS idx_player_profiles_username ON player_profiles(username);
CREATE INDEX IF NOT EXISTS idx_player_profiles_level ON player_profiles(level DESC);

-- Game stats
CREATE INDEX IF NOT EXISTS idx_game_stats_player_game ON game_stats(player_id, game_type);
CREATE INDEX IF NOT EXISTS idx_game_stats_elo ON game_stats(game_type, elo DESC);
CREATE INDEX IF NOT EXISTS idx_game_stats_rank ON game_stats(game_type, rank);

-- Match history
CREATE INDEX IF NOT EXISTS idx_match_history_player ON match_history USING GIN (players);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON match_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_game_mode ON match_history(game_type, mode);

-- Achievements
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;

-- Player Profiles Policies
CREATE POLICY "Public profiles viewable by everyone"
  ON player_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON player_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON player_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Game Stats Policies
CREATE POLICY "Game stats viewable by everyone"
  ON game_stats FOR SELECT
  USING (true);

CREATE POLICY "System can update game stats"
  ON game_stats FOR ALL
  USING (true);

-- Match History Policies
CREATE POLICY "Match history viewable by everyone"
  ON match_history FOR SELECT
  USING (true);

CREATE POLICY "System can insert match history"
  ON match_history FOR INSERT
  WITH CHECK (true);

-- Achievements Policies
CREATE POLICY "Achievements viewable by everyone"
  ON achievements FOR SELECT
  USING (true);

CREATE POLICY "Player achievements viewable by everyone"
  ON player_achievements FOR SELECT
  USING (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_profiles_updated_at
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_stats_updated_at
  BEFORE UPDATE ON game_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Initial Achievements
-- ============================================================================

INSERT INTO achievements (code, name, description, rarity, xp_reward) VALUES
  ('first_win', 'First Victory', 'Win your first match', 'common', 50),
  ('win_streak_5', 'Hot Streak', 'Win 5 matches in a row', 'rare', 150),
  ('win_streak_10', 'Unstoppable', 'Win 10 matches in a row', 'epic', 300),
  ('chess_checkmate', 'Checkmate Master', 'Win a chess game by checkmate', 'common', 75),
  ('reach_gold', 'Golden Player', 'Reach Gold rank', 'rare', 200),
  ('reach_diamond', 'Diamond League', 'Reach Diamond rank', 'epic', 500),
  ('reach_legend', 'Living Legend', 'Reach Legend rank', 'legendary', 1000),
  ('100_wins', 'Centurion', 'Win 100 matches', 'epic', 400),
  ('tournament_winner', 'Tournament Champion', 'Win a tournament', 'legendary', 750)
ON CONFLICT (code) DO NOTHING;
