import { supabase } from '../../supabase.js';
import logger from '../../logger.js';

class AIMemoryService {
    /**
     * Save a new memory fragment
     * @param {Object} data - Memory data
     * @param {string} data.roomId - Room ID
     * @param {string} [data.userId] - User ID who triggered it
     * @param {string} data.eventType - decision, anomaly, insight, feedback, system
     * @param {Object} data.content - The actual data payload
     * @param {number} [data.importance] - 1-5
     * @param {string[]} [data.tags] - Searchable tags
     */
    async saveMemory(data) {
        if (!supabase) {
            logger.warn('[AIMemoryService] Supabase not initialized, memory not saved');
            return null;
        }

        try {
            const { data: memory, error } = await supabase
                .from('ai_memory')
                .insert([{
                    room_id: data.roomId,
                    user_id: data.userId || null,
                    event_type: data.eventType,
                    content: data.content,
                    importance: data.importance || 3,
                    tags: data.tags || [],
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            
            logger.info(`[AIMemoryService] Memory saved: ${data.eventType} for room ${data.roomId}`);
            return memory;
        } catch (error) {
            logger.error('[AIMemoryService] Failed to save memory:', error.message);
            return null;
        }
    }

    /**
     * Query memories for a specific room
     * @param {string} roomId 
     * @param {Object} options - filters
     */
    async queryMemories(roomId, options = {}) {
        if (!supabase) return [];

        try {
            let query = supabase
                .from('ai_memory')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false });

            if (options.limit) {
                query = query.limit(options.limit);
            }

            if (options.eventType) {
                query = query.eq('event_type', options.eventType);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('[AIMemoryService] Failed to query memories:', error.message);
            return [];
        }
    }
    async getMemories(roomId, limit = 20) {
        const memories = await this.queryMemories(roomId, { limit });
        return memories.map(m => ({
            ...m,
            id: m.id,
            timestamp: m.created_at,
            type: m.event_type,
            insight: m.content.message || JSON.stringify(m.content),
            metadata: {
                importance: m.importance,
                tags: m.tags
            }
        }));
    }
}

export default new AIMemoryService();
