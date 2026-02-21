/* COSPIRA CONSOLIDATED SQL SCHEMA & MIGRATIONS */


/* ============================================================================ */
/* SOURCE: server\supabase_schema.sql */
/* ============================================================================ */

-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Rooms Table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  room_type TEXT CHECK (room_type IN ('meeting', 'watch', 'game')),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Room Members Table
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('host', 'cohost', 'participant')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id, user_id)
);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);

-- 4. Room Permissions Table
CREATE TABLE room_permissions (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  can_chat BOOLEAN DEFAULT true,
  can_share_screen BOOLEAN DEFAULT true,
  can_mute_others BOOLEAN DEFAULT false
);

-- 5. Room Sessions Table
CREATE TABLE room_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  max_participants INT
);

-- 6. Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_type TEXT CHECK (message_type IN ('text', 'file', 'system')),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_messages_room_id_created_at ON messages(room_id, created_at);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- 7. Room State Table
CREATE TABLE room_state (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  active_users INT DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_state ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Users: Users can read all users (for search/profile view) but only edit their own
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Rooms: 
-- Read: Public rooms viewable by all. Private rooms only by members (handled by room_members check usually, but for simplicity: if you are in room_members OR if you are owner)
CREATE POLICY "Rooms viewable by owner or members" ON rooms FOR SELECT USING (
  owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = rooms.id AND room_members.user_id = auth.uid()) OR
  is_private = false
);
-- Update: Only owner (host)
CREATE POLICY "Rooms updateable by owner" ON rooms FOR UPDATE USING (owner_id = auth.uid());
-- Insert: Authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms" ON rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Room Members:
-- View: Members can view other members of the same room
CREATE POLICY "Members viewable by room members" ON room_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid())
);
-- Join: Users can insert themselves (logic might be more complex for invites, but basic is self-insert)
CREATE POLICY "Users can join rooms" ON room_members FOR INSERT WITH CHECK (user_id = auth.uid());
-- Update: Hosts can update member roles
CREATE POLICY "Hosts can update member roles" ON room_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.role IN ('host', 'cohost'))
);

-- Messages:
-- View: Only room members
CREATE POLICY "Room members can view messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = messages.room_id AND rm.user_id = auth.uid())
);
-- Insert: Room members can insert
CREATE POLICY "Room members can send messages" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = messages.room_id AND rm.user_id = auth.uid())
);




/* ============================================================================ */
/* SOURCE: server\setup_database.sql */
/* ============================================================================ */

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table if not exists public.users (
  id uuid primary key,
  username text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROOMS TABLE
create table if not exists public.rooms (
  id text primary key, -- Room codes are text (e.g. "RL09U3")
  title text,
  room_type text default 'meeting',
  owner_id uuid references public.users(id),
  is_private boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROOM MEMBERS TABLE
create table if not exists public.room_members (
  id bigint generated by default as identity primary key,
  room_id text references public.rooms(id) on delete cascade,
  user_id uuid references public.users(id),
  role text default 'participant',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  left_at timestamp with time zone,
  unique(room_id, user_id)
);

-- MESSAGES TABLE
create table if not exists public.messages (
  id bigint generated by default as identity primary key,
  room_id text references public.rooms(id) on delete cascade,
  sender_id uuid references public.users(id),
  message_type text default 'text',
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- FEEDBACK TABLE
create table if not exists public.feedback (
  id bigint generated by default as identity primary key,
  type text not null, -- 'bug', 'feature', etc.
  rating integer,
  message text not null,
  name text,
  email text,
  subject text,
  user_id uuid references public.users(id), -- Optional, link to user if logged in
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Optional - Basic Security)
alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;

-- Allow public read access (for demo simplicity, refine for prod)
-- Allow public read access (for demo simplicity, refine for prod)
drop policy if exists "Public users are viewable by everyone" on public.users;
create policy "Public users are viewable by everyone" on public.users for select using (true);

drop policy if exists "Public rooms are viewable by everyone" on public.rooms;
create policy "Public rooms are viewable by everyone" on public.rooms for select using (true);

drop policy if exists "Members are viewable by everyone" on public.room_members;
create policy "Members are viewable by everyone" on public.room_members for select using (true);

drop policy if exists "Messages are viewable by everyone" on public.messages;
create policy "Messages are viewable by everyone" on public.messages for select using (true);

-- Allow public inserts for feedback (anonymous users allowed)
alter table public.feedback enable row level security;
drop policy if exists "Anyone can insert feedback" on public.feedback;
create policy "Anyone can insert feedback" on public.feedback for insert with check (true);

drop policy if exists "Feedback viewable by everyone" on public.feedback;
create policy "Feedback viewable by everyone" on public.feedback for select using (true);

drop policy if exists "Anyone can delete feedback" on public.feedback;
create policy "Anyone can delete feedback" on public.feedback for delete using (true);

-- Allow inserts (adjusted for service role usage which bypasses RLS, but meaningful for client direct access)
drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile" on public.users for insert with check (auth.uid() = id);



/* ============================================================================ */
/* SOURCE: server\supabase_memory_schema.sql */
/* ============================================================================ */

-- AI Memory Table
-- Stores structured AI events, decisions, and insights for "consciousness history"

CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('decision', 'anomaly', 'insight', 'feedback', 'system')),
  content JSONB NOT NULL,
  importance INT DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indices for performance
CREATE INDEX idx_ai_memory_room_id ON ai_memory(room_id);
CREATE INDEX idx_ai_memory_created_at ON ai_memory(created_at);
CREATE INDEX idx_ai_memory_event_type ON ai_memory(event_type);

-- RLS Policies
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view AI memories" ON ai_memory FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = ai_memory.room_id AND rm.user_id = auth.uid())
);

-- Only system/authenticated backend should insert usually, but for dev:
CREATE POLICY "Authorized insert to AI memory" ON ai_memory FOR INSERT WITH CHECK (true);



/* ============================================================================ */
/* SOURCE: server\20260102.sql */
/* ============================================================================ */

-- Ensure password_otp table has all required columns for email changes
CREATE TABLE IF NOT EXISTS public.password_otp (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    otp TEXT NOT NULL,
    purpose TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add missing columns if table already exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_otp' AND column_name='email') THEN
        ALTER TABLE public.password_otp ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_otp' AND column_name='attempts') THEN
        ALTER TABLE public.password_otp ADD COLUMN attempts INTEGER DEFAULT 0;
    END IF;
END $$;



/* ============================================================================ */
/* SOURCE: server\simple_migration.sql */
/* ============================================================================ */

-- ========================================
-- SIMPLE COSPIRA DATABASE MIGRATION
-- ========================================
-- This is a simplified migration script that fixes the most common issues
-- Run this if the complex migration script has syntax errors

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- STEP 1: Add missing columns to users table
-- ========================================

-- Check if users table exists and add missing columns
DO $$
BEGIN
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rating') THEN
        ALTER TABLE users ADD COLUMN rating INTEGER DEFAULT 1000;
        RAISE NOTICE 'Added rating column to users table';
    END IF;
    
    -- Add display_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'display_name') THEN
        ALTER TABLE users ADD COLUMN display_name TEXT;
        RAISE NOTICE 'Added display_name column to users table';
    END IF;
    
    -- Add username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users ADD COLUMN username TEXT;
        RAISE NOTICE 'Added username column to users table';
    END IF;
    
    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        RAISE NOTICE 'Added password_hash column to users table';
    END IF;
    
    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'wins') THEN
        ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0;
        RAISE NOTICE 'Added wins column to users table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'losses') THEN
        ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0;
        RAISE NOTICE 'Added losses column to users table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_online') THEN
        ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_online column to users table';
    END IF;
    
    -- Update display_name if it's null
    UPDATE users SET display_name = COALESCE(display_name, username) WHERE display_name IS NULL;
    
END;
$$;

-- ========================================
-- STEP 2: Fix rooms table ID type and missing columns
-- ========================================

