import { supabase } from '@/integrations/supabase/client';
import { FriendProfile, Friendship, FriendshipStatus } from '@/types/social';
import { PlayerProfile } from '@/types/player';

export class SocialService {
  
  // Send Friend Request
  static async sendFriendRequest(targetId: string): Promise<{ error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Check existing
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${user.id})`)
      .single();

    if (existing) {
        if (existing.status === 'pending') return { error: 'Request already pending' };
        if (existing.status === 'accepted') return { error: 'Already friends' };
        if (existing.status === 'blocked') return { error: 'Cannot add this user' };
    }

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id, // requester
        friend_id: targetId,
        status: 'pending'
      });

    if (error) return { error: error.message };
    return {};
  }

  // Accept/Reject Request
  // Note: We need to know the ID of the friendship, OR look it up by friendId
  static async respondToRequest(requesterId: string, accept: boolean): Promise<{ error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Find the request where I am the friend_id
    const { data: request, error: findError } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', requesterId)
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .single();
    
    if (findError || !request) return { error: 'Request not found' };

    if (accept) {
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted', updated_at: new Date() })
            .eq('id', request.id);
        return { error: error?.message };
    } else {
        // Delete or Block? Simple reject = delete
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', request.id);
        return { error: error?.message };
    }
  }

  // Get Friends List (Accepted)
  // This is complex because "friend" could be in user_id OR friend_id column
  static async getFriends(): Promise<FriendProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch all accepted friendships involving me
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        user_profile:user_id(id, username, avatar_url, is_online, last_seen),
        friend_profile:friend_id(id, username, avatar_url, is_online, last_seen)
      `)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error || !data) return [];

    return data.map((f: any) => {
        // Determine which profile is the "other" person
        const isMeSender = f.user_id === user.id;
        const profile = isMeSender ? f.friend_profile : f.user_profile;
        
        // Handle case where profile might be null (deleted user)
        if (!profile) return null;

        return {
            id: profile.id,
            username: profile.username,
            avatarUrl: profile.avatar_url,
            isOnline: profile.is_online, // Needs realtime sub to really work
            lastSeen: profile.last_seen,
            status: 'accepted'
        };
    }).filter(Boolean) as FriendProfile[];
  }

  // Get Pending Requests (Incoming)
  static async getIncomingRequests(): Promise<FriendProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('friendships')
        .select(`
            id,
            user_id, 
            created_at,
            requester:user_id(id, username, avatar_url)
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending');

    if (error || !data) return [];

    return data.map((f: any) => ({
        id: f.requester.id,
        username: f.requester.username,
        avatarUrl: f.requester.avatar_url,
        isOnline: false,
        status: 'pending'
    }));
  }

  // Search Users
  static async searchUsers(query: string): Promise<Partial<PlayerProfile>[]> {
      const { data } = await supabase
        .from('player_profiles')
        .select('id, username, avatar_url, level')
        .ilike('username', `%${query}%`)
        .limit(10);
      return data || [];
  }
}
