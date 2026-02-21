import OptimizedCloudBrowserManager from './OptimizedCloudBrowserManager.js';
import logger from '../logger.js';

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

    // Create browser manager
    const browserManager = new OptimizedCloudBrowserManager(sessionId, options);
    await browserManager.initialize();

    // Track session
    this.activeSessions.set(sessionId, browserManager);
    userSessionSet.add(sessionId);
    this.userSessions.set(userId, userSessionSet);
    this.metrics.totalSessionsCreated++;

    logger.info(`[Pool] Session ${sessionId} created for user ${userId}. Active: ${this.activeSessions.size}`);

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

    await browserManager.cleanup();
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
      cleanupPromises.push(manager.cleanup());
    }

    await Promise.all(cleanupPromises);
    this.activeSessions.clear();
    this.userSessions.clear();
    logger.info('[Pool] All sessions closed');
  }
}

export default BrowserPool;
