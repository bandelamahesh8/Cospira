import { roomEventBus, ChatMessagePayload } from '../EventBus';

/**
 * ModeratorAI
 * Handles toxicity detection, conflict escalation,
 * speaker dominance, and silence detection.
 */
export class ModeratorAI {
  private static instance: ModeratorAI;
  private aggressionBuffer: Map<string, Array<{ userId: string; timestamp: number }>> = new Map();
  private speakerActivity: Map<string, Map<string, number>> = new Map(); // breakoutId -> (userId -> hitCount)
  private lastUserActivity: Map<string, Map<string, number>> = new Map(); // breakoutId -> (userId -> timestamp)

  private readonly SPIKE_WINDOW_MS = 60000;
  private readonly SPIKE_THRESHOLD = 3;
  private readonly ANALYSIS_INTERVAL_MS = 30000;
  private readonly SILENCE_THRESHOLD_MS = 300000; // 5 minutes without speaking

  private readonly TOXIC_LEVELS: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
    hate: 'HIGH',
    stupid: 'LOW',
    idiot: 'LOW',
    stop: 'MEDIUM',
    'shut up': 'HIGH',
    useless: 'MEDIUM',
    waste: 'LOW',
    'get out': 'HIGH',
    forbidden: 'HIGH',
  };

  private constructor() {
    setInterval(() => this.analyzeSpeakerBalance(), this.ANALYSIS_INTERVAL_MS);
  }

  public static getInstance(): ModeratorAI {
    if (!ModeratorAI.instance) ModeratorAI.instance = new ModeratorAI();
    return ModeratorAI.instance;
  }

  public evaluateMessage(payload: ChatMessagePayload) {
    const text = payload.text.toLowerCase();
    const { breakoutId, userId } = payload;

    // 1. Track Speaker Activity for Dominance Analysis
    const roomActivity = this.speakerActivity.get(breakoutId) || new Map();
    roomActivity.set(userId, (roomActivity.get(userId) || 0) + 1);
    this.speakerActivity.set(breakoutId, roomActivity);

    // Track Last Activity for Silence Detection
    const roomSilence = this.lastUserActivity.get(breakoutId) || new Map();
    roomSilence.set(userId, Date.now());
    this.lastUserActivity.set(breakoutId, roomSilence);

    // 2. Toxicity & Spike Detection
    const toxicTags = Object.keys(this.TOXIC_LEVELS);
    const matchedTag = toxicTags.find((tag) => text.includes(tag));

    if (matchedTag) {
      const intensity = this.TOXIC_LEVELS[matchedTag];
      const roomBuffer = this.aggressionBuffer.get(breakoutId) || [];
      const now = Date.now();

      const validBuffer = roomBuffer.filter(
        (entry) => now - entry.timestamp < this.SPIKE_WINDOW_MS
      );
      validBuffer.push({ userId, timestamp: now });
      this.aggressionBuffer.set(breakoutId, validBuffer);

      if (validBuffer.length >= this.SPIKE_THRESHOLD || intensity === 'HIGH') {
        roomEventBus.emit('EMOTIONAL_SPIKE', {
          breakoutId,
          intensity: intensity,
          primarySentiment: 'Aggressive/Distressed',
          triggeringUserIds: Array.from(new Set(validBuffer.map((b) => b.userId))),
          timestamp: now,
        });
        this.aggressionBuffer.set(breakoutId, []);
      }
    }
  }

  private analyzeSpeakerBalance() {
    this.speakerActivity.forEach((activity, breakoutId) => {
      const totalHits = Array.from(activity.values()).reduce((a, b) => a + b, 0);
      if (totalHits < 5) return; // Not enough data for insight

      const dominanceMap: Record<string, number> = {};
      let maxDominance = 0;
      let dominantUser = '';

      activity.forEach((hits, userId) => {
        const percentage = (hits / totalHits) * 100;
        dominanceMap[userId] = Math.round(percentage);
        if (percentage > maxDominance) {
          maxDominance = percentage;
          dominantUser = userId;
        }
      });

      const imbalanceDetected = maxDominance > 75; // Trigger if one user has >75%

      // Analyze Silent Users
      const roomSilence = this.lastUserActivity.get(breakoutId);
      const silentUsers: string[] = [];
      const now = Date.now();
      if (roomSilence) {
        roomSilence.forEach((lastActive, userId) => {
          if (now - lastActive > this.SILENCE_THRESHOLD_MS) {
            silentUsers.push(userId);
          }
        });
      }

      roomEventBus.emit('SPEAKER_ANALYSIS', {
        breakoutId,
        dominanceMap,
        imbalanceDetected,
        silentUsers,
        timestamp: Date.now(),
      });

      if (imbalanceDetected) {
        roomEventBus.emit('SYSTEM_ALERT', {
          level: 'warning',
          title: 'Conversation Imbalance',
          description: `User ${dominantUser.slice(0, 6)} is dominating ${Math.round(maxDominance)}% of the chat. Suggest Round-Table mode.`,
          breakoutId,
          timestamp: Date.now(),
        });
      }

      if (silentUsers.length > 0) {
        roomEventBus.emit('SYSTEM_ALERT', {
          level: 'info',
          title: 'Silent Participants Detected',
          description: `${silentUsers.length} user(s) have been quiet for over 5 minutes. Suggest inclusive prompt.`,
          breakoutId,
          timestamp: Date.now(),
        });
      }
    });
  }
}
