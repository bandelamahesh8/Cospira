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
