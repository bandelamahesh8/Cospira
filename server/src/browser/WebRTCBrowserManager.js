import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import logger from '../logger.js';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

chromium.use(stealth());
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

const IS_WIN = process.platform === 'win32';

/**
 * WebRTC Browser Manager
 * Manages headless browser instances with WebRTC video/audio streaming
 * 
 * Architecture:
 * - Chromium runs on Xvfb (Linux) or Visible (Windows)
 * - FFmpeg captures display + Audio (Pulse on Linux, Silence/Desktop on Windows)
 * - Streams encoded VP8/Opus via WebRTC
 */
class WebRTCBrowserManager extends EventEmitter {
  constructor(io, sfuHandler) {
    super();
    this.io = io;
    this.sfuHandler = sfuHandler;
    this.sessions = new Map(); // roomId -> session
  }

  /**
   * Start a new browser session with WebRTC streaming
   */
  async startSession(roomId, initialUrl = 'https://www.google.com') {
    if (this.sessions.has(roomId)) {
      logger.info(`Session already exists for room ${roomId}`);
      return this.sessions.get(roomId);
    }

    try {
      logger.info(`🚀 Starting WebRTC browser session for room ${roomId}`);
      
      const launchOptions = {
         headless: !IS_WIN,
         args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--autoplay-policy=no-user-gesture-required',
            '--disable-blink-features=AutomationControlled',
            // Touch events support
            '--touch-events=enabled', 
            '--enable-features=Touch',
         ],
         executablePath: process.env.CHROMIUM_PATH || undefined
      };

      if (!IS_WIN) {
         launchOptions.args.push(
            '--enable-features=PulseAudio',
            '--use-fake-ui-for-media-stream',
            '--enable-audio-service-sandbox',
            '--audio-output-channels=2'
         );
         if (!process.env.CHROMIUM_PATH) launchOptions.executablePath = '/usr/bin/chromium';
      }

      // Launch Chromium
      const browser = await chromium.launch(launchOptions);

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        permissions: ['microphone', 'camera', 'notifications'],
        hasTouch: true, // Enable touch emulation in context
        recordVideo: !IS_WIN ? {
          dir: `/tmp/browser-sessions/${roomId}`,
          size: { width: 1280, height: 720 }
        } : undefined // Windows recordVideo might fail or need path adjustment
      });

      const page = await context.newPage();

      // Navigate to initial URL
      try {
        await page.goto(initialUrl, { 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
      } catch (e) {
        logger.warn(`Initial navigation failed: ${e.message}`);
      }

      // Create session object
      const session = {
        browser,
        context,
        page,
        roomId,
        url: initialUrl,
        lastActivity: Date.now(),
        ffmpegProcess: null,
        sfuTransport: null, // Mediasoup PlainTransport details
        stats: {
          framesStreamed: 0,
          audioPackets: 0,
          startTime: Date.now()
        },
        viewport: { width: 1280, height: 720 },
        touchState: {
           startX: 0,
           startY: 0,
           lastX: 0,
           lastY: 0,
           isScrolling: false,
           scrollThreshold: 10 // pixels
        }
      };

      // Start WebRTC streaming via Mediasoup
      await this.startWebRTCStream(session);

      this.sessions.set(roomId, session);

      // Cleanup on browser disconnect
      browser.on('disconnected', () => {
        logger.warn(`Browser disconnected for room ${roomId}`);
        this.cleanupSession(roomId);
      });

      logger.info(`✅ WebRTC browser session started for room ${roomId}`);
      this.io.to(roomId).emit('browser-started', { url: initialUrl });

      return session;

    } catch (error) {
      logger.error(`Failed to start browser session: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Start FFmpeg WebRTC streaming
   * Captures Xvfb/Desktop + Audio and encodes to VP8/Opus and sends to Mediasoup PlainTransport
   */
  async startWebRTCStream(session) {
    const { roomId } = session;

    try {
      logger.info(`🎥 Starting FFmpeg Mediasoup stream for room ${roomId} (Platform: ${process.platform})`);

      if (!this.sfuHandler) {
          throw new Error('SFU Handler not available for WebRTC streaming');
      }

      // 1. Create PlainTransport on SFU
      const sfuTransport = await this.sfuHandler.createPlainTransport(roomId);
      session.sfuTransport = sfuTransport;
      
      logger.info(`SFU PlainTransport created: ${sfuTransport.ip}:${sfuTransport.port} (RTCP: ${sfuTransport.rtcpPort})`);

      // 2. Prepare FFmpeg Args
      let ffmpegArgs = [];
      const platform = process.platform;
      
      // Target RTP addresses
      // Note: We send Video to Port, Audio to Port + 2 (usually? or same port with different SSRC/Payload?)
      // Mediasoup PlainTransport with `comedia:true` latches on the first incoming packet.
      // But if we send both Audio and Video, we might need TWO PlainTransports or rely on Payload Type multiplexing if supported by PlainTransport.
      // Standard Mediasoup PlainTransport handles ONE stream (Video OR Audio) typically unless bundled?
      // Actually `createPlainTransport` creates one port. If rtcpMux=false, +RTCP port.
      // To send BOTH Audio and Video to the SAME port, we need to bundle them or use different SSRC/PayloadTypes.
      // `comedia` mode latches to the source IP/Port.
      // Ideally we create TWO transports: one for Video, one for Audio.
      
      // Let's create a SECOND transport for Audio to be safe and robust.
      const sfuAudioTransport = await this.sfuHandler.createPlainTransport(roomId);
      session.sfuAudioTransport = sfuAudioTransport;
      
      logger.info(`SFU Audio Transport created: ${sfuAudioTransport.ip}:${sfuAudioTransport.port}`);

      if (platform === 'win32') {
         // Windows - Attempt Real Audio Capture
         ffmpegArgs = [
            '-f', 'gdigrab',
             '-framerate', '30',
             '-i', 'desktop', 
             
             '-f', 'dshow', 
             '-i', 'audio=Microphone Array (Intel® Smart Sound Technology for Digital Microphones)', 

             // Video Output -> Transport 1
             '-c:v', 'libvpx',
             '-b:v', '1000k',
             '-deadline', 'realtime',
             '-cpu-used', '5',
             '-error-resilient', '1',
             '-f', 'rtp',
             '-payload_type', '101', // VP8 generic
             '-ssrc', '11111111',
             `rtp://${sfuTransport.ip}:${sfuTransport.port}`,

             // Audio Output -> Transport 2
             '-c:a', 'libopus',
             '-b:a', '96k',
             '-f', 'rtp',
             '-payload_type', '100', // Opus generic
             '-ssrc', '22222222',
             `rtp://${sfuAudioTransport.ip}:${sfuAudioTransport.port}`
         ];
      } else if (platform === 'darwin') {
         // macOS
         ffmpegArgs = [
            '-f', 'avfoundation',
            '-framerate', '30',
            '-i', '1:0', 

            '-c:v', 'libvpx',
            '-b:v', '1000k',
            '-deadline', 'realtime',
            '-cpu-used', '5',
            '-error-resilient', '1',
            '-f', 'rtp',
            '-payload_type', '101',
            '-ssrc', '11111111',
            `rtp://${sfuTransport.ip}:${sfuTransport.port}`,

            '-c:a', 'libopus',
            '-b:a', '96k',
            '-f', 'rtp',
            '-payload_type', '100',
            '-ssrc', '22222222',
            `rtp://${sfuAudioTransport.ip}:${sfuAudioTransport.port}`
         ];
      } else {
         // Linux
         ffmpegArgs = [
            '-f', 'x11grab',
            '-video_size', '1280x720',
            '-framerate', '30',
            '-i', process.env.DISPLAY || ':99',
    
            '-f', 'pulse',
            '-i', 'default',
    
            // Video
            '-c:v', 'libvpx',
            '-b:v', '2M',
            '-maxrate', '2M',
            '-bufsize', '4M',
            '-quality', 'realtime',
            '-speed', '6',
            '-threads', '4',
            '-deadline', 'realtime',
            '-error-resilient', '1',
            '-f', 'rtp',
            '-payload_type', '101',
            '-ssrc', '11111111',
            `rtp://${sfuTransport.ip}:${sfuTransport.port}`,

            // Audio
            '-c:a', 'libopus',
            '-b:a', '128k',
            '-ar', '48000',
            '-ac', '2',
            '-f', 'rtp',
            '-payload_type', '100', // Opus
            '-ssrc', '22222222',
            `rtp://${sfuAudioTransport.ip}:${sfuAudioTransport.port}`
          ];
      }

      const ffmpeg = spawn(ffmpegPath.path, ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      session.ffmpegProcess = ffmpeg;

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        // Log basic progress
        if (output.includes('frame=') && Math.random() < 0.05) { // throttled log
           logger.debug(`FFmpeg ${roomId}: ${output.trim()}`);
        }
        if (output.includes('error') || output.includes('Error')) {
           // logger.error(`FFmpeg error for room ${roomId}: ${output}`);
        }
      });

      ffmpeg.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          logger.warn(`FFmpeg exited with code ${code} for room ${roomId}`);
        }
      });

      // 3. Tell SFU to produce
      // Video
      await this.sfuHandler.produceFromTransport(roomId, sfuTransport.id, 'video', {
          codecs: [{
              mimeType: 'video/VP8',
              payloadType: 101,
              clockRate: 90000,
          }],
          encodings: [{ ssrc: 11111111 }]
      }, { type: 'virtual-browser-video' });

      // Audio
      await this.sfuHandler.produceFromTransport(roomId, sfuAudioTransport.id, 'audio', {
          codecs: [{
              mimeType: 'audio/opus',
              payloadType: 100,
              clockRate: 48000,
              channels: 2
          }],
          encodings: [{ ssrc: 22222222 }]
      }, { type: 'virtual-browser-audio' });

      logger.info(`✅ FFmpeg Mediasoup streaming started for room ${roomId}`);

    } catch (error) {
      logger.error(`Failed to start FFmpeg stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navigate to a new URL
   */
  async navigate(roomId, url) {
    const session = this.sessions.get(roomId);
    if (!session || !session.page) {
      throw new Error('No active session');
    }
    const page = session.page;

    try {
      // Handle Special Navigation
      if (url === 'back') {
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        session.url = page.url();
        this.io.to(roomId).emit('browser-url-updated', { url: session.url });
        return;
      }

      if (url === 'forward') {
        await page.goForward({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        session.url = page.url();
        this.io.to(roomId).emit('browser-url-updated', { url: session.url });
        return;
      }

      if (url === 'reload') {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        return;
      }

      // Valid URL check
      let targetUrl = url;
      if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
      }
      try {
        new URL(targetUrl);
      } catch (e) {
        logger.warn(`Invalid URL blocked: ${targetUrl}`);
        return;
      }

      logger.info(`Navigating to ${targetUrl} in room ${roomId}`);
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });

      // CAPTCHA Check
      const pageTitle = await page.title();
      if (pageTitle.includes('Cloudflare') || pageTitle.includes('Just a moment')) {
          this.io.to(roomId).emit('browser-status', { type: 'captcha', message: 'CAPTCHA Detected - Please Solve' });
      }

      session.url = page.url();
      session.lastActivity = Date.now();
      
      this.io.to(roomId).emit('browser-url-updated', { url: session.url });
    } catch (error) {
      logger.error(`Navigation error: ${error.message}`);
      
      // Recovery
      try {
        if (!page.isClosed() && page.url() === 'about:blank') {
            await page.goto('https://www.google.com');
        }
      } catch (e) {}
    }
  }

  /**
   * Set Viewport Size
   */
  async setViewport(roomId, width, height, isMobile = false) {
    const session = this.sessions.get(roomId);
    if (!session || !session.page) return;

    try {
        logger.info(`Resizing viewport for room ${roomId} to ${width}x${height} (Mobile: ${isMobile})`);
        
        // Update session state
        session.viewport = { width, height };
        
        await session.page.setViewportSize({ width, height });
        
        // Notify clients
        this.io.to(roomId).emit('browser-viewport-updated', { width, height, isMobile });
        
    } catch (error) {
        logger.error(`Failed to resize viewport: ${error.message}`);
    }
  }

  /**
   * Handle user input (mouse, keyboard, touch)
   */
  async handleInput(roomId, input) {
    const session = this.sessions.get(roomId);
    if (!session || !session.page) return;

    session.lastActivity = Date.now();
    const page = session.page;

    try {
      const width = session.viewport?.width || 1280;
      const height = session.viewport?.height || 720;
      const touch = session.touchState;

      // --- Enhanced Touch Handling (Swipe to Scroll) ---
      if (input.pointerType === 'touch') {
          const x = input.x * width;
          const y = input.y * height;

          switch (input.type) {
              case 'mousedown': // touchstart
                  touch.startX = x;
                  touch.startY = y;
                  touch.lastX = x;
                  touch.lastY = y;
                  touch.isScrolling = false;
                  break;

              case 'mousemove': // touchmove
                  if (touch.isScrolling) {
                      // Already scrolling, just scroll more
                      const deltaX = touch.lastX - x;
                      const deltaY = touch.lastY - y;
                      await page.mouse.wheel(deltaX, deltaY);
                      touch.lastX = x; // Update last pos
                      touch.lastY = y;
                  } else {
                      // Check threshold
                      const dist = Math.hypot(x - touch.startX, y - touch.startY);
                      if (dist > touch.scrollThreshold) {
                          touch.isScrolling = true;
                          // Start scrolling
                          const deltaX = touch.lastX - x;
                          const deltaY = touch.lastY - y;
                          await page.mouse.wheel(deltaX, deltaY);
                          touch.lastX = x;
                          touch.lastY = y;
                      }
                  }
                  break;

              case 'mouseup': // touchend
                  if (!touch.isScrolling) {
                      // It was a tap!
                      await page.mouse.click(x, y);
                  }
                  // Reset
                  touch.isScrolling = false;
                  break;
          }
          return; // Stop processing, we handled it
      }

      // --- Standard Mouse/Keyboard Handling ---
      switch (input.type) {
        case 'mousemove':
          await page.mouse.move(input.x * width, input.y * height);
          break;

        case 'click':
          await page.mouse.click(input.x * width, input.y * height);
          break;

        case 'mousedown':
            await page.mouse.down();
            break;
            
        case 'mouseup':
            await page.mouse.up();
            break;

        case 'keydown':
          await page.keyboard.down(input.key);
          break;

        case 'keyup':
          await page.keyboard.up(input.key);
          break;

        case 'scroll':
        case 'wheel':
          await page.mouse.wheel(input.deltaX || 0, input.deltaY || 0);
          break;

        case 'navigate':
          await this.navigate(roomId, input.url);
          break;

        default:
          logger.warn(`Unknown input type: ${input.type}`);
      }
    } catch (error) {
      logger.warn(`Input handling error: ${error.message}`);
    }
  }

  /**
   * Stop a browser session
   */
  async stopSession(roomId) {
    const session = this.sessions.get(roomId);
    if (!session) return;

    logger.info(`Stopping browser session for room ${roomId}`);

    try {
      // Stop FFmpeg
      if (session.ffmpegProcess) {
        session.ffmpegProcess.kill('SIGTERM');
        session.ffmpegProcess = null;
      }

      // Close browser
      if (session.context) await session.context.close();
      if (session.browser) await session.browser.close();

      this.sessions.delete(roomId);
      this.io.to(roomId).emit('browser-closed');

      logger.info(`✅ Browser session stopped for room ${roomId}`);
    } catch (error) {
      logger.error(`Error stopping session: ${error.message}`);
    }
  }

  /**
   * Cleanup session
   */
  async cleanupSession(roomId) {
    await this.stopSession(roomId);
  }

  /**
   * Get session info
   */
  getSession(roomId) {
    return this.sessions.get(roomId);
  }

  /**
   * Get session statistics
   */
  getStats(roomId) {
    const session = this.sessions.get(roomId);
    if (!session) return null;

    return {
      ...session.stats,
      uptime: Date.now() - session.stats.startTime,
      url: session.url,
      lastActivity: session.lastActivity
    };
  }
}

export default WebRTCBrowserManager;
