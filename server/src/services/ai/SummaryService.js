import { VoiceTranscript } from '../../models/VoiceTranscript.js';
import { MeetingSummary } from '../../models/MeetingSummary.js';
import LLMService from './LLMService.js';
import logger from '../../logger.js';

class SummaryService {
    async generateMeetingSummary(roomId) {
        try {
            logger.info(`[SummaryService] Generating summary for room ${roomId}`);

            // 1. Fetch transcripts
            const transcripts = await VoiceTranscript.find({ roomId }).sort({ createdAt: 1 });
            
            if (!transcripts || transcripts.length === 0) {
                throw new Error('No transcripts found for this meeting.');
            }

            // 2. Format transcript for LLM
            // Format: "[10:00:05] User123: Hello world" (Roughly)
            // Ideally we'd map userId to names if we had them easily available here,
            // but for now we'll use userId or just "Speaker".
            // Since this runs on the server, we might need to fetch user details from Redis/DB if we want names.
            // For MVP, userId is acceptable, or we rely on the context if names were stored.
            // Note: VoiceTranscript schema currently stores userId. 
            
            const fullText = transcripts.map(t => {
                const time = new Date(t.createdAt).toLocaleTimeString();
                return `[${time}] ${t.userId}: ${t.transcript}`;
            }).join('\n');

            logger.info(`[SummaryService] Sending ${transcripts.length} lines to LLM...`);

            // 3. Call LLM
            const result = await LLMService.generateSummary(fullText);

            // 4. Save to DB
            const summaryDoc = await MeetingSummary.create({
                roomId,
                summary: result.summary,
                actionItems: result.actionItems
            });

            logger.info(`[SummaryService] Summary saved for room ${roomId}`);
            return summaryDoc;

        } catch (error) {
            logger.error(`[SummaryService] Failed to generate summary for ${roomId}:`, error);
            throw error;
        }
    }

    async getLatestSummary(roomId) {
        return await MeetingSummary.findOne({ roomId }).sort({ createdAt: -1 });
    }

    async generateCatchUpSummary(roomId) {
        try {
            logger.info(`[SummaryService] Generating catch-up for room ${roomId}`);
            
            // Fetch all transcripts so far
            const transcripts = await VoiceTranscript.find({ roomId }).sort({ createdAt: 1 });
            
            if (!transcripts || transcripts.length === 0) {
                return null; // Nothing to catch up on
            }

            // Limit to last X minutes or max tokens? 
            // For now, take last 50 entries to keep it fast/cheap
            const recentTranscripts = transcripts.slice(-50); 

            const fullText = recentTranscripts.map(t => {
                const time = new Date(t.createdAt).toLocaleTimeString();
                return `[${time}] ${t.userId}: ${t.transcript}`;
            }).join('\n');

            const result = await LLMService.generateCatchUp(fullText);
            return result.summary;

        } catch (error) {
            logger.error(`[SummaryService] Catch-up failed for ${roomId}:`, error);
            throw error;
        }
    }
}

export default new SummaryService();
