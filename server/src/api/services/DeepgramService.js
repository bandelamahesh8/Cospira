
import { createClient } from '@deepgram/sdk';
import logger from '../../shared/logger.js';

class DeepgramService {
  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY;
    if (!this.apiKey) {
      logger.warn('DEEPGRAM_API_KEY is not set in environment variables');
    }
    this.client = this.apiKey ? createClient(this.apiKey) : null;
  }

  /**
   * Generates a temporary API key for client-side usage.
   * This key should have a short TTL (Time To Live).
   * @returns {Promise<{ key: string } | null>}
   */
  async generateTemporaryKey() {
    if (!this.client) {
      logger.error('Deepgram client not initialized');
      return null;
    }

    try {
      // Create a key with 10 second expiration (just enough to connect)
      // Note: Deepgram's createKey functionality might be different or project based.
      // Actually, for client-side streaming, the recommended pattern is typically 
      // generating a temporary key via the API or proxying the connection.
      // The "New" SDK supports `createClient(key)` on client side.
      
      // DEEPGRAM V3/V4 PATTERN:
      // Uses a project management API to create keys.
      // However, a common pattern for ephemeral usage is creating a key with a short scope/TTL.
      
      // Ideally, we should check if the SDK provides a helper for this or if we call the management API.
      // For now, let's assume we use the management API to create a key.
      
      const projectId = await this.getProjectId();
      if (!projectId) return null;

      const { result, error } = await this.client.manage.createProjectKey(projectId, {
        comment: "Ephemeral Client Key",
        scopes: ["usage:write"],
        time_to_live_in_seconds: 60 // 1 minute
      });

      if (error) {
        throw error;
      }

      return { key: result.key };
    } catch (error) {
      logger.error('Failed to generate temporary Deepgram key', error);
      return null;
    }
  }

  /**
   * Helper to get Project ID if not hardcoded
   */
  async getProjectId() {
    if (this.projectId) return this.projectId;
    
    try {
      const { result, error } = await this.client.manage.getProjects();
      if (error) throw error;
      
      // Just pick the first project for now
      if (result.projects && result.projects.length > 0) {
        this.projectId = result.projects[0].project_id;
        return this.projectId;
      }
      return null;
    } catch (e) {
      logger.error('Failed to fetch Deepgram Project ID', e);
      return null;
    }
  }
}

export default new DeepgramService();
