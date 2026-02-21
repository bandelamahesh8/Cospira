import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from '@/types/player';

export interface ShopItem {
  id: string;
  name: string;
  type: 'frame' | 'title';
  price: number;
  asset: string; // CSS class (e.g., 'ring-4 ring-yellow-400')
}

export const SHOP_ITEMS: ShopItem[] = [
    { id: 'frame_gold', name: 'Golden Fame', type: 'frame', price: 500, asset: 'ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]' },
    { id: 'frame_fire', name: 'Inferno', type: 'frame', price: 1000, asset: 'ring-4 ring-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.8)] animate-pulse' },
    { id: 'frame_ice', name: 'Frostbite', type: 'frame', price: 750, asset: 'ring-4 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]' },
    { id: 'frame_void', name: 'Void Walker', type: 'frame', price: 2000, asset: 'ring-4 ring-purple-900 shadow-[0_0_30px_rgba(88,28,135,0.8)]' },
    { id: 'title_master', name: 'Title: Game Master', type: 'title', price: 5000, asset: 'Game Master' },
];

export class EconomyService {
    
    // Get Balance & Inventory
    // We assume inventory is stored in 'metadata' JSONB column or similar. 
    // If not, we'll just mock it or use local storage for this demo phase if DB schema isn't strict.
    // Actually, let's use the 'bio' field as a hacky JSON store if we strictly can't change DB, 
    // BUT we have 'metadata' in BaseGameEngine but not profiles.
    // Let's assume we can just update 'coins'. Inventory logic might need to be "optimistic" or stored in local storage for now to keep it zero-SQL-script dependency for *this* step.
    // WAIT: I gave the user a SQL script. I can ask them to add an 'inventory' column.
    // OR: I can just use LocalStorage for inventory for this phase 5 MVP. Simpler.
    
    static async purchaseItem(itemId: string, currentCoins: number): Promise<{ success: boolean; newBalance?: number; error?: string }> {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return { success: false, error: 'Item not found' };

        if (currentCoins < item.price) return { success: false, error: 'Insufficient funds' };

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const newBalance = currentCoins - item.price;

        // 1. Deduct Coins in DB
        const { error } = await supabase
            .from('player_profiles')
            .update({ coins: newBalance })
            .eq('id', user.id);

        if (error) return { success: false, error: error.message };

        // 2. Add to Local Inventory (MVP)
        // In real app: Insert into 'player_inventory' table.
        const inventory = JSON.parse(localStorage.getItem(`inventory_${user.id}`) || '[]');
        if (!inventory.includes(itemId)) {
            inventory.push(itemId);
            localStorage.setItem(`inventory_${user.id}`, JSON.stringify(inventory));
        }

        return { success: true, newBalance };
    }

    static getInventory(userId: string): string[] {
        return JSON.parse(localStorage.getItem(`inventory_${userId}`) || '[]');
    }

    static isOwned(userId: string, itemId: string): boolean {
        const inv = this.getInventory(userId);
        return inv.includes(itemId);
    }
}
