-- Phase 14: Behavior System

-- 1. Create Reports Table
CREATE TABLE IF NOT EXISTS public.player_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    reported_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('toxicity', 'cheating', 'afk', 'spam', 'other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can create reports
CREATE POLICY "Users can create reports" ON public.player_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Only admins should view/update (For MVP, we might leave this restricted or allow users to see their own sent reports)
CREATE POLICY "Users can view own sent reports" ON public.player_reports FOR SELECT USING (auth.uid() = reporter_id);

-- 3. Index for Analytics
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.player_reports(reported_id);
