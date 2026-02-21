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
