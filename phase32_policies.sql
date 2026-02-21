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
