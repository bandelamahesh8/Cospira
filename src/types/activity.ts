/**
 * Activity Page Types
 *
 * Type definitions for the Activity page showing user's room history
 */

export type ActivityType =
  | 'room'
  | 'presentation'
  | 'game'
  | 'browser'
  | 'youtube'
  | 'screen'
  | 'session-group';

export type ActivityFilter = 'All' | 'Rooms' | 'Presentations' | 'Games' | 'Media' | 'Feedback';

export interface BaseActivity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  roomId?: string;
  roomName?: string;
}

export interface RoomActivity extends BaseActivity {
  type: 'room';
  title: string;
  subtitle: string;
  action: string;
  duration?: number; // minutes
  participants?: number;
  role: 'host' | 'participant' | 'co-host';
}

export interface PresentationActivity extends BaseActivity {
  type: 'presentation';
  title: string;
  action: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'video';
}

export interface GameActivity extends BaseActivity {
  type: 'game';
  title: string;
  action: string;
  gameName: string;
  opponent?: string;
}

export interface BrowserActivity extends BaseActivity {
  type: 'browser' | 'youtube' | 'screen';
  title: string;
  action: string;
  detail: string;
}

export interface SessionGroupActivity extends BaseActivity {
  type: 'session-group';
  title: string;
  activities: string[];
  duration: number;
  participants: number;
}

export type Activity =
  | RoomActivity
  | PresentationActivity
  | GameActivity
  | BrowserActivity
  | SessionGroupActivity;

/**
 * Backend session data structure (for future integration)
 */
export interface ActivitySession {
  session_id: string;
  started_at: string; // ISO timestamp
  ended_at: string | null;
  duration: number; // minutes
  role: 'host' | 'participant';
  activities_used: ('game' | 'browser' | 'pdf' | 'youtube' | 'screen')[];
  participants_count: number;
  room_id: string;
  room_name: string;
}
