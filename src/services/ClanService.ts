import { supabase } from '@/integrations/supabase/client';

export interface Clan {
  id: string;
  name: string;
  tag: string;
  owner_id: string;
  description: string; // Fixed: was description?
  level: number;
  xp: number;
  member_count?: number;
}

export interface ClanMember {
  user_id: string;
  clan_id: string;
  role: 'leader' | 'elder' | 'member';
  joined_at: string;
  profile?: {
    username: string;
    avatar_url: string;
  };
}

export class ClanService {
  static async createClan(name: string, tag: string, description: string, userId: string) {
    // 1. Create Clan
    const { data: clan, error: clanError } = await supabase
      .from('clans')
      .insert({
        name,
        tag,
        description,
        owner_id: userId,
      })
      .select()
      .single();

    if (clanError) throw clanError;

    // 2. Add creator as Leader
    const { error: memberError } = await supabase.from('clan_members').insert({
      clan_id: clan.id,
      user_id: userId,
      role: 'leader',
    });

    if (memberError) {
      // Rollback (delete clan) if member insert fails - naive transaction
      await supabase.from('clans').delete().eq('id', clan.id);
      throw memberError;
    }

    return clan;
  }

  static async joinClan(clanId: string, userId: string) {
    // Check if already in a clan? (Ideally yes, business logic)
    // For MVP, assume UI checks or DB constraint (user_id unique in clan_members? No, user can be in one clan usually)
    // We need a unique constraint on user_id in clan_members if we want to enforce single clan.
    // For now, let's just insert.

    const { error } = await supabase.from('clan_members').insert({
      clan_id: clanId,
      user_id: userId,
      role: 'member',
    });

    if (error) throw error;
  }

  static async leaveClan(clanId: string, userId: string) {
    const { error } = await supabase
      .from('clan_members')
      .delete()
      .eq('clan_id', clanId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  static async getClan(clanId: string) {
    const { data: clan, error } = await supabase
      .from('clans')
      .select('*')
      .eq('id', clanId)
      .single();

    if (error) return null;

    // Get members
    const { data: members } = await supabase
      .from('clan_members')
      .select('*, profile:player_profiles(username, avatar_url)')
      .eq('clan_id', clanId);

    return { ...clan, members: members || [] };
  }

  static async getAllClans() {
    const { data, error } = await supabase
      .from('clans')
      .select('*') // member_count requires a subquery or separate count, for now just list details
      .order('level', { ascending: false })
      .limit(50);

    if (error) return [];
    return data;
  }

  static async getUserClan(userId: string) {
    const { data, error } = await supabase
      .from('clan_members')
      .select('clan:clans(*)')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.clan;
  }
}
