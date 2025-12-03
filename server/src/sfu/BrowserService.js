import puppeteer from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

ffmpeg.setFfmpegPath(ffmpegPath);

export default class BrowserService extends EventEmitter {
    constructor(roomId, router) {
        super();
        this.roomId = roomId;
        this.router = router;
        this.browser = null;
        this.page = null;
        this.transport = null;
        this.producer = null;
        this.ffmpegProcess = null;
        this.active = false;
    }

    async start() {
        if (this.active) {
            console.log(`[BrowserService] Browser already active for room ${this.roomId}`);
            return { producerId: this.producer?.id };
        }
        this.active = true;

        try {
            console.log(`[BrowserService] Starting browser for room ${this.roomId}`);
            console.log(`[BrowserService] FFmpeg path: ${ffmpegPath}`);

            // 1. Create Mediasoup PlainTransport for receiving video
            this.transport = await this.router.createPlainTransport({
                listenIp: '127.0.0.1',
                rtcpMux: false,
                comedia: true // We'll let FFmpeg initiate the connection
            });

            console.log(`[BrowserService] PlainTransport created on port ${this.transport.tuple.localPort}`);

            // 2. Launch Puppeteer
            const launchOptions = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=1280,720',
                    '--autoplay-policy=no-user-gesture-required',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--no-first-run',
                    '--no-zygote'
                ]
            };

            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
                console.log(`[BrowserService] Using custom executable path: ${launchOptions.executablePath}`);
            }

            this.browser = await puppeteer.launch(launchOptions);

            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1280, height: 720 });
            await this.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

            // 3. Start FFmpeg process
            // We will pipe CDP screencast frames to FFmpeg
            this.startFFmpeg();

            // 4. Create Producer
            this.producer = await this.transport.produce({
                kind: 'video',
                rtpParameters: {
                    codecs: [
                        {
                            mimeType: 'video/VP8',
                            clockRate: 90000,
                            payloadType: 101
                        }
                    ],
                    encodings: [
                        { ssrc: 11111111 }
                    ]
                }
            });

            console.log(`[BrowserService] Producer created: ${this.producer.id}`);

            this.producer.on('transportclose', () => {
                this.stop();
            });

            return {
                producerId: this.producer.id
            };

        } catch (error) {
            console.error('[BrowserService] Error starting browser:', error);
            this.stop();
            throw error;
        }
    }

    async startFFmpeg() {
        if (!this.page || !this.transport) return;

        const remotePort = this.transport.tuple.localPort;
        const remoteIp = '127.0.0.1'; // Mediasoup is local

        console.log(`[BrowserService] Starting FFmpeg: ${ffmpegPath} -> rtp://${remoteIp}:${remotePort}`);

        if (!remotePort) {
            console.error('[BrowserService] Error: remotePort is undefined!');
            return;
        }

        // Start CDP session for screencast
        const client = await this.page.target().createCDPSession();
        await client.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 80,
            maxWidth: 1280,
            maxHeight: 720,
            everyNthFrame: 1
        });

        // Create a PassThrough stream to pipe data to FFmpeg
        this.inputStream = new PassThrough();

        // FFmpeg command
        // Input: Pipe (JPEGs) via PassThrough stream
        // Output: RTP stream to Mediasoup
        this.ffmpegProcess = ffmpeg(this.inputStream)
            .inputFormat('image2pipe')
            .inputFPS(30)
            .videoCodec('libvpx')
            .videoBitrate('1000k')
            .size('1280x720')
            .outputOptions([
                '-loglevel debug', // Enable debug logging
                '-f rtp',
                '-payload_type 101', // Keep 101, but ensure pixel format is correct
                '-ssrc 11111111',
                '-pix_fmt yuv420p', // Ensure YUV420P pixel format
                '-an', // No audio for now
                '-deadline realtime', // Speed up encoding
                '-cpu-used 4', // Reduce CPU usage
                '-g 60', // Keyframe every 60 frames (2s at 30fps)
                '-keyint_min 60',
                '-sc_threshold 0'
            ])
            .output(`rtp://${remoteIp}:${remotePort}`)
            .on('start', (commandLine) => {
                console.log('[BrowserService] FFmpeg process started:', commandLine);
            })
            .on('stderr', (stderrLine) => {
                console.log('[BrowserService] FFmpeg stderr:', stderrLine);
            })
            .on('error', (err) => {
                console.error('[BrowserService] FFmpeg process error:', err);
            })
            .on('exit', (code, signal) => {
                console.log(`[BrowserService] FFmpeg process exited with code ${code} and signal ${signal}`);
            });

        this.ffmpegProcess.run();

        let frameCount = 0;
        // Handle screencast frames
        client.on('Page.screencastFrame', async (frame) => {
            try {
                if (this.active && this.inputStream.writable) {
                    const buffer = Buffer.from(frame.data, 'base64');
                    this.inputStream.write(buffer);
                    frameCount++;
                    if (frameCount % 30 === 0) {
                        console.log(`[BrowserService] Processed ${frameCount} frames. Last frame size: ${frame.data.length}`);
                    }
                }
                await client.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
            } catch (e) {
                console.error('[BrowserService] Error writing frame:', e);
            }
        });
    }

    async handleInput(input) {
        if (!this.page) return;

        try {
            switch (input.type) {
                case 'mousemove':
                    await this.page.mouse.move(input.x, input.y);
                    break;
                case 'click':
                    await this.page.mouse.click(input.x, input.y);
                    break;
                case 'keydown':
                    await this.page.keyboard.down(input.key);
                    break;
                case 'keyup':
                    await this.page.keyboard.up(input.key);
                    break;
                case 'scroll':
                    await this.page.mouse.wheel({ deltaY: input.deltaY });
                    break;
                case 'navigate':
                    await this.page.goto(input.url, { waitUntil: 'domcontentloaded' });
                    break;
            }
        } catch (error) {
            console.error('[BrowserService] Input error:', error);
        }
    }

    async stop() {
        if (!this.active) return;
        this.active = false;

        console.log('[BrowserService] Stopping browser session');

        if (this.ffmpegProcess) {
            try {
                this.ffmpegProcess.kill();
            } catch (e) { }
            this.ffmpegProcess = null;
        }

        if (this.page) {
            try {
                await this.page.close();
            } catch (e) { }
            this.page = null;
        }

        if (this.browser) {
            try {
                await this.browser.close();
            } catch (e) { }
            this.browser = null;
        }

        if (this.producer) {
            this.producer.close();
            this.producer = null;
        }

        if (this.transport) {
            this.transport.close();
            this.transport = null;
        }

        this.emit('close');
    }
}


