import { supabase } from '@/integrations/supabase/client';

export interface CreatorProfile {
  user_id: string;
  creator_code: string;
  display_name: string;
  status: 'PENDING' | 'APPROVED' | 'PARTNER';
  follower_count: number;
  total_earnings_usd: number;
  revenue_share_pct: number;
}

export class CreatorService {
  /**
   * Apply to become a creator.
   */
  static async apply(userId: string, code: string, displayName: string) {
    const { data, error } = await supabase
      .from('creators')
      .insert({
        user_id: userId,
        creator_code: code.toUpperCase(),
        display_name: displayName,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    return data as CreatorProfile;
  }

  /**
   * Users select a creator to support.
   */
  static async supportCreator(userId: string, code: string) {
    // 1. Find creator
    const { data: creator } = await supabase
      .from('creators')
      .select('user_id')
      .eq('creator_code', code.toUpperCase())
      .single();

    if (!creator) throw new Error('Invalid Creator Code');

    // 2. Set support
    const { error } = await supabase.from('creator_supporters').upsert({
      supporter_id: userId,
      creator_id: creator.user_id,
      supported_since: new Date().toISOString(),
    });

    if (error) throw error;

    // 3. Increment follower count (simplified)
    await supabase.rpc('increment_creator_follower', { c_id: creator.user_id });

    return true;
  }

  /**
   * Get Creator Dashboard Data
   */
  static async getDashboard(userId: string) {
    const { data: profile } = await supabase
      .from('creators')
      .select('*')
      .eq('user_id', userId)
      .single();

    return profile as CreatorProfile | null;
  }

  /**
   * Called when a user spends money.
   * Calculates revenue share.
   */
  static async attributePurchase(userId: string, amountUsd: number) {
    // 1. Check if user supports anyone
    const { data: support } = await supabase
      .from('creator_supporters')
      .select('creator_id')
      .eq('supporter_id', userId)
      .single();

    if (!support) return;

    // 2. Get Creator Share %
    const { data: creator } = await supabase
      .from('creators')
      .select('revenue_share_pct')
      .eq('user_id', support.creator_id)
      .single();

    if (!creator) return;

    const earnings = amountUsd * creator.revenue_share_pct;

    // 3. Log Earnings
    await supabase.from('creator_earnings_log').insert({
      creator_id: support.creator_id,
      source_user_id: userId,
      amount_usd: earnings,
      description: 'Item Purchase Commission',
    });

    // 4. Update Balance
    // (Ideally use RPC for atomic increment)
  }
}
