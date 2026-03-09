import { supabase } from '@/integrations/supabase/client';

export interface RoomAnalytics {
  totalRoomsCreated: number;
  totalTimeSpentSeconds: number;
  ultraModeSessionsCount: number;
  ultraModeTimeSeconds: number;
  securityClearanceLevel: number;
  activeRoomsCount: number;
  totalParticipants: number;
}

export interface ActivityDataPoint {
  date: string;
  roomsCreated: number;
  timeSpent: number;
}

export class RoomAnalyticsService {
  static async getTotalRoomsCreated(userId: string): Promise<number> {
    try {
      // Query rooms table where user is the host
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count, error } = await (supabase as any)
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', userId);

      if (error) {
        // console.warn('Error fetching total rooms:', error);
        return 0;
      }

      return count || 0;
    } catch {
      // console.error('Exception in getTotalRoomsCreated:', err);
      return 0;
    }
  }
  static async getTotalTimeSpent(userId: string): Promise<number> {
    try {
      // Try to query room_sessions if it exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('room_sessions')
        .select('duration_seconds')
        .eq('user_id', userId);

      if (error) {
        // Table might not exist, return 0
        // console.warn('room_sessions table not found, returning 0');
        return 0;
      }

      if (!data || data.length === 0) return 0;

      // Sum all durations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalSeconds = data.reduce((sum: number, session: any) => {
        return sum + (session.duration_seconds || 0);
      }, 0);

      return totalSeconds;
    } catch {
      // console.error('Exception in getTotalTimeSpent:', err);
      return 0;
    }
  }

  static async getUltraModeSessions(userId: string): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count, error } = await (supabase as any)
        .from('room_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('room_mode', 'ultra');

      if (error) {
        // console.warn('Error fetching ultra sessions:', error);
        return 0;
      }

      return count || 0;
    } catch {
      // console.error('Exception in getUltraModeSessions:', err);
      return 0;
    }
  }

  /**
   * Get total time spent in Ultra Security mode (in seconds)
   */
  static async getUltraModeTime(userId: string): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('room_sessions')
        .select('duration_seconds')
        .eq('user_id', userId)
        .eq('room_mode', 'ultra');

      if (error) {
        // console.warn('Error fetching ultra time:', error);
        return 0;
      }

      if (!data || data.length === 0) return 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalSeconds = data.reduce((sum: number, session: any) => {
        return sum + (session.duration_seconds || 0);
      }, 0);

      return totalSeconds;
    } catch {
      // console.error('Exception in getUltraModeTime:', err);
      return 0;
    }
  }

  // ...

  static async getRecentActivity(userId: string, days: number = 7): Promise<ActivityDataPoint[]> {
    // ... (existing code omitted for brevity if unchanged, but for replace_file_content I need the full block or insert)
    // Since I'm using replace_file_content for a chunk, let's just Insert the method before getAllAnalytics
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('room_sessions')
        .select('created_at, duration_seconds')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error || !data) {
        // console.warn('Error fetching recent activity:', error);
        return [];
      }

      // Group by date
      const activityMap = new Map<string, { roomsCreated: number; timeSpent: number }>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.forEach((session: any) => {
        const date = new Date(session.created_at).toLocaleDateString();
        const existing = activityMap.get(date) || { roomsCreated: 0, timeSpent: 0 };

        activityMap.set(date, {
          roomsCreated: existing.roomsCreated + 1,
          timeSpent: existing.timeSpent + (session.duration_seconds || 0),
        });
      });

      // Convert to array
      return Array.from(activityMap.entries()).map(([date, stats]) => ({
        date,
        roomsCreated: stats.roomsCreated,
        timeSpent: stats.timeSpent,
      }));
    } catch {
      // console.error('Exception in getRecentActivity:', err);
      return [];
    }
  }

  /**
   * Calculate security clearance level (1-5) based on ultra mode usage
   */
  static async getSecurityClearanceLevel(userId: string): Promise<number> {
    try {
      const ultraSessions = await this.getUltraModeSessions(userId);
      // Basic logic: Level 1 = 0 sessions, Level 5 = 50+ sessions
      if (ultraSessions > 50) return 5;
      if (ultraSessions > 20) return 4;
      if (ultraSessions > 5) return 3;
      if (ultraSessions > 0) return 2;
      return 1;
    } catch {
      return 1;
    }
  }

  /**
   * Get all analytics data in one call
   */
  static async getAllAnalytics(userId: string): Promise<RoomAnalytics> {
    const [
      totalRoomsCreated,
      totalTimeSpentSeconds,
      ultraModeSessionsCount,
      ultraModeTimeSeconds,
      securityClearanceLevel,
    ] = await Promise.all([
      this.getTotalRoomsCreated(userId),
      this.getTotalTimeSpent(userId),
      this.getUltraModeSessions(userId),
      this.getUltraModeTime(userId),
      this.getSecurityClearanceLevel(userId),
    ]);

    return {
      totalRoomsCreated,
      totalTimeSpentSeconds,
      ultraModeSessionsCount,
      ultraModeTimeSeconds,
      securityClearanceLevel,
      activeRoomsCount: 0, // Will be populated from WebSocket
      totalParticipants: 0, // Will be populated from WebSocket
    };
  }

  /**
   * Format seconds to human-readable time (e.g., "12h 40m")
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }
}
