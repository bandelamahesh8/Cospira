-- Phase 41: Creator System & Economy

CREATE TYPE creator_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PARTNER');

CREATE TABLE IF NOT EXISTS public.creators (
    user_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    creator_code TEXT UNIQUE NOT NULL, -- e.g. "NINJA"
    display_name TEXT NOT NULL,
    status creator_status DEFAULT 'PENDING',
    
    follower_count INT DEFAULT 0,
    total_earnings_usd FLOAT DEFAULT 0.0,
    pending_payout_usd FLOAT DEFAULT 0.0,
    
    revenue_share_pct FLOAT DEFAULT 0.05, -- 5% share
    
    social_links JSONB DEFAULT '{}', -- { "twitch": "...", "youtube": "..." }
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_supporters (
    supporter_id UUID REFERENCES public.player_profiles(id) PRIMARY KEY,
    creator_id UUID REFERENCES public.creators(user_id),
    supported_since TIMESTAMPTZ DEFAULT NOW(),
    last_contribution_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.creator_earnings_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES public.creators(user_id),
    source_user_id UUID REFERENCES public.player_profiles(id),
    amount_usd FLOAT NOT NULL,
    description TEXT, -- "Skin Purchase: Dragon AK"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_earnings_log ENABLE ROW LEVEL SECURITY;

-- Public can read creators to check codes
CREATE POLICY "Public read creators" ON public.creators FOR SELECT USING (true);
