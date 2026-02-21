/**
 * Analytics Service
 * Centralizes all event logging, screen tracking, and user identification.
 * Currently mocks backend calls with console output.
 */

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.userId = null;
  }

  initialize() {
    if (this.initialized) return;
    console.log('[Analytics] Service Initialized');
    this.initialized = true;
  }

  /**
   * Identifies the current user for subsequent events.
   * @param {string} userId - Unique user identifier
   * @param {object} traits - User properties (role, rank, etc.)
   */
  setUser(userId, traits = {}) {
    this.userId = userId;
    console.log(`[Analytics] User Identified: ${userId}`, traits);
  }

  /**
   * Logs a specific user action or system event.
   * @param {string} eventName - Name of the event (e.g., 'room_joined')
   * @param {object} params - Additional context
   */
  logEvent(eventName, params = {}) {
    if (!this.initialized) this.initialize();
    
    // timestamp added automatically
    const payload = {
      event: eventName,
      user: this.userId,
      timestamp: new Date().toISOString(),
      ...params
    };
    
    console.log(`[Analytics] Event: ${eventName}`, payload);
    // TODO: Send to backend API
    // api.post('/analytics/events', payload);
  }

  /**
   * Tracks a screen view.
   * @param {string} screenName - Name of the screen
   */
  logScreen(screenName) {
    if (!this.initialized) this.initialize();
    console.log(`[Analytics] Screen View: ${screenName}`);
    this.logEvent('screen_view', { screen_name: screenName });
  }

  /**
   * Log system errors or exceptions.
   * @param {string} error - Error message
   * @param {boolean} fatal - Is it a crash?
   */
  logError(error, fatal = false) {
    console.warn(`[Analytics] Error: ${error} (Fatal: ${fatal})`);
    this.logEvent('app_exception', { description: error, fatal });
  }
}

export const analytics = new AnalyticsService();
