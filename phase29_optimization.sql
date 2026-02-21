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
