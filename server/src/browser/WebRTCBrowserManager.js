import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import logger from '../shared/logger.js';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

chromium.use(stealth());
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import dgram from 'dgram';

class WebRTCBrowserManager extends EventEmitter {
  constructor(io, sfuHandler) {
    super();
    this.io = io;
    this.sfuHandler = sfuHandler;
    this.session = null;
  }

  get activePage() {
    if (!this.session) return null;
    const tab = this.session.pages.get(this.session.activeTabId);
    return tab ? tab.page : null;
  }

  get activeClient() {
    if (!this.session) return null;
    const tab = this.session.pages.get(this.session.activeTabId);
    return tab ? tab.client : null;
  }

  get currentUrl() {
    if (!this.session) return null;
    const tab = this.session.pages.get(this.session.activeTabId);
    return tab ? tab.url : null;
  }

  async startSession(roomId, initialUrl = 'https://www.google.com') {
    if (this.session) {
      logger.info(`Session already exists for room ${roomId}`);
      return this.session;
    }

    try {
      logger.info(`🚀 Starting WebRTC CDP browser session for room ${roomId}`);
      
      const launchOptions = {
         headless: true, // Always headless
         args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--autoplay-policy=no-user-gesture-required',
            '--disable-blink-features=AutomationControlled',
            '--touch-events=enabled', 
            '--enable-features=Touch',
            '--no-first-run',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--mute-audio', // We capture audio via MediaRecorder, prevent system bleeding
            '--use-fake-device-for-media-stream' // Required for headless audio testing/routing
         ],
         executablePath: process.env.CHROMIUM_PATH || undefined
      };

      if (process.platform === 'linux' && !process.env.CHROMIUM_PATH) {
          launchOptions.executablePath = '/usr/bin/chromium';
      }

      const browser = await chromium.launch(launchOptions);

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        permissions: ['microphone', 'camera', 'notifications'],
        hasTouch: true,
        colorScheme: 'dark',
      });

      const session = {
        browser,
        context,
        pages: new Map(),
        activeTabId: '1',
        roomId,
        url: initialUrl,
        lastActivity: Date.now(),
        ffmpegVideoProc: null,
        ffmpegAudioProc: null,
        sfuTransport: null, 
        sfuAudioTransport: null,
        stats: {
          framesStreamed: 0,
          audioChunks: 0,
          startTime: Date.now()
        },
        viewport: { width: 1280, height: 720 },
        touchState: {
           startX: 0, startY: 0,
           lastX: 0, lastY: 0,
           isScrolling: false, scrollThreshold: 10
        },
        lastFrameHash: null,
        frameSkipCount: 0
      };

      this.session = session;

      // Expose binding globally for ALL pages in context to map their audio securely
      await context.exposeBinding('__cospira_audio_chunk', ({ page }, base64Chunk) => {
          const activePage = this.activePage;
          if (!activePage || page !== activePage || !base64Chunk || !base64Chunk.length) return;

          if (base64Chunk.startsWith('GkXf') && session.restartAudioPipe) {
              // New WebM EBML header — the browser's MediaRecorder has restarted (page reload)
              // Buffer this header and the next chunks, restart FFmpeg, then drain the buffer.
              logger.info(`[Audio] New WebM header detected. Buffering & restarting FFmpeg audio pipe.`);
              
              // Start buffering
              session.audioBuffer = [Buffer.from(base64Chunk, 'base64')];
              session.audioBuffering = true;

              // Kill old process and start new one
              session.restartAudioPipe();

              // After a short delay (let ffmpeg process initialize), drain the buffer
              setTimeout(() => {
                  session.audioBuffering = false;
                  if (session.audioBuffer && session.audioBuffer.length > 0) {
                      for (const chunk of session.audioBuffer) {
                          if (session.ffmpegAudioProc && !session.ffmpegAudioProc.killed) {
                              try { session.ffmpegAudioProc.stdin.write(chunk); } catch(e) {}
                          }
                      }
                      session.audioBuffer = [];
                  }
              }, 300); // Give FFmpeg 300ms to spin up
              return;
          }

          if (session.audioBuffering) {
              // Still waiting for FFmpeg to be ready — keep buffering
              if (!session.audioBuffer) session.audioBuffer = [];
              session.audioBuffer.push(Buffer.from(base64Chunk, 'base64'));
              return;
          }

          if (session.ffmpegAudioProc && !session.ffmpegAudioProc.killed) {
              session.stats.audioChunks++;
              
              // Log every 100th chunk to verify audio flow
              if (session.stats.audioChunks % 100 === 0) {
                  logger.info(`[Audio] Received 100 chunks. Total: ${session.stats.audioChunks}`);
              }

              try {
                  const buffer = Buffer.from(base64Chunk, 'base64');
                  session.ffmpegAudioProc.stdin.write(buffer);
              } catch (e) {
                  // Pipe might be closing
                  logger.debug(`[Audio] Pipe write error: ${e.message}`);
              }
          }
      });

      // Inject DOM Audio Capture into all frames
      await context.addInitScript(() => {
        function sendChunk(base64) {
          if (!base64 || base64.length === 0) return;
          if (typeof window.__cospira_audio_chunk === 'function') {
            window.__cospira_audio_chunk(base64);
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'cospira-audio', payload: base64 }, '*');
          }
        }

        if (window === window.top) {
          window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'cospira-audio' && typeof window.__cospira_audio_chunk === 'function') {
              window.__cospira_audio_chunk(e.data.payload);
            }
          });

          // Unmute audio elements constantly to override site protections
          document.addEventListener('play', (e) => {
            if (e.target && e.target.muted) {
               e.target.muted = false;
               e.target.volume = 1.0;
            }
          }, true);
        }

        async function initCospiraAudio() {
          // Always allow re-initialization on each page load (no active guard)
          // Reset the capture flag so this page gets fresh audio capture
          if (window.__cospira_recorder) {
            try { window.__cospira_recorder.stop(); } catch(e) {}
            window.__cospira_recorder = null;
          }
          if (window.__cospira_audio_ctx) {
            try { window.__cospira_audio_ctx.close(); } catch(e) {}
            window.__cospira_audio_ctx = null;
          }
          
          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioCtx = new AudioContext();
            window.__cospira_audio_ctx = audioCtx;
            
            // Resume immediately (autoplay policy workaround)
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume().catch(() => {});
            }
            
            const destination = audioCtx.createMediaStreamDestination();

            const captureMedia = (el) => {
              if (el.__cospira_captured) return;
              try {
                el.setAttribute('crossorigin', 'anonymous');
                const source = audioCtx.createMediaElementSource(el);
                source.connect(destination);
                source.connect(audioCtx.destination);
                el.__cospira_captured = true;
                // Force unmute
                el.muted = false;
                el.volume = 1.0;
              } catch (e) {}
            };

            const observer = new MutationObserver((mutations) => {
              mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                  if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') captureMedia(node);
                  else if (node.querySelectorAll) node.querySelectorAll('video, audio').forEach(captureMedia);
                });
              });
            });
            if (document.body) {
              observer.observe(document.body, { childList: true, subtree: true });
              document.querySelectorAll('video, audio').forEach(captureMedia);
            }

            // Record as WebM/Opus and send back to Node
            const recorder = new MediaRecorder(destination.stream, {
              mimeType: 'audio/webm;codecs=opus',
              audioBitsPerSecond: 64000
            });
            window.__cospira_recorder = recorder;
            
            recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64 = reader.result && reader.result.split(',')[1];
                  if (base64) sendChunk(base64);
                };
                reader.readAsDataURL(event.data);
              }
            };
            recorder.start(200); // 200ms chunks for better balance of latency and overhead

            // Periodically resume AudioContext if it gets suspended
            setInterval(() => {
              if (audioCtx.state === 'suspended') {
                  audioCtx.resume().catch(() => {});
              }
            }, 1000);
            
            console.log('[Cospira] Audio capture successfully initialized');
          } catch (e) {
            console.error('[Cospira] Audio capture initialization failed:', e);
          }
        }

        // Initialize on DOMContentLoaded (fires before load but after DOM is ready)
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => setTimeout(initCospiraAudio, 100));
        } else {
          // Document already parsed; fire immediately
          setTimeout(initCospiraAudio, 100);
        }
        
        // Also re-init on load (for pages where media elements are inserted dynamically)
        window.addEventListener('load', () => setTimeout(initCospiraAudio, 300));
      });

      // Signal start EARLY so client can show the viewport while page loads
      this.io.to(roomId).emit('browser-started', { url: initialUrl });

      // Start WebRTC streaming via Mediasoup SFU
      await this.startWebRTCStream(session);

      // Create primary tab (internal navigation within createTab is now non-blocking for the start flow)
      await this.createTab(session.activeTabId, initialUrl, true);

      browser.on('disconnected', () => {
        logger.warn(`Browser disconnected for room ${roomId}`);
        this.emit('crash');
        this.cleanupSession();
      });

      logger.info(`✅ WebRTC CDP browser session started for room ${roomId}`);
      return session;

    } catch (error) {
      logger.error(`Failed to start CDP WebRTC browser session: ${error.message}`, error);
      throw error;
    }
  }

  async createTab(tabId, url = 'https://www.google.com', switchImmediately = true) {
      if (!this.session) return;
      const session = this.session;

      const page = await session.context.newPage();
      // Small delay to ensure the page target is ready for CDP attachment on some Windows systems
      await new Promise(r => setTimeout(r, 100));
      const client = await session.context.newCDPSession(page);
      logger.info(`[Browser] Created new tab ${tabId} with CDP session`);

      session.pages.set(tabId, { id: tabId, page, client, url, title: 'New Tab' });

      page.on('framenavigated', (frame) => {
          if (frame === page.mainFrame()) {
               const tab = session.pages.get(tabId);
               if (tab) {
                   tab.url = frame.url();
                   if (session.activeTabId === tabId) {
                       session.url = tab.url;
                       this.io.to(session.roomId).emit('browser-url-updated', { url: tab.url });
                   }
                   this.emitTabsUpdate();
               }
          }
      });
      
      page.on('load', async () => {
          try {
              const title = await page.title();
              const tab = session.pages.get(tabId);
              if (tab) {
                  tab.title = title;
                  this.emitTabsUpdate();
              }
          } catch (e) {}
      });

      page.on('crash', () => {
          logger.error(`Browser page crashed for room ${session.roomId}, tab ${tabId}`);
      });

      // Trigger navigation but don't block the session setup
      page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
          .catch(e => logger.warn(`Navigation failed for tab ${tabId}: ${e.message}`));

      if (switchImmediately) {
          await this.switchTab(tabId);
      } else {
          this.emitTabsUpdate();
      }
  }

  async switchTab(tabId) {
      if (!this.session || !this.session.pages.has(tabId)) return;
      
      const oldClient = this.activeClient;
      if (oldClient && this.session.activeTabId !== tabId) {
          await this.deactivateScreencast(oldClient);
      }

      this.session.activeTabId = tabId;
      const newPage = this.activePage;
      const newClient = this.activeClient;

      try {
          await newPage.bringToFront();
          await newPage.evaluate(() => {
              document.querySelectorAll('video, audio').forEach(m => m.muted = false);
          }).catch(()=>{});
      } catch (e) {}

      await this.activateScreencast(newClient);
      
      this.session.url = newPage.url();
      this.io.to(this.session.roomId).emit('browser-url-updated', { url: this.session.url });
      this.emitTabsUpdate();
  }

  async closeTab(tabId) {
      if (!this.session) return;
      const tab = this.session.pages.get(tabId);
      if (!tab) return;
      
      try {
          await tab.client.send('Page.stopScreencast').catch(()=>{});
          await tab.page.close().catch(()=>{});
      } catch(e) {}

      this.session.pages.delete(tabId);
      this.emitTabsUpdate();
  }

  emitTabsUpdate() {
      if (!this.session) return;
      const tabs = Array.from(this.session.pages.values()).map(t => ({
          id: t.id,
          url: t.url,
          title: t.title || t.url
      }));
      this.io.to(this.session.roomId).emit('browser-tabs-updated', {
          tabs,
          activeTabId: this.session.activeTabId
      });
  }

  async activateScreencast(client, retryCount = 0) {
      if (!client || !this.session) return;
      try {
          const page = this.activePage;
          const url = page ? page.url() : 'unknown';
          
          // Wait for page to be "ready" if it's still navigating
          if (page && page.isClosed()) return;

          logger.info(`[Screencast] Activating for URL: ${url} (Attempt ${retryCount + 1})`);
          
          await client.send('Page.startScreencast', {
              format: 'jpeg',
              quality: 50,
              maxWidth: this.session.viewport.width,
              maxHeight: this.session.viewport.height,
              everyNthFrame: 1
          });

          client.removeAllListeners('Page.screencastFrame');
          client.on('Page.screencastFrame', async ({ data, sessionId: cdpSessionId }) => {
              try {
                  await client.send('Page.screencastFrameAck', { sessionId: cdpSessionId }).catch(()=>{});
                  
                  if (this.activeClient !== client) return;

                  this.session.lastFrameBuffer = Buffer.from(data, 'base64');
                  
                  // LOG EVERY 100th FRAME
                  if (this.session.stats.framesStreamed % 100 === 0) {
                      logger.info(`[Screencast] Received frame. Size: ${this.session.lastFrameBuffer.length} bytes`);
                  }
              } catch (e) {
                  // Silent
              }
          });
          logger.info(`[Screencast] Successfully activated for ${url}`);
      } catch (e) {
          logger.error(`[Screencast] Failed to start (Attempt ${retryCount + 1}): ${e.message}`);
          if (retryCount < 3 && !e.message.includes('closed')) {
              logger.info(`[Screencast] Retrying in 500ms...`);
              setTimeout(() => this.activateScreencast(client, retryCount + 1), 500);
          }
      }
  }

  async deactivateScreencast(client) {
      if (!client) return;
      try {
          await client.send('Page.stopScreencast');
          client.removeAllListeners('Page.screencastFrame');
      } catch (e) {}
  }

  async startWebRTCStream(session) {
    const { roomId } = session;

    try {
      logger.info(`🎥 Starting FFmpeg Pipes for room ${roomId}`);

      // Clean up old pipes if restarting stream
      if (session.ffmpegVideoProc) {
          session.ffmpegVideoProc.kill('SIGKILL');
          session.ffmpegVideoProc = null;
      }
      if (session.ffmpegAudioProc) {
          session.ffmpegAudioProc.kill('SIGKILL');
          session.ffmpegAudioProc = null;
      }
      if (session.frameInterval) {
          clearInterval(session.frameInterval);
          session.frameInterval = null;
      }

      if (!this.sfuHandler) {
          throw new Error('SFU Handler not available for WebRTC streaming');
      }

      // Create Video Transport
      const sfuTransport = await this.sfuHandler.createPlainTransport(roomId);
      session.sfuTransport = sfuTransport;
      
      // Create Audio Transport
      const sfuAudioTransport = await this.sfuHandler.createPlainTransport(roomId);
      session.sfuAudioTransport = sfuAudioTransport;
      
      // Create a UDP proxy for Audio so FFmpeg restarts don't break Mediasoup comedia
      const audioProxy = dgram.createSocket('udp4');
      await new Promise((resolve, reject) => {
          audioProxy.once('error', reject);
          audioProxy.bind(0, '127.0.0.1', () => {
              audioProxy.removeListener('error', reject);
              resolve();
          });
      });
      session.audioProxy = audioProxy;
      const audioProxyPort = audioProxy.address().port;

      audioProxy.on('message', (msg) => {
          audioProxy.send(msg, 0, msg.length, sfuAudioTransport.port, '127.0.0.1');
      });

      logger.info(`SFU Transport V:${sfuTransport.port} A:${sfuAudioTransport.port} (Proxy A:${audioProxyPort})`);

      // Get Mediasoup assigned payload types
      const roomRouter = await this.sfuHandler.getOrCreateRoomRouter(roomId);
      const codecs = roomRouter.router.rtpCapabilities.codecs;
      const vp8Codec = codecs.find(c => c.mimeType.toLowerCase() === 'video/vp8');
      const opusCodec = codecs.find(c => c.mimeType.toLowerCase() === 'audio/opus');
      
      const videoPayloadType = vp8Codec ? vp8Codec.preferredPayloadType : 101;
      const audioPayloadType = opusCodec ? opusCodec.preferredPayloadType : 100;

      // Setup Video FFmpeg Pipe (image2pipe -> VP8 -> RTP)
      const videoArgs = [
          '-f', 'image2pipe',
          '-vcodec', 'mjpeg',
          '-framerate', '24',
          '-i', 'pipe:0', // Read from stdin
          '-c:v', 'libvpx',
          '-b:v', '2000k',
          '-maxrate', '3000k',
          '-bufsize', '4000k',
          '-g', '48',
          '-deadline', 'realtime',
          '-cpu-used', '8',
          '-threads', '0',
          '-error-resilient', '1',
          '-f', 'rtp',
          '-payload_type', videoPayloadType.toString(),
          '-ssrc', '11111111', // Video SSRC
          `rtp://127.0.0.1:${sfuTransport.port}`
      ];

      logger.info(`[VideoPipe] Spawning FFmpeg with args: ${videoArgs.join(' ')}`);
      session.ffmpegVideoProc = spawn(ffmpegPath.path, videoArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
      
      session.ffmpegVideoProc.on('error', (err) => {
          logger.error(`[VideoPipe] FFmpeg spawn error: ${err.message}`);
      });

      session.ffmpegVideoProc.on('exit', (code, signal) => {
          logger.error(`[VideoPipe] FFmpeg EXITED with code ${code} and signal ${signal}`);
      });

      if (session.ffmpegVideoProc.pid) {
          logger.info(`[VideoPipe] FFmpeg successfully spawned. PID: ${session.ffmpegVideoProc.pid}`);
      }
      
      session.ffmpegVideoProc.stdin.on('error', (err) => {
          logger.debug(`[VideoPipe] stdin error: ${err.message}`);
      });

      session.frameInterval = setInterval(() => {
          if (session.ffmpegVideoProc && !session.ffmpegVideoProc.killed && session.lastFrameBuffer) {
              if (session.ffmpegVideoProc.stdin.writableNeedDrain) {
                  // Pipe is full, skip this frame to prevent buffer buildup
                  session.frameSkipCount++;
                  if (session.frameSkipCount % 100 === 0) {
                      logger.warn(`[VideoPipe] Backpressure detected. Skipped ${session.frameSkipCount} frames total.`);
                  }
                  return;
              }

              try {
                  session.ffmpegVideoProc.stdin.write(session.lastFrameBuffer);
                  session.stats.framesStreamed++;
              } catch (e) {
                  logger.debug(`[VideoPipe] Write error: ${e.message}`);
              }
          }
      }, 1000 / 24);
      
      session.ffmpegVideoProc.stderr.on('data', (data) => {
          const str = data.toString();
          // LOG EVERYTHING for now
          logger.info(`[VideoPipe] ${str.trim()}`);
      });

      session.audioPayloadType = audioPayloadType;
      
          session.restartAudioPipe = () => {
          if (session.ffmpegAudioProc) {
              session.ffmpegAudioProc.kill('SIGKILL');
          }
          const audioArgs = [
              '-f', 'webm',
              '-i', 'pipe:0', // Read WebM chunks from stdin
              '-c:a', 'libopus',
              '-b:a', '64k',
              '-ar', '48000',
              '-ac', '2',
              '-f', 'rtp',
              '-payload_type', session.audioPayloadType.toString(),
              '-ssrc', '22222222', // Audio SSRC
              `rtp://127.0.0.1:${audioProxyPort}`
          ];
          logger.info(`[AudioPipe] Spawning FFmpeg with args: ${audioArgs.join(' ')}`);
          session.ffmpegAudioProc = spawn(ffmpegPath.path, audioArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
          
          session.ffmpegAudioProc.on('error', (err) => {
              logger.error(`[AudioPipe] FFmpeg error: ${err.message}`);
          });

          session.ffmpegAudioProc.stderr.on('data', (data) => {
              const str = data.toString();
              if (str.includes('Error') || str.includes('failed') || str.includes('Invalid')) {
                  logger.info(`[AudioPipe] stderr: ${str.trim()}`);
              }
          });
      };

      session.restartAudioPipe();

      // Tell SFU to produce Video
      await this.sfuHandler.produceFromTransport(roomId, sfuTransport.id, 'video', {
          codecs: [{
              mimeType: 'video/VP8',
              payloadType: videoPayloadType,
              clockRate: 90000,
          }],
          encodings: [{ ssrc: 11111111 }]
      }, { type: 'virtual-browser-video', userId: 'virtual-browser' });

      // Tell SFU to produce Audio
      await this.sfuHandler.produceFromTransport(roomId, sfuAudioTransport.id, 'audio', {
          codecs: [{
              mimeType: 'audio/opus',
              payloadType: audioPayloadType,
              clockRate: 48000,
              channels: 2
          }],
          encodings: [{ ssrc: 22222222 }]
      }, { type: 'virtual-browser-audio', userId: 'virtual-browser' });

      logger.info(`✅ FFmpeg Mediasoup streaming piped correctly`);

    } catch (error) {
      logger.error(`Failed to start stream pipes: ${error.message}`);
      throw error;
    }
  }

  async navigate(url) {
    const page = this.activePage;
    if (!this.session || !page) return;
    const session = this.session;
    const roomId = session.roomId;

    try {
      if (url === 'back') {
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.evaluate(() => {
          document.querySelectorAll('video, audio').forEach(m => m.muted = false);
        }).catch(()=>{});
        return;
      }

      if (url === 'forward') {
        await page.goForward({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.evaluate(() => {
          document.querySelectorAll('video, audio').forEach(m => m.muted = false);
        }).catch(()=>{});
        return;
      }

      if (url === 'reload') {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.evaluate(() => {
          document.querySelectorAll('video, audio').forEach(m => m.muted = false);
        }).catch(()=>{});
        return;
      }

      let targetUrl = url;
      if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
      }
      try { new URL(targetUrl); } catch (e) { return; }

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      await page.evaluate(() => {
        document.querySelectorAll('video, audio').forEach(m => m.muted = false);
      }).catch(()=>{});

      session.lastActivity = Date.now();
    } catch (error) {
      if (!page.isClosed() && page.url() === 'about:blank') {
          await page.goto('https://www.google.com').catch(()=>{});
      }
    }
  }

  async setViewport(width, height, isMobile = false) {
    if (!this.session) return;
    const session = this.session;
    const roomId = session.roomId;

    try {
        session.viewport = { width, height };
        
        // Update all pages viewports natively
        for (const [_, tab] of session.pages) {
             await tab.page.setViewportSize({ width, height }).catch(()=>{});
        }
        
        // Restart screencast for the active tab to pick up new resolution
        if (this.activeClient) {
            await this.deactivateScreencast(this.activeClient);
            await this.activateScreencast(this.activeClient);
        }
        
        this.io.to(roomId).emit('browser-viewport-updated', { width, height, isMobile });
    } catch (error) {}
  }

  async handleInput(input) {
    const page = this.activePage;
    if (!this.session || !page) return;
    const session = this.session;
    const roomId = session.roomId;

    session.lastActivity = Date.now();

    try {
      const width = session.viewport?.width || 1280;
      const height = session.viewport?.height || 720;
      const touch = session.touchState;

      // Input Throttling: Skip mousemove/touchmove if one is already in flight
      if ((input.type === 'mousemove' || input.type === 'touchmove') && session.isProcessingInput) {
          return;
      }
      session.isProcessingInput = true;

      // Touch Handling - NATIVE Playwright Touch
      if (input.pointerType === 'touch') {
          const x = Math.round(input.x * width);
          const y = Math.round(input.y * height);

          // Raw touch events (mousedown=touchstart, mousemove=touchmove, mouseup=touchend)
          if (['mousedown', 'mousemove', 'mouseup'].includes(input.type)) {
               try {
                   switch (input.type) {
                       case 'mousedown': 
                           touch.startX = x; touch.startY = y;
                           touch.lastX = x; touch.lastY = y;
                           touch.isScrolling = false;
                           await page.touchscreen.start(x, y).catch(()=>{});
                           break;
                       case 'mousemove': 
                           const dx = Math.abs(x - touch.startX);
                           const dy = Math.abs(y - touch.startY);
                           if (!touch.isScrolling && (dx > touch.scrollThreshold || dy > touch.scrollThreshold)) {
                               touch.isScrolling = true;
                           }
                           await page.touchscreen.move(x, y).catch(()=>{});
                           touch.lastX = x; touch.lastY = y;
                           break;
                       case 'mouseup': 
                           await page.touchscreen.end().catch(()=>{});
                           touch.isScrolling = false;
                           break;
                   }
               } catch (e) {
                   logger.debug(`Touch error: ${e.message}`);
               }
               return; // Return only for these raw touch movement events
          }
          // Other touch-initated events like 'click', 'dblclick', 'wheel' will fall through to mouse handlers
      }

      // Mouse/Keyboard/Processed Touch Gestures
      switch (input.type) {
        case 'mousemove': await page.mouse.move(input.x * width, input.y * height); break;
        case 'click': await page.mouse.click(input.x * width, input.y * height); break;
        case 'dblclick': await page.mouse.dblclick(input.x * width, input.y * height); break;
        case 'mousedown': await page.mouse.down(); break;
        case 'mouseup': await page.mouse.up(); break;
        case 'wheel': await page.mouse.wheel(input.deltaX || 0, input.deltaY || 0); break;
        case 'keydown': 
            if (input.key) {
                await page.keyboard.down(input.key).catch(()=>{}); 
            }
            break;
        case 'insertText':
            if (input.text) {
                await page.keyboard.insertText(input.text).catch(()=>{});
            }
            break;
        case 'keyup': 
            if (input.key) {
                await page.keyboard.up(input.key).catch(()=>{});
            }
            break;  
        case 'zoom': 
            // Handle pinch-to-zoom gestures
            if (input.scale) {
                // Convert pinch scale to zoom commands
                const zoomFactor = input.scale > 1 ? 1.1 : 0.9;
                await page.keyboard.down('Control');
                await page.mouse.wheel(0, input.scale > 1 ? -100 : 100);
                await page.keyboard.up('Control');
            }
            break;
        case 'navigate': await this.navigate(input.url || input.action); break;
      }
    } catch (error) {
    } finally {
      session.isProcessingInput = false;
    }
  }

  async stopSession() {
    if (!this.session) return;
    const session = this.session;
    const roomId = session.roomId;

    try {
      if (session.ffmpegVideoProc) {
         session.ffmpegVideoProc.stdin.end();
         session.ffmpegVideoProc.kill('SIGTERM');
      }
      if (session.ffmpegAudioProc) {
         session.ffmpegAudioProc.stdin.end();
         session.ffmpegAudioProc.kill('SIGTERM');
      }

      if (session.audioProxy) {
          session.audioProxy.close();
          session.audioProxy = null;
      }

      if (session.frameInterval) {
          clearInterval(session.frameInterval);
          session.frameInterval = null;
      }

      if (session.context) await session.context.close().catch(()=>{});
      if (session.browser) await session.browser.close().catch(()=>{});

      this.session = null;
      this.emit('closed');
      this.io.to(roomId).emit('browser-closed');
      logger.info(`✅ WebRTC CDP Browser session stopped`);
    } catch (error) {}
  }

  async cleanupSession() {
    await this.stopSession();
  }

  getSession() {
    return this.session;
  }

  getStats() {
    if (!this.session) return null;
    const session = this.session;
    return {
      ...session.stats,
      uptime: Date.now() - session.stats.startTime,
      url: session.url,
      lastActivity: session.lastActivity
    };
  }

  updateNetworkConditions(latency, bandwidth) {
  }
}

export default WebRTCBrowserManager;
