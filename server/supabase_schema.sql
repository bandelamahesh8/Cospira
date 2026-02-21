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

-- 8. Friend Requests
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','cancelled')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user
  ON friend_requests(to_user_id, status);

-- 9. Friends
CREATE TABLE IF NOT EXISTS friends (
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_friend_id
  ON friends(friend_id);

