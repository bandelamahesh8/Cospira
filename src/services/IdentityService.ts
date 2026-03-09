import { supabase } from '@/integrations/supabase/client';

export interface Asset {
  id: string;
  type: 'avatar' | 'frame' | 'banner' | 'voice' | 'effect';
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  image_url: string;
  price_coins: number;
  is_purchasable: boolean;
}

export class IdentityService {
  static async getShopAssets() {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('is_purchasable', true)
      .order('price_coins', { ascending: true });

    if (error) throw error;
    return data as Asset[];
  }

  static async getInventory(userId: string) {
    const { data, error } = await supabase
      .from('user_assets')
      .select('*, asset:assets(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data.map((item: unknown) => (item as { asset: Asset }).asset) as Asset[];
  }

  static async purchaseAsset(userId: string, assetId: string, price: number) {
    // 1. Check balance (Client side check, server triggers/RLS should enforce constraints reliably)
    // For MVP, straightforward sequence:

    // Decrement Coins
    // Ideally RPC for atomicity
    const { data: profile, error: profileError } = await supabase
      .from('player_profiles')
      .select('coins')
      .eq('id', userId)
      .single();

    if (profileError || !profile) throw new Error('User not found');
    if (profile.coins < price) throw new Error('Insufficient funds');

    const { error: updateError } = await supabase
      .from('player_profiles')
      .update({ coins: profile.coins - price })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Add to Inventory
    const { error: inventoryError } = await supabase
      .from('user_assets')
      .insert({ user_id: userId, asset_id: assetId });

    if (inventoryError) {
      // Critical: Refund if fail (naive rollback)
      await supabase.from('player_profiles').update({ coins: profile.coins }).eq('id', userId);
      throw inventoryError;
    }

    return true;
  }

  static async equipAsset(userId: string, assetId: string, type: string) {
    // type: 'avatar', 'frame', 'banner'
    const column = `equipped_${type}_id`;

    const { error } = await supabase
      .from('player_profiles')
      .update({ [column]: assetId })
      .eq('id', userId);

    if (error) throw error;
  }
}