-- Check if rooms table exists and fix issues
DO $$
BEGIN
    -- Add owner_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'owner_id') THEN
        ALTER TABLE rooms ADD COLUMN owner_id UUID;
        RAISE NOTICE 'Added owner_id column to rooms table';
    END IF;
    
    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'title') THEN
        ALTER TABLE rooms ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column to rooms table';
    END IF;
    
    -- Add room_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'room_type') THEN
        ALTER TABLE rooms ADD COLUMN room_type TEXT DEFAULT 'meeting';
        ALTER TABLE rooms ADD CONSTRAINT rooms_room_type_check CHECK (room_type IN ('meeting', 'watch', 'game', 'tournament'));
        RAISE NOTICE 'Added room_type column to rooms table';
    END IF;
    
    -- Add is_private column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'is_private') THEN
        ALTER TABLE rooms ADD COLUMN is_private BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_private column to rooms table';
    END IF;
    
    -- Check if rooms table uses UUID id and convert to TEXT
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'id' AND data_type = 'uuid') THEN
        -- Create new rooms table with TEXT id
        CREATE TABLE rooms_temp AS 
        SELECT 
            'RM_' || substr(md5(id::text), 1, 8) as id,
            title,
            description,
            room_type,
            game_type,
            owner_id,
            is_private,
            max_participants,
            current_participants,
            is_active,
            settings,
            metadata,
            is_deleted,
            deleted_at,
            created_at,
            updated_at
        FROM rooms;
        
        -- Drop old table and rename
        DROP TABLE rooms CASCADE;
        ALTER TABLE rooms_temp RENAME TO rooms;
        RAISE NOTICE 'Converted rooms.id from UUID to TEXT';
    END IF;
    
    -- Add other missing columns to rooms table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'description') THEN
        ALTER TABLE rooms ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'game_type') THEN
        ALTER TABLE rooms ADD COLUMN game_type TEXT;
        RAISE NOTICE 'Added game_type column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'max_participants') THEN
        ALTER TABLE rooms ADD COLUMN max_participants INTEGER DEFAULT 10;
        RAISE NOTICE 'Added max_participants column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'current_participants') THEN
        ALTER TABLE rooms ADD COLUMN current_participants INTEGER DEFAULT 0;
        RAISE NOTICE 'Added current_participants column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'is_active') THEN
        ALTER TABLE rooms ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'settings') THEN
        ALTER TABLE rooms ADD COLUMN settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added settings column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'metadata') THEN
        ALTER TABLE rooms ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'is_deleted') THEN
        ALTER TABLE rooms ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_deleted column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'deleted_at') THEN
        ALTER TABLE rooms ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added deleted_at column to rooms table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'updated_at') THEN
        ALTER TABLE rooms ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        RAISE NOTICE 'Added updated_at column to rooms table';
    END IF;
    
END;
$$;

-- ========================================
-- STEP 3: Create missing tables
-- ========================================

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Create room_members table
CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'cohost', 'participant', 'spectator')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  UNIQUE(room_id, user_id)
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL,
  tournament_type TEXT DEFAULT 'single_elimination' CHECK (tournament_type IN ('single_elimination', 'double_elimination', 'round_robin', 'swiss')),
  max_participants INTEGER NOT NULL,
  entry_fee DECIMAL(10,2) DEFAULT 0.00,
  prize_pool DECIMAL(10,2) DEFAULT 0.00,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration', 'live', 'completed', 'cancelled')),
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER,
  bracket JSONB,
  settings JSONB DEFAULT '{}',
  room_id TEXT REFERENCES rooms(id),
  created_by UUID NOT NULL REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES rooms(id),
  tournament_match_id UUID REFERENCES tournament_matches(id),
  game_type TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed', 'aborted')),
  players JSONB NOT NULL,
  current_player_id UUID REFERENCES users(id),
  game_state JSONB,
  moves JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'tournament_invite', 'game_invite', 'tournament_start', 'room_invite', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- STEP 4: Create indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);

CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_game_type ON tournaments(game_type);

CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type ON game_sessions(game_type);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ========================================
-- STEP 5: Enable RLS and basic policies
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own friends" ON friends FOR SELECT USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);
CREATE POLICY "Users can manage own friendships" ON friends FOR ALL USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

CREATE POLICY "Users can view own friend requests" ON friend_requests FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY "Users can manage own friend requests" ON friend_requests FOR ALL USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

CREATE POLICY "Users can view accessible rooms" ON rooms FOR SELECT USING (
  owner_id = auth.uid() OR 
  is_private = false OR
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = rooms.id AND room_members.user_id = auth.uid())
);

CREATE POLICY "Users can create rooms" ON rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Room members can view room members" ON room_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid())
);

CREATE POLICY "Users can join rooms" ON room_members FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view public tournaments" ON tournaments FOR SELECT USING (
  status IN ('upcoming', 'live', 'completed') OR
  created_by = auth.uid()
);

CREATE POLICY "Users can create tournaments" ON tournaments FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view accessible game sessions" ON game_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM game_sessions, jsonb_array_elements(game_sessions.players) as player WHERE player->>'id' = auth.uid()::text) OR
  room_id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());

-- ========================================
-- STEP 6: Verification
-- ========================================

DO $$
BEGIN
    -- Check if rating column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rating') THEN
        RAISE NOTICE 'âœ… SUCCESS: rating column exists in users table';
    ELSE
        RAISE EXCEPTION 'âŒ ERROR: rating column still missing in users table';
    END IF;
    
    -- Check if rooms table has TEXT id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'id' AND data_type = 'text') THEN
        RAISE NOTICE 'âœ… SUCCESS: rooms.id is now TEXT type';
    ELSE
        RAISE EXCEPTION 'âŒ ERROR: rooms.id is still UUID type';
    END IF;
    
    -- Check if friends table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friends') THEN
        RAISE NOTICE 'âœ… SUCCESS: friends table created';
    ELSE
        RAISE EXCEPTION 'âŒ ERROR: friends table missing';
    END IF;
    
    RAISE NOTICE 'ðŸŽ‰ DATABASE MIGRATION COMPLETED SUCCESSFULLY!';
END;
$$;

-- ========================================
-- COMPLETION
-- ========================================

-- Your database is now ready for the COSPIRA platform!
-- All foreign key issues have been resolved
-- The mobile app should work perfectly now



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\001_analytics_tables.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20240401000000_create_organizations.sql */
/* ============================================================================ */

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
CREATE POLICY "Users can view organizations they are members of"
    ON public.organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create organizations"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their organizations"
    ON public.organizations
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Policies for organization_members
CREATE POLICY "Users can view members of their organizations"
    ON public.organization_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members as om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can manage members"
    ON public.organization_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members as om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

-- Trigger to automatically add creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20251119100053_12314ba8-8584-4826-9bf9-d770ddc049e8.sql */
/* ============================================================================ */

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'enterprise');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_enterprise BOOLEAN DEFAULT FALSE,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create messages table for real-time chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Messages policies
CREATE POLICY "Users can view messages in their rooms"
  ON public.messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20251119100208_7b012149-d8b4-4f8a-87bb-6adadfcc20d2.sql */
/* ============================================================================ */

-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20251120063320_7b91fc18-670e-49bb-9a0a-493ac15f9c99.sql */
/* ============================================================================ */

-- Add foreign key relationship for profiles lookup
ALTER TABLE public.messages 
ADD CONSTRAINT messages_user_id_fkey_profiles 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20251202000000_fix_rls_infinite_recursion.sql */
/* ============================================================================ */

-- Fix infinite recursion in organization_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.organization_members;

-- Create helper function to check membership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_organization_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
        AND organization_members.user_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is admin/owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
        AND organization_members.user_id = user_id
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using helper functions
CREATE POLICY "Users can view members of their organizations"
    ON public.organization_members
    FOR SELECT
    USING (
        public.is_organization_member(organization_id, auth.uid())
    );

CREATE POLICY "Owners and admins can insert members"
    ON public.organization_members
    FOR INSERT
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
    );

CREATE POLICY "Owners and admins can update members"
    ON public.organization_members
    FOR UPDATE
    USING (
        public.is_organization_admin(organization_id, auth.uid())
    );

CREATE POLICY "Owners and admins can delete members"
    ON public.organization_members
    FOR DELETE
    USING (
        public.is_organization_admin(organization_id, auth.uid())
    );



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124100000_advanced_orgs_phase1.sql */
/* ============================================================================ */

-- 1. UPGRADE EXISTING TABLES
-- organizations: Add SaaS identity columns
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS domain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- organization_members: Add RBAC columns (leaving 'role' for now for safe migration)
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS role_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'blocked')),
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Drop old valid index if exists to replace with more specific one if needed, 
-- but strict unique constraint on (org_id, user_id) should already exist.
-- We'll ensure an index exists for performance.
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON public.organization_members(user_id, organization_id);


-- 2. CREATE RBAC CORE TABLES
-- permissions: Global system capabilities
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    description TEXT
);

-- organization_roles: Roles definitions per organization
CREATE TABLE IF NOT EXISTS public.organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (organization_id, name)
);

-- role_permissions: Join table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.organization_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


-- 3. CREATE AUXILIARY TABLES
-- organization_policies: Global rules per org
CREATE TABLE IF NOT EXISTS public.organization_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB,
    UNIQUE (organization_id, key)
);

-- projects: Resource container
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- teams: User groups
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- team_members: Users in teams
CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- team_projects: Projects assigned to teams
CREATE TABLE IF NOT EXISTS public.team_projects (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, project_id)
);

