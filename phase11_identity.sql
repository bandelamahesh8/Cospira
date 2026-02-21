-- Phase 11: Player Identity Economy

-- 1. Create Assets Catalog
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('avatar', 'frame', 'banner', 'voice', 'effect')),
    name TEXT NOT NULL,
    description TEXT,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    image_url TEXT NOT NULL,
    price_coins INTEGER DEFAULT 0,
    is_purchasable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create User Inventory
CREATE TABLE IF NOT EXISTS public.user_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    asset_id UUID REFERENCES public.assets(id) NOT NULL,
    obtained_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, asset_id)
);

-- 3. Update Player Profiles
ALTER TABLE public.player_profiles
ADD COLUMN IF NOT EXISTS equipped_avatar_id UUID REFERENCES public.assets(id),
ADD COLUMN IF NOT EXISTS equipped_frame_id UUID REFERENCES public.assets(id),
ADD COLUMN IF NOT EXISTS equipped_banner_id UUID REFERENCES public.assets(id);

-- 4. RLS Policies

-- Assets: Everyone can see what's available
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read assets" ON public.assets FOR SELECT USING (true);

-- User Assets: Everyone can maybe see inventory? Or just own?
-- Let's say public read (to inspect profiles), Owner insert (via purchase logic potentially, or system)
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read user assets" ON public.user_assets FOR SELECT USING (true);
CREATE POLICY "User insert own asset" ON public.user_assets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Seed Initial Data
INSERT INTO public.assets (type, name, description, rarity, price_coins, image_url) VALUES
('avatar', 'Cyber Samurai', 'A warrior from the neon future.', 'epic', 500, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Samurai'),
('avatar', 'Void Walker', 'Shadows stand still.', 'legendary', 1000, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Void'),
('frame', 'Gold Border', 'Classic luxury.', 'rare', 200, 'border-yellow-500'),
('frame', 'Neon Pulse', 'Vibrant energy.', 'epic', 450, 'border-cyan-500 shadow-[0_0_15px_cyan]'),
('banner', 'Cosmic Dust', 'Starry background.', 'rare', 300, 'bg-slate-900')
ON CONFLICT DO NOTHING;
