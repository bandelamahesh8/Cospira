import WebRTCBrowserManager from './WebRTCBrowserManager.js';
import logger from '../shared/logger.js';

class BrowserPool {
  constructor(options = {}) {
    this.maxConcurrentSessions = options.maxConcurrentSessions || 100;
    this.maxSessionsPerUser = options.maxSessionsPerUser || 2;
    this.activeSessions = new Map(); // sessionId -> BrowserManager
    this.userSessions = new Map(); // userId -> Set<sessionId>
    this.rateLimiter = new Map(); // userId -> { count, resetTime }
    this.queue = [];
    
    this.config = {
      rateLimit: {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      },
      ...options
    };

    // Metrics
    this.metrics = {
      totalSessionsCreated: 0,
      totalSessionsClosed: 0,
      rejectedDueToLimit: 0,
      rejectedDueToRate: 0,
    };

    this.startMetricsReporting();
  }

  // Rate limiting
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.rateLimiter.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimiter.set(userId, {
        count: 1,
        resetTime: now + this.config.rateLimit.windowMs,
      });
      return true;
    }

    if (userLimit.count >= this.config.rateLimit.maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  // Create new browser session
  // Note: We modified this to integrate Universal WebRTC Manager
  async createSession(userId, sessionId, options = {}) {
    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      this.metrics.rejectedDueToRate++;
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Check concurrent session limit
    if (this.activeSessions.size >= this.maxConcurrentSessions) {
      this.metrics.rejectedDueToLimit++;
      throw new Error('Server at capacity. Please try again later.');
    }

    // Check per-user session limit
    const userSessionSet = this.userSessions.get(userId) || new Set();
    if (userSessionSet.size >= this.maxSessionsPerUser) {
      throw new Error(`Maximum ${this.maxSessionsPerUser} sessions per user.`);
    }

    // Pass global io and sfuHandler from options if available, else they will be attached later
    const browserManager = new WebRTCBrowserManager(options.io || global.io, options.sfuHandler || global.sfuHandler);
    
    // WebRTCBrowserManager startSession logic happens in browser.socket.js
    // This just allocates the instance to the pool.
    
    // Track session
    this.activeSessions.set(sessionId, browserManager);
    userSessionSet.add(sessionId);
    this.userSessions.set(userId, userSessionSet);
    this.metrics.totalSessionsCreated++;

    logger.info(`[Pool] Session ${sessionId} created for user ${userId}. Active: ${this.activeSessions.size}`);

    // Return the uninitialized manager, it will be started by the caller
    return browserManager;
  }

  // Get existing session
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  // Close session
  async closeSession(userId, sessionId) {
    const browserManager = this.activeSessions.get(sessionId);
    if (!browserManager) return;

    await browserManager.cleanupSession(sessionId);
    this.activeSessions.delete(sessionId);

    const userSessionSet = this.userSessions.get(userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(userId);
      }
    }

    this.metrics.totalSessionsClosed++;
    logger.info(`[Pool] Session ${sessionId} closed. Active: ${this.activeSessions.size}`);
  }

  // Get pool statistics
  getMetrics() {
    return {
      ...this.metrics,
      activeSessions: this.activeSessions.size,
      activeUsers: this.userSessions.size,
      queuedRequests: this.queue.length,
      utilizationPercent: (this.activeSessions.size / this.maxConcurrentSessions) * 100,
    };
  }

  // Periodic metrics reporting
  startMetricsReporting() {
    setInterval(() => {
      const metrics = this.getMetrics();
      // Only log if there's activity
      if (metrics.activeSessions > 0) {
          logger.debug(`[Pool Metrics] ${JSON.stringify(metrics)}`);
      }
      
      // Alert if near capacity
      if (metrics.utilizationPercent > 80) {
        logger.warn(`[Pool] WARNING: ${metrics.utilizationPercent.toFixed(1)}% capacity`);
      }
    }, 60000); // Check every minute
  }

  // Cleanup all sessions
  async cleanup() {
    logger.info('[Pool] Shutting down all sessions...');
    const cleanupPromises = [];
    
    for (const [sessionId, manager] of this.activeSessions) {
      cleanupPromises.push(manager.cleanupSession(sessionId));
    }

    await Promise.all(cleanupPromises);
    this.activeSessions.clear();
    this.userSessions.clear();
    logger.info('[Pool] All sessions closed');
  }
}

export default BrowserPool;
