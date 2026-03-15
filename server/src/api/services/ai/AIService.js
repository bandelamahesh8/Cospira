import TranscriberProcess from './TranscriberProcess.js';
import logger from '../../logger.js';
import aiMemoryService from './AIMemoryService.js';
import { VoiceTranscript } from '../../models/VoiceTranscript.js';

class AIService {
    constructor() {
        this.sessions = new Map(); // userId -> TranscriberProcess
        this.io = null; // Socket.IO instance
    }

    init(io) {
        this.io = io;
        logger.info('[AIService] Initialized');
        if (process.env.GEMINI_API_KEY) {
            logger.info('[AIService] Gemini API Key detected. AI features enabled.');
        } else {
            logger.warn('[AIService] Gemini API Key missing. Some AI features may be disabled.');
        }
    }

    async startTranscription(roomId, userId, producerId, roomRouter) {
        if (this.sessions.has(userId)) {
            logger.warn(`[AIService] Transcription already active for user ${userId}`);
            return;
        }

        logger.info(`[AIService] Starting transcription for user ${userId} in room ${roomId}`);

        if (!process.env.DEEPGRAM_API_KEY) {
            logger.warn(`[AIService] Skipping transcription: DEEPGRAM_API_KEY is missing`);
            return;
        }

        try {
            const transcriber = new TranscriberProcess(roomId, userId, producerId);
            
            // 1. Start Transcriber (Get RTP Port)
            const { rtpPort } = await transcriber.start();

            // 2. Pipe Audio from Mediasoup
            const { transport, consumer } = await roomRouter.pipeToPlainTransport(producerId, {
                ip: '127.0.0.1',
                port: rtpPort
            });

            // Store consumer/transport refs in transcriber for cleanup if we want, 
            // or just rely on SFUHandler cleaning up by userId/socketId.
            // Actually, we should close them when transcriber stops.
            transcriber.transport = transport;
            transcriber.consumer = consumer;

            // 3. Handle Events
            transcriber.on('transcript', async (data) => {
                // Emit to room
                if (this.io) {
                    this.io.to(roomId).emit('ai:transcript', {
                        userId,
                        text: data.text,
                        timestamp: data.timestamp,
                        isFinal: data.isFinal
                    });
                }
                
                // Save to DB (Fire and forget)
                try {
                    await VoiceTranscript.create({
                        roomId,
                        userId,
                        transcript: data.text,
                        confidence: 1.0, // Deepgram doesn't always give it in simple mode, assume good
                        createdAt: new Date(data.timestamp)
                    });

                    // PHASE 5: Voice Moderation
                    if (data.isFinal) {
                        const { default: moderationService } = await import('../ModerationService.js');
                        
                        // Save to AI Memory
                        await aiMemoryService.saveMemory({
                            roomId,
                            userId,
                            eventType: 'insight',
                            content: { message: `AI Insight: ${data.text.substring(0, 100)}...` },
                            importance: 2,
                            tags: ['transcript', 'insight']
                        });

                        await moderationService.handleModeration({
                            roomId,
                            userId,
                            userName: 'User', // In production, resolve this via redis/db
                            contentType: 'voice',
                            content: data.text
                        });
                    }
                } catch (err) {
                    logger.error('Failed to save or moderate transcript:', err);
                }
            });

            transcriber.on('close', () => {
                this.stopTranscription(userId);
            });

            transcriber.on('error', (err) => {
                logger.error(`[AIService] Error for user ${userId}: ${err.message || err}`);
                if (err.stack) logger.debug(err.stack);
                this.stopTranscription(userId); // Ensure cleanup on error
            });

            this.sessions.set(userId, transcriber);

        } catch (error) {
            logger.error(`[AIService] Failed to start transcription for ${userId}: ${error.message || error}`);
            if (error.stack) logger.debug(error.stack);
            this.stopTranscription(userId); // Ensure cleanup
        }
    }

    async stopTranscription(userId) {
        const transcriber = this.sessions.get(userId);
        if (transcriber) {
            // Remove from map FIRST to prevent infinite recursion loop
            // (transcriber.stop() emits 'close' -> triggers stopTranscription again)
            this.sessions.delete(userId);

            logger.info(`[AIService] Stopping transcription for user ${userId}`);
            
            // Remove listeners to be extra safe
            transcriber.removeAllListeners('close');
            transcriber.removeAllListeners('transcript');
            transcriber.removeAllListeners('error');

            transcriber.stop();
            
            // Cleanup Mediasoup resources
            if (transcriber.consumer) {
                try {
                    transcriber.consumer.close();
                } catch (e) { /* ignore */ }
            }
            if (transcriber.transport) {
                try {
                    transcriber.transport.close();
                } catch (e) { /* ignore */ }
            }
        }
    }
}

export default new AIService();
