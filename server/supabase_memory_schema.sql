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
