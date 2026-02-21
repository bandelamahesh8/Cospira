-- Phase 28: Social Graph Intelligence

-- 1. Nodes (Player Social Metrics)
CREATE TABLE IF NOT EXISTS public.social_nodes (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    influence_score FLOAT DEFAULT 0.0, -- Centrality metric
    cluster_id TEXT, -- Detected Community ID
    toxicity_score FLOAT DEFAULT 0.0, -- Aggregated form
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Edges (Relationships)
CREATE TABLE IF NOT EXISTS public.social_edges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id UUID REFERENCES public.player_profiles(id),
    target_id UUID REFERENCES public.player_profiles(id),
    weight FLOAT DEFAULT 1.0, -- Strength of connection
    interaction_type TEXT, -- FRIEND, RIVAL, TEAMMATE
    last_interaction TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE public.social_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nodes" ON public.social_nodes FOR SELECT USING (true);
CREATE POLICY "Public read edges" ON public.social_edges FOR SELECT USING (true);
