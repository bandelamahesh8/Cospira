import { supabase } from '@/integrations/supabase/client';
import { ScheduledMeeting, CreateMeetingData } from '@/types/meeting';
import { logger } from '@/utils/logger';

export class MeetingService {
  static async scheduleMeeting(
    orgId: string,
    data: CreateMeetingData,
    userId?: string
  ): Promise<ScheduledMeeting> {
    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      targetUserId = user.id;
    }

    const { data: meeting, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('scheduled_meetings' as any)
      .insert({
        organization_id: orgId,
        creator_id: targetUserId,
        title: data.title,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error scheduling meeting:', error);
      throw error;
    }

    return meeting as unknown as ScheduledMeeting;
  }

  static async getScheduledMeetings(orgId: string): Promise<ScheduledMeeting[]> {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('scheduled_meetings' as any)
      .select(
        `
                *,
                creator:creator_id (
                    raw_user_meta_data
                )
            `
      )
      .eq('organization_id', orgId)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    if (error) {
      logger.error('Error fetching meetings:', error);
      throw error;
    }

    return (data || []).map((row: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = row as any;
      return {
        ...m,
        creator: {
          display_name: m.creator?.raw_user_meta_data?.display_name,
          avatar_url: m.creator?.raw_user_meta_data?.avatar_url,
          email: m.creator?.raw_user_meta_data?.email,
        },
      };
    }) as ScheduledMeeting[];
  }

  static async cancelMeeting(meetingId: string): Promise<void> {
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('scheduled_meetings' as any)
      .update({ status: 'cancelled' })
      .eq('id', meetingId);

    if (error) {
      logger.error('Error cancelling meeting:', error);
      throw error;
    }
  }
}
