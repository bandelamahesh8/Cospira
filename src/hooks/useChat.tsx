import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name?: string;
  } | null;
}

export const useChat = (roomId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, profiles!messages_user_id_fkey_profiles(display_name)')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages((data as Message[]) || []);
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error('Error fetching messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data, error } = await supabase
            .from('messages')
            .select('*, profiles!messages_user_id_fkey_profiles(display_name)')
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            setMessages((prev) => [...prev, data as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        user_id: user.id,
        content: content.trim(),
      });

      if (error) throw error;
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  return {
    messages,
    loading,
    sendMessage,
  };
};
