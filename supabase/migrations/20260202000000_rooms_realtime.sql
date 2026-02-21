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
