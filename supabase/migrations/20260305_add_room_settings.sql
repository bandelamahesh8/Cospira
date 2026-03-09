ALTER TABLE breakout_sessions ADD COLUMN IF NOT EXISTS room_type text DEFAULT 'GENERAL';
ALTER TABLE breakout_sessions ADD COLUMN IF NOT EXISTS security_level text DEFAULT 'STANDARD';