-- organization_invites: Secure invitations
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_id UUID REFERENCES public.organization_roles(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- activity_logs: Audit trail
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_type TEXT,
    target_id UUID,
    action TEXT NOT NULL,
    severity TEXT DEFAULT 'low',
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- 4. ENABLE RLS (STRICT ISOLATION)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;


-- 5. DEFINE POLICIES
-- Permissions: Public read (or authenticated read)
CREATE POLICY "Permissions are viewable by everyone" ON public.permissions FOR SELECT USING (true);

-- Organization Roles: Viewable by members of the org
CREATE POLICY "Roles viewable by org members" ON public.organization_roles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = organization_roles.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

-- Organization Policies: Viewable by members
CREATE POLICY "Policies viewable by org members" ON public.organization_policies FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = organization_policies.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

-- Activity Logs: Viewable by Admins/Owners only (using RBAC check ideally, but simplified for bootstrap)
CREATE POLICY "Logs viewable by org members" ON public.activity_logs FOR SELECT USING (
     EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = activity_logs.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

-- Projects: Tenant Isolation
CREATE POLICY "Projects viewable by org members" ON public.projects FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = projects.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);


-- 6. DATA SEEDING & MIGRATION SCRIPT
-- 6.1 Seed Global Permissions
INSERT INTO public.permissions (key, description) VALUES
('ORG_VIEW', 'View organization details'),
('ORG_UPDATE', 'Update organization settings'),
('MEMBER_INVITE', 'Invite new members'),
('MEMBER_REMOVE', 'Remove members'),
('ROLE_CREATE', 'Create new roles'),
('ROLE_ASSIGN', 'Assign roles to members'),
('PROJECT_CREATE', 'Create new projects'),
('PROJECT_DELETE', 'Delete projects'),
('TEAM_MANAGE', 'Manage teams'),
('BILLING_VIEW', 'View billing information')
ON CONFLICT (key) DO NOTHING;

-- 6.2 Backfill Function (The "Migration" Logic)
CREATE OR REPLACE FUNCTION public.migrate_organization_roles()
RETURNS void AS $$
DECLARE
    org_rec RECORD;
    owner_role_id UUID;
    admin_role_id UUID;
    member_role_id UUID;
    perm_rec RECORD;
BEGIN
    -- Loop through all existing organizations
    FOR org_rec IN SELECT * FROM public.organizations LOOP
        
        -- A. Create Roles for this Org if they don't exist
        
        -- Owner Role
        INSERT INTO public.organization_roles (organization_id, name, is_system_role)
        VALUES (org_rec.id, 'Owner', true)
        ON CONFLICT (organization_id, name) DO UPDATE SET is_system_role = true
        RETURNING id INTO owner_role_id;

        -- Admin Role
        INSERT INTO public.organization_roles (organization_id, name, is_system_role)
        VALUES (org_rec.id, 'Admin', true)
        ON CONFLICT (organization_id, name) DO UPDATE SET is_system_role = true
        RETURNING id INTO admin_role_id;

        -- Member Role
        INSERT INTO public.organization_roles (organization_id, name, is_system_role)
        VALUES (org_rec.id, 'Member', true)
        ON CONFLICT (organization_id, name) DO UPDATE SET is_system_role = true
        RETURNING id INTO member_role_id;


        -- B. Map Permissions to Roles (Basic Default Setup)
        -- Owner: All Permissions
        FOR perm_rec IN SELECT id FROM public.permissions LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (owner_role_id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Admin: All except specialized (simplified for now, giving most)
        FOR perm_rec IN SELECT id FROM public.permissions WHERE key != 'ORG_DELETE' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (admin_role_id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Member: View Permissions
        FOR perm_rec IN SELECT id FROM public.permissions WHERE key IN ('ORG_VIEW', 'PROJECT_CREATE') LOOP
             INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (member_role_id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;


        -- C. Migrate Members (The Dual Write Backfill)
        -- Map existing 'owner' string to new Owner ID
        UPDATE public.organization_members
        SET role_id = owner_role_id
        WHERE organization_id = org_rec.id AND role = 'owner';

        -- Map existing 'admin' string to new Admin ID
        UPDATE public.organization_members
        SET role_id = admin_role_id
        WHERE organization_id = org_rec.id AND role = 'admin';

        -- Map 'member' logic
        UPDATE public.organization_members
        SET role_id = member_role_id
        WHERE organization_id = org_rec.id AND (role = 'member' OR role IS NULL);
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT public.migrate_organization_roles();

-- Drop the function after use
DROP FUNCTION public.migrate_organization_roles();

-- 7. ADD FOREIGN KEY CONSTRAINT TO ORGANIZATION_MEMBERS
-- Now that we've backfilled, we can enforce the FK, but we should make sure it's valid first.
ALTER TABLE public.organization_members 
ADD CONSTRAINT fk_organization_members_role
FOREIGN KEY (role_id) REFERENCES public.organization_roles(id);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124103000_enterprise_invites.sql */
/* ============================================================================ */

-- 1. UPGRADE ORGANIZATION_INVITES TABLE
-- Migration to Hashed Tokens Schema

-- Remove the plain text token column (Wait! We need to migrate data first if we cared about preserving old invites, 
-- but since this is dev/new feature, we can just replace or add. Let's add hash first).

ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS token_hash TEXT, -- Storing SHA256 Hash
ADD COLUMN IF NOT EXISTS invite_type TEXT DEFAULT 'email' CHECK (invite_type IN ('email', 'link', 'domain')),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS used_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Make hash unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_token_hash ON public.organization_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_invites_org_status ON public.organization_invites(organization_id, status);

-- Drop old plain text token constraints if needed, but let's keep the column nullable for legacy 
-- or drop it if we are sure. For Phase 2 clean start:
ALTER TABLE public.organization_invites DROP COLUMN IF EXISTS token;


-- 2. SECURE ATOMIC ACCEPTANCE FUNCTION (RPC)
-- This function handles the "Check -> Update -> Insert" flow in a SINGLE transaction
-- preventing race conditions where a token is used multiple times simultaneously.

CREATE OR REPLACE FUNCTION public.accept_invite_secure(
    p_token_hash TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as Owner to bypass RLS during the transaction steps if needed, but safer to check logic inside
SET search_path = public
AS $$
DECLARE
    v_invite RECORD;
    v_role_priority INT;
    v_membership_exists BOOLEAN;
BEGIN
    -- A. Lock the invite row for update
    SELECT * INTO v_invite
    FROM public.organization_invites
    WHERE token_hash = p_token_hash
    FOR UPDATE; -- CRITICAL: Locks row

    -- B. Validations
    IF v_invite IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVITE_NOT_FOUND');
    END IF;

    IF v_invite.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVITE_NOT_PENDING', 'status', v_invite.status);
    END IF;

    IF v_invite.expires_at < now() THEN
        -- Auto-expire if we catch it
        UPDATE public.organization_invites SET status = 'expired' WHERE id = v_invite.id;
        RETURN jsonb_build_object('success', false, 'error', 'INVITE_EXPIRED');
    END IF;

    IF v_invite.used_count >= v_invite.max_uses THEN
         RETURN jsonb_build_object('success', false, 'error', 'INVITE_MAX_USES');
    END IF;

    -- C. Idempotency Check: Is user already a member?
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = v_invite.organization_id AND user_id = p_user_id
    ) INTO v_membership_exists;

    IF v_membership_exists THEN
         RETURN jsonb_build_object('success', false, 'error', 'ALREADY_MEMBER');
    END IF;

    -- D. Execute Acceptance (Atomic)
    
    -- 1. Insert Member
    INSERT INTO public.organization_members (organization_id, user_id, role_id, status, joined_at)
    VALUES (v_invite.organization_id, p_user_id, v_invite.role_id, 'active', now());

    -- 2. Update Invite
    -- Increment used count
    UPDATE public.organization_invites
    SET used_count = used_count + 1,
        accepted_at = now(),
        status = CASE 
            WHEN used_count + 1 >= max_uses THEN 'accepted' 
            ELSE 'pending' 
        END
    WHERE id = v_invite.id;

    -- 3. Audit Log (System level log)
    INSERT INTO public.activity_logs (
        organization_id, 
        actor_id, 
        action, 
        target_type, 
        target_id, 
        metadata
    ) VALUES (
        v_invite.organization_id,
        p_user_id,
        'INVITE_ACCEPTED',
        'invite',
        v_invite.id,
        jsonb_build_object('method', 'token_hash')
    );

    RETURN jsonb_build_object('success', true, 'organization_id', v_invite.organization_id);

EXCEPTION WHEN OTHERS THEN
    -- Catch all error to allow clean API response
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124110000_enterprise_roles.sql */
/* ============================================================================ */

-- 1. UPGRADE ORGANIZATION_ROLES TABLE
-- Add Priority & System Lock Columns

ALTER TABLE public.organization_roles
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 50 NOT NULL, -- 0=Owner, 10=Admin, 50=Member, 80=Viewer
ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create Uniqueness Constraint on (Org, Name) to prevent ambiguous roles
ALTER TABLE public.organization_roles 
ADD CONSTRAINT unique_org_role_name UNIQUE (organization_id, name);


-- 2. CREATE DEFAULT SYSTEM ROLES (If not exists)
-- This is tricky for existing orgs, but for new/clean slate:
-- We'll assume the helper function `seed_organization_roles` (from Phase 1) needs update or we run a script.
-- For now, let's just ensure the COLUMNS are ready. The Application Logic handles creation.

-- 3. SECURE ROLE MANAGEMENT FUNCTIONS (RPCs)

-- A. Create Custom Role (Secure)
CREATE OR REPLACE FUNCTION public.create_role_secure(
    p_org_id UUID,
    p_name TEXT,
    p_priority INT,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_priority INT;
    v_new_role_id UUID;
BEGIN
    -- 1. Get Actor's Priority
    SELECT oroles.priority INTO v_actor_priority
    FROM public.organization_members om
    JOIN public.organization_roles oroles ON om.role_id = oroles.id
    WHERE om.organization_id = p_org_id AND om.user_id = p_actor_id;

    IF v_actor_priority IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACTOR_NOT_MEMBER');
    END IF;

    -- 2. Enforce Anti-Escalation: Cannot create role higher or equal to self? 
    -- Actually, usually Admin (10) can create Moderator (20). 
    -- Logic: New Priority MUST be > Actor Priority (Lower value = Higher Power).
    -- Wait, Admin (10) can create Admin (10) peer? Usually no.
    IF p_priority <= v_actor_priority THEN
         RETURN jsonb_build_object('success', false, 'error', 'ROLE_ESCALATION_BLOCKED: Cannot create role with higher/equal priority');
    END IF;

    -- 3. Clamp Priority (Max 100)
    IF p_priority > 100 THEN p_priority := 100; END IF;

    -- 4. Insert
    INSERT INTO public.organization_roles (organization_id, name, priority, is_system_role, is_deletable, is_editable)
    VALUES (p_org_id, p_name, p_priority, false, true, true)
    RETURNING id INTO v_new_role_id;

    -- 5. Audit
    INSERT INTO public.activity_logs (organization_id, actor_id, action, target_type, target_id, metadata)
    VALUES (p_org_id, p_actor_id, 'ROLE_CREATED', 'role', v_new_role_id, jsonb_build_object('name', p_name, 'priority', p_priority));

    RETURN jsonb_build_object('success', true, 'role_id', v_new_role_id);
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'ROLE_NAME_EXISTS');
WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- B. Delete Role (Safe)
CREATE OR REPLACE FUNCTION public.delete_role_safe(
    p_role_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role RECORD;
    v_member_count INT;
    v_org_id UUID;
    v_actor_priority INT;
BEGIN
    -- 1. Get Role Details
    SELECT * INTO v_role FROM public.organization_roles WHERE id = p_role_id;
    IF v_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROLE_NOT_FOUND');
    END IF;
    v_org_id := v_role.organization_id;

    -- 2. Check Permissions/Priority of Actor
    SELECT oroles.priority INTO v_actor_priority
    FROM public.organization_members om
    JOIN public.organization_roles oroles ON om.role_id = oroles.id
    WHERE om.organization_id = v_org_id AND om.user_id = p_actor_id;

    IF v_actor_priority >= v_role.priority THEN
         RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_PRIVILEGES');
    END IF;

    -- 3. System Role Check
    IF v_role.is_deletable = false THEN
        RETURN jsonb_build_object('success', false, 'error', 'SYSTEM_ROLE_PROTECTED');
    END IF;

    -- 4. Orphan Check (Are users assigned?)
    SELECT COUNT(*) INTO v_member_count FROM public.organization_members WHERE role_id = p_role_id;
    IF v_member_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROLE_IN_USE', 'count', v_member_count);
    END IF;

    -- 5. Delete (Cascade handles permissions)
    DELETE FROM public.organization_roles WHERE id = p_role_id;

    -- 6. Audit
    INSERT INTO public.activity_logs (organization_id, actor_id, action, target_type, target_id, metadata)
    VALUES (v_org_id, p_actor_id, 'ROLE_DELETED', 'role', p_role_id, jsonb_build_object('name', v_role.name));

    RETURN jsonb_build_object('success', true);
END;
$$;

-- C. Update Role Permissions (Atomic Diff)
-- This is complex to do purely in SQL without passing arrays. 
-- For simplicity in Phase 3 verification, we will handle Diffing in Backend and use a Transaction there, 
-- or we can use a simpler function that just wipes and inserts if we trust the backend logic.
-- Given Supabase 'rpc' limitations with arrays sometimes, let's trust the Service Layer for this one specific Task 
-- BUT enforce Critical Permission guard here.

CREATE OR REPLACE FUNCTION public.guard_system_role_permissions()
RETURNS TRIGGER AS $$
DECLARE
    v_role_is_system BOOLEAN;
    v_perm_key TEXT;
BEGIN
    -- Check if role is system
    SELECT is_system_role INTO v_role_is_system FROM public.organization_roles WHERE id = OLD.role_id;
    
    IF v_role_is_system THEN
        -- Check if removing critical permission
        SELECT key INTO v_perm_key FROM public.permissions WHERE id = OLD.permission_id;
        
        IF v_perm_key IN ('ORG_DELETE', 'ROLE_MANAGE', 'OWNER_TRANSFER') THEN
            RAISE EXCEPTION 'Cannot remove critical permission % from system role', v_perm_key;
        END IF;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protect_system_role_perms
BEFORE DELETE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.guard_system_role_permissions();



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124120000_enterprise_projects.sql */
/* ============================================================================ */

-- 1. UPGRADE PROJECTS TABLE
-- Ensure Enterprise fields exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ensure Unique Name per Org
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS unique_project_name_per_org;

ALTER TABLE public.projects 
ADD CONSTRAINT unique_project_name_per_org UNIQUE (organization_id, name);


-- 2. UPGRADE TEAMS TABLE
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS unique_team_name_per_org;

ALTER TABLE public.teams 
ADD CONSTRAINT unique_team_name_per_org UNIQUE (organization_id, name);


-- 3. UPGRADE TEAM_MEMBERS
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id);


-- 4. CREATE PROJECT_TEAMS (Scope Link)
CREATE TABLE IF NOT EXISTS public.project_teams (
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (project_id, team_id)
);

-- Enable RLS
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;


-- 5. CREATE PROJECT_MEMBERS (Direct Scope)
CREATE TABLE IF NOT EXISTS public.project_members (
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;


-- 6. SECURITY: RLS POLICIES (THE SCOPE ENGINE)

-- 6.1 Policy for PROJECT_TEAMS
-- Visible if you are in the Org
CREATE POLICY "Project teams viewable by org members" ON public.project_teams FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = project_teams.project_id
        AND om.user_id = auth.uid()
    )
);

-- 6.2 Policy for PROJECT_MEMBERS
-- Visible if you are in the Org
CREATE POLICY "Project members viewable by org members" ON public.project_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = project_members.project_id
        AND om.user_id = auth.uid()
    )
);


-- 6.3 MAIN PROJECT ACCESS POLICY (Enterprise Requirement)
-- Drop old simple policy
DROP POLICY IF EXISTS "Projects viewable by org members" ON public.projects;

-- Create New Scope-Based Policy
CREATE POLICY "Enterprise Project Access" ON public.projects FOR SELECT USING (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
    )
    AND (
        -- 1. Org Admin/Owner (Access All)
        EXISTS (
            SELECT 1 FROM public.organization_members om
            JOIN public.organization_roles r ON om.role_id = r.id
            WHERE om.organization_id = projects.organization_id
            AND om.user_id = auth.uid()
            AND (r.name IN ('Owner', 'Admin') OR r.priority <= 10)
        )
        OR 
        -- 2. Direct Member
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id
            AND pm.user_id = auth.uid()
        )
        OR
        -- 3. Team Member (via Project-Team link)
        EXISTS (
            SELECT 1 FROM public.team_members tm
            JOIN public.project_teams pt ON tm.team_id = pt.team_id
            WHERE pt.project_id = projects.id
            AND tm.user_id = auth.uid()
        )
        OR
        -- 4. Creator (Fail safe)
        created_by = auth.uid()
    )
);

