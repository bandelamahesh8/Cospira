-- Phase 18: Monetization & Store

-- 1. Add Premium Currency (Gems)
ALTER TABLE public.player_profiles
ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0;

-- 2. Store Items Catalog
CREATE TABLE IF NOT EXISTS public.store_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_coins INTEGER, -- Null if not buyable with coins
    price_gems INTEGER, -- Null if not buyable with gems
    category TEXT CHECK (category IN ('avatar', 'frame', 'boost', 'currency', 'bundle')),
    asset_id TEXT, -- Link to asset system
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions Log
CREATE TABLE IF NOT EXISTS public.store_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    item_id UUID REFERENCES public.store_items(id),
    currency TEXT CHECK (currency IN ('coins', 'gems', 'usd')),
    amount INTEGER NOT NULL, -- Price paid
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read items" ON public.store_items FOR SELECT USING (is_active = true);
CREATE POLICY "Users read own transactions" ON public.store_transactions FOR SELECT USING (auth.uid() = user_id);

-- 5. Seed Items
INSERT INTO public.store_items (name, description, price_coins, price_gems, category, asset_id) VALUES
('Starter Bundle', '500 Coins + 50 Gems', NULL, 50, 'bundle', 'bundle_starter'),
('Golden Frame', 'Premium golden profile border', NULL, 200, 'frame', 'frame_gold'),
('XP Boost (1h)', 'Double XP for 1 hour', 1000, 50, 'boost', 'boost_xp_1h'),
('Shadow Avatar', 'Rare shadow theme avatar', 5000, 300, 'avatar', 'avatar_shadow')
ON CONFLICT DO NOTHING;
