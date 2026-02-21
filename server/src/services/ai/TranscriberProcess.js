import { createSocket } from 'dgram';
import { spawn } from 'child_process';
import { createClient } from '@deepgram/sdk';
import config from '../../config.js';
import logger from '../../logger.js';
import { EventEmitter } from 'events';

class TranscriberProcess extends EventEmitter {
    constructor(roomId, userId, producerId) {
        super();
        this.roomId = roomId;
        this.userId = userId;
        this.producerId = producerId;
        this.process = null;
        this.socket = null; // UDP socket to receive RTP
        this.deepgramLive = null;
        this.rtpPort = null;
    }

    async start() {
        try {
            // 1. Setup UDP socket to find a free port for RTP
            this.socket = createSocket('udp4');
            await new Promise((resolve, reject) => {
                this.socket.bind(0, '0.0.0.0', () => {
                    const addr = this.socket.address();
                    this.rtpPort = addr.port;
                    this.socket.close(); // Close it, FFmpeg will bind to it
                    this.socket = null;
                    resolve();
                });
                this.socket.on('error', reject);
            });

            logger.info(`[AI-Transcriber] Assigned RTP port ${this.rtpPort} for user ${this.userId}`);

            // 2. Start Deepgram Connection
            if (!config.ai.deepgramApiKey) {
                throw new Error('Deepgram API Key missing');
            }
            const deepgram = createClient(config.ai.deepgramApiKey);
            
            this.deepgramLive = deepgram.listen.live({
                model: 'nova-2',
                language: 'en-US',
                smart_format: true,
                encoding: 'linear16',
                sample_rate: 48000,
                channels: 1 // Mediasoup usually mixes or we take one channel
            });

            this.deepgramLive.on(LiveTranscriptionEvents.Open, () => {
                logger.info(`[AI-Transcriber] Deepgram connection opened for ${this.userId}`);
            });

            this.deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
                const transcript = data.channel.alternatives[0].transcript;
                if (transcript && data.is_final) {
                    this.emit('transcript', {
                        text: transcript,
                        timestamp: Date.now(),
                        isFinal: true
                    });
                }
            });

            this.deepgramLive.on(LiveTranscriptionEvents.Error, (err) => {
                logger.error(`[AI-Transcriber] Deepgram error for ${this.userId}:`, err);
                this.emit('error', err);
            });

            // 3. Start FFmpeg
            // Input: RTP stream from Mediasoup (PlainTransport)
            // Output: Raw PCM audio to stdout -> Deepgram
            const sdpString = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=FFmpeg
c=IN IP4 127.0.0.1
t=0 0
m=audio ${this.rtpPort} RTP/AVP 111
a=rtpmap:111 OPUS/48000/2
`;
            
            // We can pipe SDP to ffmpeg via stdin, or just assume format if simple
            // But for RTP we usually need an SDP file or piped SDP.
            // Simplified approach: Listen on UDP port knowing it's Opus
            
            const ffmpegArgs = [
                '-protocol_whitelist', 'file,udp,rtp',
                '-i', `rtp://127.0.0.1:${this.rtpPort}?payload_type=111&ac=2`, 
                // '-i', '-', // If we piped SDP, but let's try direct RTP url if possible or use SDP
                // Actually, ffmpeg needs SDP to know codec details for RTP usually.
                // Let's use the explicit sdp pipe trick or just force codec.
                // For Opus/RTP, providing an SDP is safest.
                '-acodec', 'pcm_s16le',
                '-f', 's16le',
                '-ac', '1',
                '-ar', '48000',
                'pipe:1'
            ];
            
            // Better approach: Create a temporary SDP file? Or pipe it?
            // Let's try specifying codec specs directly on input if possible, 
            // but RTP usually requires SDP. 
            // Alternative: use `-f sdp -i pipe:0` and write SDP to stdin.
            
            this.process = spawn('ffmpeg', [
                '-protocol_whitelist', 'file,pipe,udp,rtp',
                '-f', 'sdp',
                '-i', 'pipe:0',
                '-acodec', 'pcm_s16le',
                '-f', 's16le',
                '-ac', '1',
                '-ar', '48000',
                'pipe:1'
            ]);

            this.process.stdin.write(sdpString);
            this.process.stdin.end();

            this.process.stdout.on('data', (chunk) => {
                if (this.deepgramLive && this.deepgramLive.getReadyState() === 1) { // Open
                    this.deepgramLive.send(chunk);
                }
            });

            this.process.stderr.on('data', (data) => {
                // FFmpeg logs to stderr
                // console.log(`FFmpeg Log: ${data}`); 
            });

            this.process.on('close', (code) => {
                logger.info(`[AI-Transcriber] FFmpeg exited with code ${code}`);
                this.emit('close');
            });

            return { rtpPort: this.rtpPort };

        } catch (error) {
            logger.error(`[AI-Transcriber] Start failed:`, error);
            this.stop();
            throw error;
        }
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        if (this.deepgramLive) {
            // this.deepgramLive.finish(); // SDK specific
            this.deepgramLive = null;
        }
        this.emit('close');
    }
}

// Need to import events from SDK properly
import { LiveTranscriptionEvents } from '@deepgram/sdk';

export default TranscriberProcess;