-- Note: Insert/Update/Delete policies usually restricted to Admins or those with specific permissions.
-- For now, we enforce Read Scope aggressively. Write scope relies on Service Layer Permission checks (PROJECT_CREATE etc).



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124134000_fix_org_insert_policy.sql */
/* ============================================================================ */

-- Comprehensive RLS fixes for Organization Creation flow

-- 1. ORGANIZATIONS TABLE
-- Allow authenticated users to insert a new organization if they are the owner
DROP POLICY IF EXISTS "Users can create organizations" ON "public"."organizations";
CREATE POLICY "Users can create organizations" ON "public"."organizations"
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- Allow owners to view their own organizations (Crucial for the .select() return)
-- Existing policies might only check membership, which doesn't exist yet!
DROP POLICY IF EXISTS "Owners can view their organizations" ON "public"."organizations";
CREATE POLICY "Owners can view their organizations" ON "public"."organizations"
FOR SELECT 
TO authenticated 
USING (auth.uid() = owner_id);

-- 2. ORGANIZATION_ROLES TABLE (For manual fallback)
-- Allow owners to create roles in their organizations
DROP POLICY IF EXISTS "Owners can create roles" ON "public"."organization_roles";
CREATE POLICY "Owners can create roles" ON "public"."organization_roles"
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."organizations" 
    WHERE id = organization_id AND owner_id = auth.uid()
  )
);

-- 3. ORGANIZATION_MEMBERS TABLE (For manual fallback)
-- Allow owners to add themselves (or others) to their organizations
DROP POLICY IF EXISTS "Owners can add members" ON "public"."organization_members";
CREATE POLICY "Owners can add members" ON "public"."organization_members"
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."organizations" 
    WHERE id = organization_id AND owner_id = auth.uid()
  )
);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124140000_master_rls_fix.sql */
/* ============================================================================ */

