export type MeetingStatus = 'scheduled' | 'cancelled' | 'completed';

export interface ScheduledMeeting {
  id: string;
  organization_id: string;
  creator_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: MeetingStatus;
  created_at: string;
  // Optional: creator info if joined
  creator?: {
    display_name?: string;
    avatar_url?: string;
    email?: string;
  };
}

export interface CreateMeetingData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
}
