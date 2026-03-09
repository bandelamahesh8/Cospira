import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from '@/types/player';

export interface FriendProfile extends Partial<PlayerProfile> {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline: boolean;
  status?: 'pending' | 'accepted' | 'none';
}

export class SocialService {
  /**
   * Send a friend request
   */
  async sendFriendRequest(friendId: string): Promise<{ error: string | null }> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { error: 'Not authenticated' };

    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('friendships' as any)
      .insert({
        user_id: user.user.id,
        friend_id: friendId,
        status: 'pending',
      });

    if (error) {
      console.error('Error sending friend request:', error);
      return { error: error.message };
    }

    return { error: null };
  }

  /**
   * Accept or decline a friend request
   */
  async respondToFriendRequest(
    requesterId: string,
    accept: boolean
  ): Promise<{ error: string | null }> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { error: 'Not authenticated' };

    // Find the request where I am the friend_id
    const { data: request, error: findError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('friendships' as any)
      .select('id')
      .eq('user_id', requesterId)
      .eq('friend_id', user.user.id)
      .eq('status', 'pending')
      .single();

    if (findError || !request) return { error: 'Request not found' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestId = (request as any).id;

    if (accept) {
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('friendships' as any)
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('friendships' as any)
        .delete()
        .eq('id', requestId);

      if (error) return { error: error.message };
    }

    return { error: null };
  }

  /**
   * Get list of friends
   */
  async getFriends(): Promise<FriendProfile[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('friendships' as any)
      .select(
        `
        id,
        user_id,
        friend_id,
        status,
        friend_profile:player_profiles!friendships_friend_id_fkey(id, username, avatar_url, is_online, updated_at),
        user_profile:player_profiles!friendships_user_id_fkey(id, username, avatar_url, is_online, updated_at)
      `
      )
      .or(`user_id.eq.${user.user.id},friend_id.eq.${user.user.id}`)
      .eq('status', 'accepted');

    if (error || !data) return [];

    return (data as unknown[]).map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = row as any;

      const isMeSender = f.user_id === user.user?.id;
      const profile = isMeSender ? f.friend_profile : f.user_profile;

      return {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar_url || undefined,
        isOnline: profile.is_online,
        lastSeen: new Date(profile.updated_at),
        status: 'accepted',
      } as FriendProfile;
    });
  }

  /**
   * Get pending requests
   */
  async getPendingRequests(): Promise<FriendProfile[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('friendships' as any)
      .select(
        `
        id,
        requester:player_profiles!friendships_user_id_fkey(id, username, avatar_url)
      `
      )
      .eq('friend_id', user.user.id)
      .eq('status', 'pending');

    if (error || !data) return [];

    return (data as unknown[]).map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = row as any;
      return {
        id: f.requester.id,
        username: f.requester.username,
        avatarUrl: f.requester.avatar_url || undefined,
        isOnline: false,
        status: 'pending',
      } as FriendProfile;
    });
  }

  /**
   * Search Users
   */
  async searchUsers(query: string): Promise<Partial<PlayerProfile>[]> {
    const { data } = await supabase
      .from('player_profiles')
      .select('id, username, avatar_url, level')
      .ilike('username', `%${query}%`)
      .limit(10);
    return (data || []) as Partial<PlayerProfile>[];
  }
}

export const socialService = new SocialService();