-- MASTER RLS FIX FOR COSPIRA ORGANIZATIONS & PROJECTS
-- This script fixes "403 Forbidden" and empty result issues by establishing
-- a baseline of permissive-but-secure policies for Owners and Members.

-- ==========================================
-- 1. ORGANIZATIONS
-- ==========================================

-- Allow ANY authenticated user to create an organization (becoming owner)
DROP POLICY IF EXISTS "Users can create organizations" ON "public"."organizations";
CREATE POLICY "Users can create organizations" ON "public"."organizations"
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- Allow users to view organizations they own OR are a member of
-- (Using a simplified EXISTS clause to avoid infinite recursion)
DROP POLICY IF EXISTS "Users can view their organizations" ON "public"."organizations";
CREATE POLICY "Users can view their organizations" ON "public"."organizations"
FOR SELECT 
TO authenticated 
USING (
  owner_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_members.organization_id = organizations.id 
    AND organization_members.user_id = auth.uid()
  )
);

-- ==========================================
-- 2. ORGANIZATION MEMBERS & ROLES
-- ==========================================

-- Allow users to view their own membership and others in their orgs
DROP POLICY IF EXISTS "View members of my orgs" ON "public"."organization_members";
CREATE POLICY "View members of my orgs" ON "public"."organization_members"
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() -- View self
  OR
  organization_id IN ( -- View others in orgs I belong to
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow Owners to manage members (Add/Remove)
DROP POLICY IF EXISTS "Owners manage members" ON "public"."organization_members";
CREATE POLICY "Owners manage members" ON "public"."organization_members"
FOR ALL
TO authenticated 
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

-- Allow viewing roles for orgs I belong to
DROP POLICY IF EXISTS "View roles of my orgs" ON "public"."organization_roles";
CREATE POLICY "View roles of my orgs" ON "public"."organization_roles"
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow owners to create roles
-- Note: 'organization_roles' RLS is tricky on INSERT because row doesn't exist yet to check org ownership.
-- We check if the user OWNS the organization_id specified in the new row.
DROP POLICY IF EXISTS "Owners create roles" ON "public"."organization_roles";
CREATE POLICY "Owners create roles" ON "public"."organization_roles"
FOR INSERT
TO authenticated
WITH CHECK (
   EXISTS (
     SELECT 1 FROM organizations 
     WHERE id = organization_id 
     AND owner_id = auth.uid()
   )
);

-- ==========================================
-- 3. PROJECTS & TEAMS
-- ==========================================

-- Allow members to VIEW projects in their org
DROP POLICY IF EXISTS "View projects in my org" ON "public"."projects";
CREATE POLICY "View projects in my org" ON "public"."projects"
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow owners (or those with permission) to CREATE projects
-- Simplified: Allow any member for now, can be restricted to 'PROJECT_CREATE' permission later
DROP POLICY IF EXISTS "Members create projects" ON "public"."projects";
CREATE POLICY "Members create projects" ON "public"."projects"
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow members to VIEW teams
DROP POLICY IF EXISTS "View teams in my org" ON "public"."teams";
CREATE POLICY "View teams in my org" ON "public"."teams"
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow members to CREATE teams
DROP POLICY IF EXISTS "Members create teams" ON "public"."teams";
CREATE POLICY "Members create teams" ON "public"."teams"
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Allow linking Teams to Projects
DROP POLICY IF EXISTS "Link teams to projects" ON "public"."project_teams";
CREATE POLICY "Link teams to projects" ON "public"."project_teams"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_teams.project_id 
    AND organization_id IN (
       SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);

-- Allow viewing/adding Team Members
DROP POLICY IF EXISTS "Manage team members" ON "public"."team_members";
CREATE POLICY "Manage team members" ON "public"."team_members"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_members.team_id
    AND organization_id IN (
       SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124143000_consolidated_schema_init.sql */
/* ============================================================================ */

-- EMERGENCY FIX FOR CIRCULAR DEPENDENCY
-- The circular dependency was:
-- Organizations Policy -> checks Organization_Members
-- Organization_Members Policy -> checks Organizations (for Owner check)
-- Result: Infinite Recursion.
-- FIX: Remove the "Owner check" from Organization_Members policy. 
-- Owners must use the `get_organization_members_secure` RPC to view other members.

-- 1. CLEANUP
DROP POLICY IF EXISTS "View members of my orgs" ON "public"."organization_members";
DROP POLICY IF EXISTS "Owners manage members" ON "public"."organization_members";
DROP POLICY IF EXISTS "View self membership" ON "public"."organization_members";
DROP POLICY IF EXISTS "View peer membership" ON "public"."organization_members";
DROP POLICY IF EXISTS "Owners view all members" ON "public"."organization_members";

DROP POLICY IF EXISTS "Users can view their organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Users can create organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Owners view organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Members view organizations" ON "public"."organizations";

-- 2. APPLY NON-RECURSIVE POLICIES

-- 2.1 ORGANIZATION_MEMBERS
-- STRICT POLICY: You can ONLY see your OWN rows.
-- This breaks the cycle because it doesn't look at the Organizations table.
CREATE POLICY "View self membership" ON "public"."organization_members"
FOR SELECT TO authenticated
USING ( user_id = auth.uid() );

-- ALLOW INSERT for manual fallbacks (Owners inserting themselves/others)
-- Ideally this would be strict, but for now we allow it to unblock. 
-- The "Check Organization" here *might* cause recursion if we are not careful.
-- Better to allow INSERT if you are authenticated, and trust backend logic / triggers.
-- Or simplistic check:
CREATE POLICY "Insert membership" ON "public"."organization_members"
FOR INSERT TO authenticated
WITH CHECK (true); -- Rely on Trigger/Backend constraints to validate. Or use RPC.

-- 2.2 ORGANIZATIONS
CREATE POLICY "Users can create organizations" ON "public"."organizations"
FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "View organizations" ON "public"."organizations"
FOR SELECT TO authenticated
USING (
    owner_id = auth.uid()
    OR
    EXISTS (
        -- This is now safe because reading organization_members ONLY checks (user_id = auth.uid())
        -- It does NOT check Organizations table anymore. Recursion broken.
        SELECT 1 FROM organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid()
    )
);

-- 3. ENSURE SECURE RPC EXISTS (For Owners to view all members)
CREATE OR REPLACE FUNCTION public.get_organization_members_secure(p_org_id UUID)
RETURNS TABLE (
    user_id UUID,
    role_id UUID,
    status TEXT,
    joined_at TIMESTAMPTZ,
    organization_roles JSON,
    profiles JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Permission Check: Am I a member of p_org_id? (Safe, non-recursive check via direct query)
    IF NOT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        om.user_id,
        om.role_id,
        om.status,
        om.joined_at,
        to_json(r.*) as organization_roles,
        json_build_object('display_name', p.display_name, 'email', u.email) as profiles
    FROM organization_members om
    JOIN organization_roles r ON om.role_id = r.id
    LEFT JOIN profiles p ON om.user_id = p.id
    LEFT JOIN auth.users u ON om.user_id = u.id 
    WHERE om.organization_id = p_org_id;
END;
$$;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124144500_schema_repair.sql */
/* ============================================================================ */

-- REPAIR SCRIPT FOR MISSING COLUMNS AND RPC AMBIGUITY

-- 1. FIX PROJECTS TABLE SCHEMA
-- Ensure 'status' column exists (CREATE TABLE IF NOT EXISTS skipped it if table existed)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. FIX TEAMS TABLE SCHEMA
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. REPAIR SECURE RPC FUNCTION (Resolve Ambiguity)
-- We rename aliases and fully qualify every single column reference to avoid "ambiguous column" errors.
CREATE OR REPLACE FUNCTION public.get_organization_members_secure(p_org_id UUID)
RETURNS TABLE (
    user_id UUID,
    role_id UUID,
    status TEXT,
    joined_at TIMESTAMPTZ,
    organization_roles JSON,
    profiles JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Permission Check
    -- Check if the requesting user (auth.uid()) is a member of the target org (p_org_id)
    -- We use 'om_check' alias to be safe
    IF NOT EXISTS (
        SELECT 1 
        FROM public.organization_members AS om_check 
        WHERE om_check.organization_id = p_org_id 
        AND om_check.user_id = auth.uid()
    ) THEN
        RETURN; -- Unauthorized: Return empty set
    END IF;

    -- 2. Return Data
    RETURN QUERY
    SELECT 
        m.user_id,
        m.role_id,
        m.status,
        m.joined_at,
        to_json(r.*) as organization_roles,
        json_build_object(
            'display_name', p.display_name, 
            'email', u.email,
            'avatar_url', p.avatar_url
        ) as profiles
    FROM public.organization_members AS m
    JOIN public.organization_roles AS r ON m.role_id = r.id
    LEFT JOIN public.profiles AS p ON m.user_id = p.id
    LEFT JOIN auth.users AS u ON m.user_id = u.id
    WHERE m.organization_id = p_org_id;
END;
$$;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124150000_enable_project_updates.sql */
/* ============================================================================ */

-- ENABLE UPDATE/DELETE POLICIES FOR PROJECTS (Soft Delete Support)

-- 1. DROP EXISTING POLICIES (To be safe and avoid conflicts)
DROP POLICY IF EXISTS "Members update projects" ON "public"."projects";
DROP POLICY IF EXISTS "Members delete projects" ON "public"."projects";

-- 2. CREATE UPDATE POLICY
-- Allows members to update projects (e.g. for Soft Delete 'status' = 'deleted')
CREATE POLICY "Members update projects" ON "public"."projects"
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- 3. CREATE DELETE POLICY
-- Allows members to hard-delete (if needed in future, or for cleanup)
CREATE POLICY "Members delete projects" ON "public"."projects"
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260124200000_gaming_system.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260126000000_analytics_tables.sql */
/* ============================================================================ */

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS room_sessions CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS calculate_session_duration() CASCADE;
DROP FUNCTION IF EXISTS update_room_participant_count() CASCADE;

-- Create rooms table for analytics
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host_id UUID NOT NULL,
  mode TEXT CHECK (mode IN ('fun', 'professional', 'ultra', 'mixed')),
  access_type TEXT CHECK (access_type IN ('public', 'password', 'invite', 'organization')),
  organization_id UUID,
  participant_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Create room_sessions table for tracking user participation
CREATE TABLE room_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  room_id TEXT,
  room_mode TEXT CHECK (room_mode IN ('fun', 'professional', 'ultra', 'mixed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_rooms_created_at ON rooms(created_at);
CREATE INDEX idx_rooms_mode ON rooms(mode);
CREATE INDEX idx_rooms_is_active ON rooms(is_active);

CREATE INDEX idx_room_sessions_user_id ON room_sessions(user_id);
CREATE INDEX idx_room_sessions_room_id ON room_sessions(room_id);
CREATE INDEX idx_room_sessions_room_mode ON room_sessions(room_mode);
CREATE INDEX idx_room_sessions_created_at ON room_sessions(created_at);

-- Function to automatically calculate session duration
CREATE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND NEW.joined_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.left_at - NEW.joined_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate duration when left_at is set
CREATE TRIGGER trigger_calculate_session_duration
  BEFORE INSERT OR UPDATE ON room_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();

-- Function to update room participant count
CREATE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.left_at IS NULL THEN
    UPDATE rooms SET participant_count = participant_count + 1 WHERE id = NEW.room_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.left_at IS NULL AND NEW.left_at IS NOT NULL THEN
    UPDATE rooms SET participant_count = GREATEST(participant_count - 1, 0) WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update participant count
CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT OR UPDATE ON room_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_room_participant_count();

-- Comments for documentation
COMMENT ON TABLE rooms IS 'Tracks all created rooms for analytics';
COMMENT ON TABLE room_sessions IS 'Tracks user participation in rooms for analytics';
COMMENT ON COLUMN rooms.mode IS 'Room mode: fun, professional, ultra, or mixed';
COMMENT ON COLUMN room_sessions.duration_seconds IS 'Auto-calculated duration of the session in seconds';



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20260202000000_rooms_realtime.sql */
/* ============================================================================ */

-- Migration to synchronize rooms schema for Premium + Real-time functionality

-- 1. Create global_stats table
CREATE TABLE IF NOT EXISTS global_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    active_users INTEGER DEFAULT 0,
    active_rooms INTEGER DEFAULT 0,
    avg_ping INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- Initialize global_stats if empty
INSERT INTO global_stats (id, active_users, active_rooms, avg_ping)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Create room_presence table for real-time tracking
CREATE TABLE IF NOT EXISTS room_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 3. Update rooms table
-- Note: We use ALTER TABLE to avoid data loss if table already exists
DO $$ 
BEGIN
    -- Add secure_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='secure_code') THEN
        ALTER TABLE rooms ADD COLUMN secure_code TEXT;
    END IF;

    -- Add rating
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='rating') THEN
        ALTER TABLE rooms ADD COLUMN rating FLOAT DEFAULT 5.0;
    END IF;

    -- Add max_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='max_users') THEN
        ALTER TABLE rooms ADD COLUMN max_users INTEGER DEFAULT 50;
    END IF;

    -- Add status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='status') THEN
        ALTER TABLE rooms ADD COLUMN status TEXT CHECK (status IN ('active', 'full', 'closed')) DEFAULT 'active';
    END IF;

    -- Add updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='updated_at') THEN
        ALTER TABLE rooms ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Harmonize names (Optional but recommended for spec compliance)
    -- We'll keep existing columns but map them in queries to avoid breaking existing code
    -- OR we can rename if we are confident. 
    -- For now, let's just ensure the required data exists.
END $$;

-- 4. Presence Triggers to maintain participant_count (current_users)
CREATE OR REPLACE FUNCTION update_global_stats_on_presence()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE global_stats SET active_users = active_users + 1 WHERE id = 1;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE global_stats SET active_users = GREATEST(active_users - 1, 0) WHERE id = 1;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_global_stats_on_presence ON room_presence;
CREATE TRIGGER trigger_update_global_stats_on_presence
    AFTER INSERT OR DELETE ON room_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_global_stats_on_presence();



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\supabase\migrations\20261130.sql */
/* ============================================================================ */

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'username', substring(NEW.email from '(.*)@'))
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase5_schema.sql */
/* ============================================================================ */

