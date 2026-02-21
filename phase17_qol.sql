-- Phase 17: Quality of Life

-- 1. Add Settings to Profile
ALTER TABLE public.player_profiles
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{ "volume": 50, "theme": "system", "notifications": true, "streamer_mode": false }'::jsonb;

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'reward'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
