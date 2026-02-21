// File: src/services/ActivityTracker.ts
// Tracks user activity and metrics in real-time

import { logger } from '@/utils/logger';

export interface ActivityEvent {
    type: 'room-joined' | 'message-sent' | 'file-shared' | 'game-played' | 'video-call' | 'screen-shared';
    userId: string;
    roomId?: string;
    duration?: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface UserMetrics {
    totalRooms: number;
    totalMessages: number;
    totalFilesShared: number;
    totalGamesPlayed: number;
    totalScreenShares: number;
    totalVideoMinutes: number;
    lastActivityTime: number;
}

export class ActivityTracker {
    private socket: any;
    private userId: string | null = null;
    private metrics: UserMetrics = {
        totalRooms: 0,
        totalMessages: 0,
        totalFilesShared: 0,
        totalGamesPlayed: 0,
        totalScreenShares: 0,
        totalVideoMinutes: 0,
        lastActivityTime: 0,
    };

    private eventQueue: ActivityEvent[] = [];
    private flushInterval: NodeJS.Timeout | null = null;

    constructor(socket: any) {
        this.socket = socket;
    }

    /**
     * Initialize tracker for a user
     */
    initialize(userId: string) {
        this.userId = userId;
        logger.info('[ActivityTracker] Initialized for user:', userId);

        // Flush events every 30 seconds
        this.flushInterval = setInterval(() => {
            this.flushEvents();
        }, 30000);

        // Also flush on unload
        window.addEventListener('beforeunload', () => {
            this.flushEvents();
        });
    }

    /**
     * Track room joined event
     */
    trackRoomJoined(roomId: string) {
        if (!this.userId) return;
        this.addEvent({
            type: 'room-joined',
            userId: this.userId,
            roomId,
            timestamp: Date.now(),
        });
        this.metrics.totalRooms++;
        this.metrics.lastActivityTime = Date.now();
    }

    /**
     * Track message sent event
     */
    trackMessageSent(roomId: string) {
        if (!this.userId) return;
        this.addEvent({
            type: 'message-sent',
            userId: this.userId,
            roomId,
            timestamp: Date.now(),
        });
        this.metrics.totalMessages++;
        this.metrics.lastActivityTime = Date.now();
    }

    /**
     * Track file shared event
     */
    trackFileShared(roomId: string, fileName: string) {
        if (!this.userId) return;
        this.addEvent({
            type: 'file-shared',
            userId: this.userId,
            roomId,
            timestamp: Date.now(),
            metadata: { fileName },
        });
        this.metrics.totalFilesShared++;
        this.metrics.lastActivityTime = Date.now();
    }

    /**
     * Track game played event
     */
    trackGamePlayed(roomId: string, gameType: string, duration: number) {
        if (!this.userId) return;
        this.addEvent({
            type: 'game-played',
            userId: this.userId,
            roomId,
            duration,
            timestamp: Date.now(),
            metadata: { gameType },
        });
        this.metrics.totalGamesPlayed++;
        this.metrics.lastActivityTime = Date.now();
    }

    /**
     * Track screen sharing
     */
    trackScreenShared(roomId: string, duration: number) {
        if (!this.userId) return;
        this.addEvent({
            type: 'screen-shared',
            userId: this.userId,
            roomId,
            duration,
            timestamp: Date.now(),
        });
        this.metrics.totalScreenShares++;
        this.metrics.lastActivityTime = Date.now();
    }

    /**
     * Track video call duration
     */
    trackVideoCall(roomId: string, duration: number) {
        if (!this.userId) return;
        this.addEvent({
            type: 'video-call',
            userId: this.userId,
            roomId,
            duration,
            timestamp: Date.now(),
        });
        this.metrics.totalVideoMinutes += duration / 60; // Convert to minutes
        this.metrics.lastActivityTime = Date.now();
    }

    /**
     * Add event to queue
     */
    private addEvent(event: ActivityEvent) {
        this.eventQueue.push(event);
        logger.debug('[ActivityTracker] Event added:', event.type);

        // Flush if queue is getting large
        if (this.eventQueue.length >= 20) {
            this.flushEvents();
        }
    }

    /**
     * Flush events to server
     */
    private flushEvents() {
        if (this.eventQueue.length === 0) return;

        const events = [...this.eventQueue];
        this.eventQueue = [];

        this.socket?.emit('activity-batch', {
            userId: this.userId,
            events,
            metrics: this.metrics,
        });

        logger.debug('[ActivityTracker] Flushed events:', events.length);
    }

    /**
     * Get current metrics
     */
    getMetrics(): UserMetrics {
        return { ...this.metrics };
    }

    /**
     * Request metrics update from server
     */
    async fetchMetrics(): Promise<UserMetrics | null> {
        return new Promise((resolve) => {
            this.socket?.emit('get-user-metrics', { userId: this.userId }, (response: any) => {
                if (response?.success) {
                    this.metrics = response.metrics;
                    resolve(response.metrics);
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        // Final flush before cleanup
        this.flushEvents();

        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }

        this.eventQueue = [];
        logger.info('[ActivityTracker] Destroyed');
    }
}

// Singleton instance
let trackerInstance: ActivityTracker | null = null;

export const getActivityTracker = (socket?: any): ActivityTracker => {
    if (!trackerInstance && socket) {
        trackerInstance = new ActivityTracker(socket);
    }
    return trackerInstance || new ActivityTracker(null);
};