-- Phase 5 Migration: Social & Economy

-- 1. Update player_profiles table
ALTER TABLE public.player_profiles 
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 2. Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    friend_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- 3. RLS Policies for Friendships

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own friendships (either as sender or receiver)
CREATE POLICY "Users can view their own friendships" 
ON public.friendships FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Allow users to create requests
CREATE POLICY "Users can create friend requests" 
ON public.friendships FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update friendships (accept/block) where they are involved
CREATE POLICY "Users can update their friendships" 
ON public.friendships FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 4. Create function to search players (for friend requests)
-- (Optional, usually handled by simple select with filter)



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase5_clans.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase6_clan_wars.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase6_tournaments.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase7_analytics.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase7_replays.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase11_identity.sql */
/* ============================================================================ */

-- Phase 11: Player Identity Economy

-- 1. Create Assets Catalog
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('avatar', 'frame', 'banner', 'voice', 'effect')),
    name TEXT NOT NULL,
    description TEXT,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    image_url TEXT NOT NULL,
    price_coins INTEGER DEFAULT 0,
    is_purchasable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create User Inventory
CREATE TABLE IF NOT EXISTS public.user_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    asset_id UUID REFERENCES public.assets(id) NOT NULL,
    obtained_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, asset_id)
);

-- 3. Update Player Profiles
ALTER TABLE public.player_profiles
ADD COLUMN IF NOT EXISTS equipped_avatar_id UUID REFERENCES public.assets(id),
ADD COLUMN IF NOT EXISTS equipped_frame_id UUID REFERENCES public.assets(id),
ADD COLUMN IF NOT EXISTS equipped_banner_id UUID REFERENCES public.assets(id);

-- 4. RLS Policies

-- Assets: Everyone can see what's available
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read assets" ON public.assets FOR SELECT USING (true);

