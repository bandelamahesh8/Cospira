import { BreakoutSession, UserPresence } from '@/types/organization';
import { OrgMember } from '@/services/BreakoutService';

// Define the payload types for our structural events
export interface RoomStateChangePayload {
  breakoutId: string;
  parentBreakoutId?: string | null;
  status?: BreakoutSession['status'];
  hostId?: string;
  name?: string;
  mode?: string;
  hostDisconnected?: boolean;
}

export interface UserJoinPayload {
  breakoutId: string;
  userId: string;
  user?: Partial<UserPresence>;
  membersCount?: number;
}

export interface UserLeavePayload {
  breakoutId: string;
  userId: string;
  membersCount?: number;
}

export interface SystemAlertPayload {
  level: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  breakoutId?: string;
  timestamp: number;
}

export interface ChatMessagePayload {
  breakoutId: string;
  userId: string;
  text: string;
  timestamp: number;
}

export interface AutomationExecutedPayload {
  action: string;
  targetId: string;
  description: string;
  timestamp: number;
}

export interface RoomPauseResumePayload {
  breakoutId: string;
  status: 'PAUSED' | 'LIVE';
}

export interface EmotionalSpikePayload {
  breakoutId: string;
  intensity: 'LOW' | 'MEDIUM' | 'HIGH';
  primarySentiment: string;
  triggeringUserIds: string[];
  timestamp: number;
}

export interface RoomSuggestionPayload {
  breakoutId: string;
  type: 'CAPACITY' | 'ENGAGEMENT' | 'MERGE' | 'SPLIT';
  suggestion: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
}

export interface MeetingInsightPayload {
  breakoutId: string;
  type: 'TOPIC' | 'DECISION' | 'ACTION_ITEM';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface SpeakerAnalysisPayload {
  breakoutId: string;
  dominanceMap: Record<string, number>; // userId -> percentage
  imbalanceDetected: boolean;
  silentUsers: string[];
  timestamp: number;
}

// Map event names to their payloads
export interface BreakoutEventMap {
  ROOM_STATE_CHANGE: RoomStateChangePayload;
  USER_JOIN: UserJoinPayload;
  USER_LEAVE: UserLeavePayload;
  ROOM_PAUSE: RoomPauseResumePayload;
  ROOM_RESUME: RoomPauseResumePayload;
  ROOMS_REFRESHED: BreakoutSession[];
  MEMBERS_REFRESHED: OrgMember[];
  SYSTEM_ALERT: SystemAlertPayload;
  CHAT_MESSAGE: ChatMessagePayload;
  AUTOMATION_EXECUTED: AutomationExecutedPayload;
  EMOTIONAL_SPIKE: EmotionalSpikePayload;
  ROOM_SUGGESTION: RoomSuggestionPayload;
  MEETING_INSIGHT: MeetingInsightPayload;
  SPEAKER_ANALYSIS: SpeakerAnalysisPayload;
}

type BreakoutEventKey = keyof BreakoutEventMap;
type BreakoutEventListener<T extends BreakoutEventKey> = (payload: BreakoutEventMap[T]) => void;

class BreakoutEventBus {
  private listeners: {
    [K in BreakoutEventKey]?: Set<BreakoutEventListener<K>>;
  } = {};

  on<T extends BreakoutEventKey>(event: T, listener: BreakoutEventListener<T>) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set<BreakoutEventListener<T>>() as unknown as Set<
        BreakoutEventListener<BreakoutEventKey>
      >;
    }
    (this.listeners[event] as Set<BreakoutEventListener<T>>).add(listener);
  }

  off<T extends BreakoutEventKey>(event: T, listener: BreakoutEventListener<T>) {
    const listeners = this.listeners[event];
    if (listeners) {
      (listeners as Set<BreakoutEventListener<T>>).delete(listener);
    }
  }

  emit<T extends BreakoutEventKey>(event: T, payload: BreakoutEventMap[T]) {
    if (this.listeners[event]) {
      this.listeners[event]!.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[EventBus] Error in listener for event ${event}:`, err);
        }
      });
    }
  }
}

// Export a singleton instance
export const roomEventBus = new BreakoutEventBus();
