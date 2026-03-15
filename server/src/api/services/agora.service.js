import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;

/**
 * Agora Service - Token Generation for Video/Audio Calls
 */
class AgoraService {
  constructor() {
    this.appId = process.env.AGORA_APP_ID || '';
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE || '';
    
    if (!this.appId || !this.appCertificate) {
      console.warn('[AgoraService] Warning: AGORA_APP_ID or AGORA_APP_CERTIFICATE not set in environment variables');
      console.warn('[AgoraService] Please set these in your .env file to enable video calling');
    }
  }

  /**
   * Generate RTC token for joining a channel
   * @param {string} channelName - The channel/room name
   * @param {number} uid - User ID (0 for auto-assign)
   * @param {string} role - 'publisher' or 'subscriber'
   * @param {number} expirationTimeInSeconds - Token expiration (default: 3600 = 1 hour)
   * @returns {string} - Agora RTC token
   */
  generateRtcToken(channelName, uid = 0, role = 'publisher', expirationTimeInSeconds = 3600) {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    const roleType = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    try {
      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channelName,
        uid,
        roleType,
        privilegeExpiredTs
      );
      
      console.log(`[AgoraService] Generated token for channel: ${channelName}, uid: ${uid}, role: ${role}`);
      return token;
    } catch (error) {
      console.error('[AgoraService] Error generating token:', error);
      throw error;
    }
  }

  /**
   * Get App ID (for client initialization)
   * @returns {string} - Agora App ID
   */
  getAppId() {
    return this.appId;
  }

  /**
   * Check if Agora is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.appId && this.appCertificate);
  }
}

// Export singleton instance
export default new AgoraService();