-- User Assets: Everyone can maybe see inventory? Or just own?
-- Let's say public read (to inspect profiles), Owner insert (via purchase logic potentially, or system)
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read user assets" ON public.user_assets FOR SELECT USING (true);
CREATE POLICY "User insert own asset" ON public.user_assets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Seed Initial Data
INSERT INTO public.assets (type, name, description, rarity, price_coins, image_url) VALUES
('avatar', 'Cyber Samurai', 'A warrior from the neon future.', 'epic', 500, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Samurai'),
('avatar', 'Void Walker', 'Shadows stand still.', 'legendary', 1000, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Void'),
('frame', 'Gold Border', 'Classic luxury.', 'rare', 200, 'border-yellow-500'),
('frame', 'Neon Pulse', 'Vibrant energy.', 'epic', 450, 'border-cyan-500 shadow-[0_0_15px_cyan]'),
('banner', 'Cosmic Dust', 'Starry background.', 'rare', 300, 'bg-slate-900')
ON CONFLICT DO NOTHING;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase12_meta.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase12_repair_schema.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase13_matchmaking.sql */
/* ============================================================================ */

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



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase14_behavior.sql */
/* ============================================================================ */

-- Phase 14: Behavior System

-- 1. Create Reports Table
CREATE TABLE IF NOT EXISTS public.player_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    reported_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('toxicity', 'cheating', 'afk', 'spam', 'other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can create reports
CREATE POLICY "Users can create reports" ON public.player_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Only admins should view/update (For MVP, we might leave this restricted or allow users to see their own sent reports)
CREATE POLICY "Users can view own sent reports" ON public.player_reports FOR SELECT USING (auth.uid() = reporter_id);

-- 3. Index for Analytics
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.player_reports(reported_id);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase15_balancing.sql */
/* ============================================================================ */

-- Phase 15: Game Balancing Engine

-- 1. Create Config Table
CREATE TABLE IF NOT EXISTS public.game_balance_configs (
    game_id TEXT PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.player_profiles(id)
);

-- 2. RLS Policies
ALTER TABLE public.game_balance_configs ENABLE ROW LEVEL SECURITY;

-- Everyone can read stats/configs (clients need them)
CREATE POLICY "Public read configs" ON public.game_balance_configs FOR SELECT USING (true);

-- Only Admins can update (We'll assume specific user IDs or a role check for now)
-- For MVP, strict check:
-- CREATE POLICY "Admin update configs" ON public.game_balance_configs FOR UPDATE USING (auth.uid() IN (SELECT id FROM admins));
-- Since we don't have an admins table yet, we'll leave it open for 'authenticated' to simulate the admin panel for the user.
CREATE POLICY "Auth update configs" ON public.game_balance_configs FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Seed Initial Configs
INSERT INTO public.game_balance_configs (game_id, config) VALUES
(
    'chess', 
    '{
        "modes": {
            "blitz": { "time": 300, "increment": 0 },
            "rapid": { "time": 600, "increment": 5 },
            "bullet": { "time": 60, "increment": 0 }
        },
        "points": { "win": 1, "draw": 0.5, "loss": 0 }
    }'::jsonb
),
(
    'ludo', 
    '{
        "dice": {
            "six_probability": 0.166,
            "weighted_mode": false
        },
        "board": {
            "safe_spots": [0, 8, 13, 21, 26, 34, 39, 47],
            "star_bonus_xp": 10
        }
    }'::jsonb
)
ON CONFLICT (game_id) DO NOTHING;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase16_seasons.sql */
/* ============================================================================ */

-- Phase 16: Events & Seasons

-- 1. Seasons Table
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    theme_color TEXT DEFAULT 'indigo', -- 'indigo', 'amber', 'rose'
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Battle Pass Levels
CREATE TABLE IF NOT EXISTS public.battle_pass_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    reward_type TEXT CHECK (reward_type IN ('coins', 'asset', 'xp')),
    reward_value TEXT NOT NULL, -- '100', 'avatar_uuid', etc
    is_premium BOOLEAN DEFAULT false,
    UNIQUE(season_id, level)
);

-- 3. Player Progress
CREATE TABLE IF NOT EXISTS public.player_season_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    season_id UUID REFERENCES public.seasons(id) NOT NULL,
    current_xp INTEGER DEFAULT 0,
    claimed_levels INTEGER[] DEFAULT '{}',
    is_premium BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, season_id)
);

-- 4. RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_pass_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_season_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Public read levels" ON public.battle_pass_levels FOR SELECT USING (true);
CREATE POLICY "Public read progress" ON public.player_season_progress FOR SELECT USING (true);
CREATE POLICY "Auth update own progress" ON public.player_season_progress FOR UPDATE USING (auth.uid() = user_id);
-- Insert via system functions mostly, but auth insert for init is fine
CREATE POLICY "Auth insert progress" ON public.player_season_progress FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 5. Seed Season 1
DO $$
DECLARE
    s_id UUID;
BEGIN
    INSERT INTO public.seasons (name, description, start_at, end_at, is_active, theme_color)
    VALUES ('Season 1: Genesis', 'The beginning of the Cospira Elite Era.', NOW(), NOW() + INTERVAL '30 days', true, 'purple')
    RETURNING id INTO s_id;

    -- Seed Levels
    INSERT INTO public.battle_pass_levels (season_id, level, reward_type, reward_value, is_premium)
    VALUES 
    (s_id, 1, 'coins', '100', false),
    (s_id, 2, 'coins', '200', false),
    (s_id, 3, 'xp', '500', false),
    (s_id, 4, 'coins', '500', true), -- Premium
    (s_id, 5, 'asset', 'frame_gold_01', true); -- Assuming we have asset logic or just text for now
END $$;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase17_qol.sql */
/* ============================================================================ */

-- Phase 17: Quality of Life

-- 1. Add Settings to Profile
ALTER TABLE public.player_profiles
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{ "volume": 50, "theme": "system", "notifications": true, "streamer_mode": false }'::jsonb;

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'reward'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase18_quests.sql */
/* ============================================================================ */

-- Phase 18: Retention (Daily Quests)

-- 1. Quest Definitions (Templates)
CREATE TABLE IF NOT EXISTS public.quest_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    target_count INTEGER NOT NULL DEFAULT 1,
    reward_type TEXT DEFAULT 'coins',
    reward_amount INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN DEFAULT true
);

-- 2. Player Quests (Daily Instances)
CREATE TABLE IF NOT EXISTS public.player_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    quest_id UUID REFERENCES public.quest_definitions(id) NOT NULL,
    current_progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    assigned_at DATE DEFAULT CURRENT_DATE, -- Rotates daily
    UNIQUE(user_id, quest_id, assigned_at)
);

-- 3. RLS
ALTER TABLE public.quest_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read quest defs" ON public.quest_definitions FOR SELECT USING (true);
CREATE POLICY "Users read own quests" ON public.player_quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own quests" ON public.player_quests FOR UPDATE USING (auth.uid() = user_id);
-- System inserts quests, usually via trigger or service. Allowing auth insert for MVP service logic.
CREATE POLICY "Users insert own quests" ON public.player_quests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Seed Standard Quests
INSERT INTO public.quest_definitions (title, description, target_count, reward_type, reward_amount) VALUES
('First Blood', 'Win 1 Match', 1, 'coins', 100),
('Marathon', 'Play 3 Matches', 3, 'xp', 500),
('Socialite', 'Send 5 Chat Messages', 5, 'coins', 50)
ON CONFLICT DO NOTHING;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase18_monetization.sql */
/* ============================================================================ */

-- Phase 18: Monetization & Store

-- 1. Add Premium Currency (Gems)
ALTER TABLE public.player_profiles
ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0;

-- 2. Store Items Catalog
CREATE TABLE IF NOT EXISTS public.store_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_coins INTEGER, -- Null if not buyable with coins
    price_gems INTEGER, -- Null if not buyable with gems
    category TEXT CHECK (category IN ('avatar', 'frame', 'boost', 'currency', 'bundle')),
    asset_id TEXT, -- Link to asset system
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions Log
CREATE TABLE IF NOT EXISTS public.store_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    item_id UUID REFERENCES public.store_items(id),
    currency TEXT CHECK (currency IN ('coins', 'gems', 'usd')),
    amount INTEGER NOT NULL, -- Price paid
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read items" ON public.store_items FOR SELECT USING (is_active = true);
CREATE POLICY "Users read own transactions" ON public.store_transactions FOR SELECT USING (auth.uid() = user_id);

-- 5. Seed Items
INSERT INTO public.store_items (name, description, price_coins, price_gems, category, asset_id) VALUES
('Starter Bundle', '500 Coins + 50 Gems', NULL, 50, 'bundle', 'bundle_starter'),
('Golden Frame', 'Premium golden profile border', NULL, 200, 'frame', 'frame_gold'),
('XP Boost (1h)', 'Double XP for 1 hour', 1000, 50, 'boost', 'boost_xp_1h'),
('Shadow Avatar', 'Rare shadow theme avatar', 5000, 300, 'avatar', 'avatar_shadow')
ON CONFLICT DO NOTHING;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase19_brain.sql */
/* ============================================================================ */

-- Phase 19: Cospira Brain Architecture

-- 1. Player Intelligence DNA
CREATE TABLE IF NOT EXISTS public.player_intelligence (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    skill_level FLOAT DEFAULT 1000, -- Dynamic Skill Rating (distinct from ELO)
    aggression_index FLOAT DEFAULT 0.5, -- 0.0 (Defensive) to 1.0 (Aggressive)
    consistency_score FLOAT DEFAULT 0.5, -- Low variance = High consistency
    toxicity_score FLOAT DEFAULT 0.0, -- 0.0 (Saint) to 1.0 (Toxic)
    play_style TEXT CHECK (play_style IN ('aggressive', 'defensive', 'balanced', 'chaotic')),
    learning_rate FLOAT DEFAULT 0.0, -- Improvement slope
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Game Meta Analysis
CREATE TABLE IF NOT EXISTS public.game_meta (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id TEXT NOT NULL, -- 'chess', 'tictactoe'
    strategy_key TEXT NOT NULL, -- 'sicilian_defense', 'center_opening'
    win_rate FLOAT DEFAULT 0.5,
    usage_rate FLOAT DEFAULT 0.0,
    trend_score FLOAT DEFAULT 0.0, -- Positive = Rising, Negative = Falling
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, strategy_key)
);

-- 3. RLS
ALTER TABLE public.player_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own DNA" ON public.player_intelligence FOR SELECT USING (auth.uid() = user_id);
-- In a real app, only System/Admin updates this. For MVP, we might allow service-role or client RPC if secure.
-- Allowing public read for meta analysis (Trending strategies)
CREATE POLICY "Public read meta" ON public.game_meta FOR SELECT USING (true);


-- 4. Seed Intelligence (Mock for current user later) & Meta
INSERT INTO public.game_meta (game_id, strategy_key, win_rate, usage_rate, trend_score) VALUES
('chess', 'sicilian_defense', 0.54, 0.18, 0.05),
('chess', 'ruy_lopez', 0.52, 0.12, 0.01),
('chess', 'kings_gambit', 0.48, 0.05, -0.02),
('tictactoe', 'center_first', 0.72, 0.60, 0.00),
('tictactoe', 'corner_first', 0.65, 0.30, 0.02)
ON CONFLICT DO NOTHING;



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase20_prediction.sql */
/* ============================================================================ */

