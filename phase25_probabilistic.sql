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
