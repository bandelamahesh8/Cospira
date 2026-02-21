import { supabase } from '@/integrations/supabase/client';

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    price_coins: number | null;
    price_gems: number | null;
    category: 'avatar' | 'frame' | 'boost' | 'currency' | 'bundle';
    asset_id: string;
}

export class StoreService {

    static async getCatalog() {
        const { data, error } = await supabase
            .from('store_items')
            .select('*')
            .eq('is_active', true)
            .order('price_gems', { ascending: true });
        
        if (error) throw error;
        return data as StoreItem[];
    }

    static async purchaseItem(userId: string, item: StoreItem, currency: 'coins' | 'gems') {
        const price = currency === 'coins' ? item.price_coins : item.price_gems;
        if (price === null || price === undefined) throw new Error('Item not available in this currency');

        // 1. Get Current Balance & Inventory
        const { data: profile, error: profileError } = await supabase
            .from('player_profiles')
            .select('coins, gems, inventory')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        const balance = profile[currency] || 0;
        if (balance < price) throw new Error(`Insufficient ${currency}`);

        const currentInventory = profile.inventory || [];
        if (currentInventory.includes(item.id)) throw new Error('Item already owned');

        // 2. Perform Transaction (Update Profile)
        // Ideally this is a Postgres Transaction (RPC), doing it client-side for MVP speed but risky.
        const newBalance = balance - price;
        const newInventory = [...currentInventory, item.id];

        const { error: updateError } = await supabase
            .from('player_profiles')
            .update({ 
                [currency]: newBalance,
                inventory: newInventory
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 3. Log Transaction
        await supabase.from('store_transactions').insert({
            user_id: userId,
            item_id: item.id,
            currency,
            amount: price,
            status: 'completed'
        });

        return { success: true, newBalance };
    }
}