-- Phase 20: Predictive Player Intelligence

-- 1. Prediction Store
CREATE TABLE IF NOT EXISTS public.player_predictions (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    churn_probability FLOAT DEFAULT 0.1, -- Probability of quitting in 7 days
    win_probability FLOAT DEFAULT 0.5, -- Estimated daily win rate
    tilt_probability FLOAT DEFAULT 0.1, -- Probability of toxic outbreak
    improvement_rate FLOAT DEFAULT 0.0, -- Elo points per week estimated
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.player_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own predictions" ON public.player_predictions FOR SELECT USING (auth.uid() = user_id);
-- System writes predictions.

-- 3. Initial Mock Data for visualization
-- (In a real app, this would be computed by a python worker, but we simulate via BrainService)



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase23_evolution.sql */
/* ============================================================================ */

-- Phase 23: Self-Evolving Meta Engine

-- 1. Meta Evolution Store
CREATE TABLE IF NOT EXISTS public.meta_evolution (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id TEXT NOT NULL,
    strategy_key TEXT NOT NULL,
    trend_score FLOAT DEFAULT 0.0,
    mutation_suggestion JSONB, -- { "action": "nerf", "parameter": "damage", "change": -10 }
    status TEXT DEFAULT 'PENDING', -- PENDING, APPLIED, REJECTED
    applied_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, strategy_key)
);

-- 2. RLS
ALTER TABLE public.meta_evolution ENABLE ROW LEVEL SECURITY;

-- Public read for transparency? Or Admin only? 
-- Let's make it Public Read, Admin Write (System).
CREATE POLICY "Public read meta evolution" ON public.meta_evolution FOR SELECT USING (true);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase24_control.sql */
/* ============================================================================ */

-- Phase 24: Brain Control System

-- 1. Brain Action Log
CREATE TABLE IF NOT EXISTS public.brain_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL, -- CHANGE_MATCHMAKING_RULE, BUFF_STRATEGY, etc.
    target_id TEXT, -- UserID or GameID depending on action
    payload JSONB, -- The parameters of the action
    status TEXT DEFAULT 'EXECUTED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.brain_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read brain actions" ON public.brain_actions FOR SELECT USING (true);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase25_probabilistic.sql */
/* ============================================================================ */

-- Phase 25: Probabilistic Player Model

-- 1. Probability Distributions Store
CREATE TABLE IF NOT EXISTS public.player_distributions (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    
    -- Skill Distribution (Gaussian)
    skill_mu FLOAT DEFAULT 1000.0,
    skill_sigma FLOAT DEFAULT 100.0, -- Default uncertainty is high

    -- Tilt Distribution (Gaussian)
    tilt_mu FLOAT DEFAULT 0.0,
    tilt_sigma FLOAT DEFAULT 0.2,

    -- Churn Probability Distribution (Beta Distribution params potentially, or just Gaussian for simplicity)
    churn_mu FLOAT DEFAULT 0.1,
    churn_sigma FLOAT DEFAULT 0.05,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.player_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read distributions" ON public.player_distributions FOR SELECT USING (true);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase26_learning.sql */
/* ============================================================================ */

-- Phase 26: Learning Decision Engine (RL-Lite)

-- 1. Decision Outcome Store
CREATE TABLE IF NOT EXISTS public.brain_decision_outcomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decision_id UUID REFERENCES public.brain_actions(id), -- Link to the action taken (if we linked them deeply)
    -- actually brain_actions doesn't have a decision_id link easily without refactor. 
    -- Let's just link to user and generic decision type for now for simplicity in this demo.
    user_id UUID,
    decision_type TEXT NOT NULL, -- e.g. RETENTION_REWARD
    
    outcome TEXT CHECK (outcome IN ('IMPROVED', 'WORSENED', 'NEUTRAL')),
    reward_score FLOAT, -- e.g. +1.0 for retention, -0.5 for churn
    
    metrics_before JSONB, -- Snapshot of state before
    metrics_after JSONB, -- Snapshot of state after
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.brain_decision_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read outcomes" ON public.brain_decision_outcomes FOR SELECT USING (true);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase28_social.sql */
/* ============================================================================ */

-- Phase 28: Social Graph Intelligence

-- 1. Nodes (Player Social Metrics)
CREATE TABLE IF NOT EXISTS public.social_nodes (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    influence_score FLOAT DEFAULT 0.0, -- Centrality metric
    cluster_id TEXT, -- Detected Community ID
    toxicity_score FLOAT DEFAULT 0.0, -- Aggregated form
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Edges (Relationships)
CREATE TABLE IF NOT EXISTS public.social_edges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id UUID REFERENCES public.player_profiles(id),
    target_id UUID REFERENCES public.player_profiles(id),
    weight FLOAT DEFAULT 1.0, -- Strength of connection
    interaction_type TEXT, -- FRIEND, RIVAL, TEAMMATE
    last_interaction TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE public.social_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nodes" ON public.social_nodes FOR SELECT USING (true);
CREATE POLICY "Public read edges" ON public.social_edges FOR SELECT USING (true);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase29_optimization.sql */
/* ============================================================================ */

-- Phase 29: Global Platform Optimization

-- 1. Platform Health Logs (The "Pulse" of the organism)
CREATE TABLE IF NOT EXISTS public.platform_health_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    retention_rate FLOAT, -- e.g. 0.85
    match_quality FLOAT, -- e.g. 0.92
    revenue_daily FLOAT, -- e.g. 500.00
    fairness_index FLOAT, -- e.g. 0.98 (1.0 = perfect fairness)
    
    total_score FLOAT, -- The "Objective Function" Result
    
    active_configs JSONB, -- Snapshot of global params at this time
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.platform_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read health" ON public.platform_health_logs FOR SELECT USING (true);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase32_policies.sql */
/* ============================================================================ */

-- Phase 32: Policy Engine (Real Brain Logic)

CREATE TABLE IF NOT EXISTS public.brain_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL, -- 'MATCHMAKING', 'ECONOMY', 'BEHAVIOR', 'META'
    title TEXT, -- Human readable name
    
    condition JSONB NOT NULL, 
    -- e.g. { "metric": "tilt_probability", "operator": ">", "value": 0.7 }
    
    action JSONB NOT NULL,
    -- e.g. { "type": "ADJUST_MATCHMAKING", "params": { "opponent_difficulty": "EASY" } }
    
    weight FLOAT DEFAULT 1.0, -- Priority
    confidence FLOAT DEFAULT 1.0, -- AI Confidence in this policy
    
    is_active BOOLEAN DEFAULT TRUE,
    is_generated BOOLEAN DEFAULT FALSE, -- Phase 33: Self-generated?
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.brain_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read policies" ON public.brain_policies FOR SELECT USING (true);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase38_anticheat.sql */
/* ============================================================================ */

-- Phase 38: AI Anti-Cheat System

CREATE TYPE cheat_status AS ENUM ('CLEAN', 'MONITORING', 'SHADOW_QUEUE', 'BANNED');

CREATE TABLE IF NOT EXISTS public.brain_cheat_scores (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    cheat_probability FLOAT DEFAULT 0.0, -- 0.0 to 1.0
    status cheat_status DEFAULT 'CLEAN',
    flagged_reason TEXT, -- e.g. "Impossible Reaction Time"
    last_flagged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.brain_cheat_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id),
    match_id TEXT,
    evidence JSONB, -- { "apm": 600, "cursor_jumps": true }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brain_cheat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_cheat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cheat scores" ON public.brain_cheat_scores FOR SELECT USING (true);



/* ============================================================================ */
/* SOURCE: C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\phase41_creator_system.sql */
/* ============================================================================ */

-- Phase 41: Creator System & Economy

CREATE TYPE creator_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PARTNER');

CREATE TABLE IF NOT EXISTS public.creators (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    creator_code TEXT UNIQUE NOT NULL, -- e.g. "NINJA"
    display_name TEXT NOT NULL,
    status creator_status DEFAULT 'PENDING',
    
    follower_count INT DEFAULT 0,
    total_earnings_usd FLOAT DEFAULT 0.0,
    pending_payout_usd FLOAT DEFAULT 0.0,
    
    revenue_share_pct FLOAT DEFAULT 0.05, -- 5% share
    
    social_links JSONB DEFAULT '{}', -- { "twitch": "...", "youtube": "..." }
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_supporters (
    supporter_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    creator_id UUID REFERENCES public.creators(user_id),
    supported_since TIMESTAMPTZ DEFAULT NOW(),
    last_contribution_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.creator_earnings_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES public.creators(user_id),
    source_user_id UUID REFERENCES public.player_profiles(id),
    amount_usd FLOAT NOT NULL,
    description TEXT, -- "Skin Purchase: Dragon AK"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_earnings_log ENABLE ROW LEVEL SECURITY;

-- Public can read creators to check codes
CREATE POLICY "Public read creators" ON public.creators FOR SELECT USING (true);
