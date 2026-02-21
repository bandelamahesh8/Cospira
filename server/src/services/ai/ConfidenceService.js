import logger from '../../logger.js';

class ConfidenceService {
    /**
     * Calculate confidence for an inference based on inputs
     * @param {Object} params 
     */
    calculateConfidence({ dataPoints, sentiment, anomalies, historicalAccuracy = 0.9 }) {
        // Factors:
        // 1. Data Density: More transcripts = higher confidence (cap at 20)
        const densityScore = Math.min(dataPoints / 20, 1.0);
        
        // 2. Sentiment Consistency: Extreme sentiment (very positive or very negative) is easier to detect
        const sentimentStrength = Math.abs(sentiment); 
        
        // 3. Anomaly Penalty: Frequent anomalies decrease confidence in "Normal" state
        const anomalyPenalty = Math.min(anomalies * 0.1, 0.4);

        // Weighted Calculation
        const rawScore = (densityScore * 0.4) + (sentimentStrength * 0.4) + (historicalAccuracy * 0.2);
        const finalScore = Math.max(0.1, Math.min(1.0, rawScore - anomalyPenalty));

        return {
            score: parseFloat(finalScore.toFixed(2)),
            reliability: finalScore > 0.8 ? 'HIGH' : finalScore > 0.5 ? 'MEDIUM' : 'LOW',
            factors: {
                density: densityScore.toFixed(2),
                sentiment: sentimentStrength.toFixed(2),
                penalty: anomalyPenalty.toFixed(2)
            }
        };
    }
}

export default new ConfidenceService();
