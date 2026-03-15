import roomIntelligenceService from '../RoomIntelligenceService.js';
import aiMemoryService from './AIMemoryService.js';
import { analyzeSentiment } from './SentimentAnalyzer.js';
import confidenceService from './ConfidenceService.js';
import logger from '../../../shared/logger.js';

class ContextInferenceService {
    /**
     * Infer the overall context of a room
     * @param {string} roomId 
     */
    async inferContext(roomId) {
        try {
            // 1. Get Room Intelligence Data
            const intelligence = await roomIntelligenceService.analyzeRoom(roomId).catch(() => null);
            
            // 2. Get Recent Memories (Anomalies/Decisions)
            const recentMemories = await aiMemoryService.queryMemories(roomId, { limit: 10 });
            const anomalies = recentMemories.filter(m => m.event_type === 'anomaly');
            
            // 3. Calculate Composite Context Score (0-100)
            const engagement = intelligence ? intelligence.engagement || 0.5 : 0.5;
            const sentiment = intelligence ? intelligence.sentiment?.score || 0 : 0;
            
            // Score components:
            // - Stability: Decreases with anomalies
            // - Focus: Increases with engagement
            // - Harmony: Increases with positive sentiment
            
            const stability = Math.max(0, 100 - (anomalies.length * 20));
            const harmony = ((sentiment + 1) / 2) * 100; // Map -1,1 to 0,100
            const focus = engagement * 100;
            
            const contextScore = Math.round((stability * 0.4) + (harmony * 0.3) + (focus * 0.3));
            
            // 4. Calculate Confidence/Reliability
            const confidence = confidenceService.calculateConfidence({
                dataPoints: intelligence?.transcriptCount || 0,
                sentiment,
                anomalies: anomalies.length
            });

            // 5. Determine Context State
            let state = 'NORMAL';
            if (stability < 40) state = 'UNSTABLE';
            else if (focus > 80 && harmony > 70) state = 'DEEP_COLLABORATION';
            else if (harmony < 30) state = 'STRESSED';
            else if (focus < 20) state = 'IDLE';

            return {
                roomId,
                score: contextScore,
                state,
                confidence,
                metrics: {
                    stability,
                    harmony,
                    focus,
                    engagement,
                    sentiment: sentiment.toFixed(2)
                },
                recentAnomalies: anomalies.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('[ContextService] Inference failed:', error.message);
            return { state: 'UNKNOWN', score: 0 };
        }
    }
}

export default new ContextInferenceService();
