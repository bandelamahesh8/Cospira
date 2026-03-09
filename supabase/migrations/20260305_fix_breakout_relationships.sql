-- Supabase Schema Repair Migration
-- Fixes PGRST200 errors by adding required foreign key hints for PostgREST joins

-- 1. Fix breakout_sessions self-relationship for hierarchical queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakout_sessions' AND column_name='parent_breakout_id') THEN
        ALTER TABLE public.breakout_sessions 
        ADD COLUMN parent_breakout_id UUID REFERENCES public.breakout_sessions(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added parent_breakout_id to breakout_sessions';
    END IF;
END $$;

-- 2. Ensure breakout_sessions indices for performance
CREATE INDEX IF NOT EXISTS idx_breakout_sessions_parent ON public.breakout_sessions(parent_breakout_id);
CREATE INDEX IF NOT EXISTS idx_breakout_participants_user ON public.breakout_participants(user_id);
