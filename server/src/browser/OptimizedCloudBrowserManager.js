import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import logger from '../logger.js';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import AudioCaptureManager from './AudioCaptureManager.js';

chromium.use(stealth());

class OptimizedCloudBrowserManager extends EventEmitter {
  constructor(sessionId, options = {}) {
    super();
    this.sessionId = sessionId;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.lastFrameHash = null;
    this.frameSkipCount = 0;
    this.isCapturing = false;
    
    // Configuration
    this.config = {
      viewport: options.viewport || { width: 1920, height: 1080 }, // Desktop High-Res
      frameRate: options.frameRate || 60, // 60 FPS targeting
      quality: options.quality || 100, // Maximum visual fidelity
      maxIdleTime: options.maxIdleTime || 10 * 60 * 1000, // 10 minutes
      enableAudio: options.enableAudio || false,
      ...options
    };

    // Add audio manager
    this.audioManager = null;
    if (this.config.enableAudio) {
      this.audioManager = new AudioCaptureManager(sessionId, {
        codec: 'libopus',
        bitrate: '64k',
      });
    }
    
    this.lastActivityTime = Date.now();
    this.isProcessingFrame = false;
    
    // Network monitoring
    this.clientLatency = 100;
    this.bandwidth = 'high';
    
    // Resource tracking
    this.stats = {
      framesSent: 0,
      bytesTransferred: 0,
      duplicateFrames: 0,
      sessionStart: Date.now()
    };
    
    this.startIdleMonitor();
  }

  async initialize() {
    try {
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees',
          '--force-color-profile=srgb',
          // ✅ ENABLE AUDIO
          '--autoplay-policy=no-user-gesture-required',
          '--no-first-run',
          '--disable-web-security',
          '--allow-running-insecure-content',
        ],
        executablePath: process.env.CHROMIUM_PATH || undefined,
      };

      // ✅ Configure browser to use virtual audio sink if enabled
      if (this.audioManager) {
        const sinkName = `cospira-browser-${this.sessionId}`;
        launchOptions.args.push(
          `--alsa-output-device=${sinkName}`,
          `--use-fake-device-for-media-stream`
        );
      }

      if (process.platform === 'linux' && !process.env.CHROMIUM_PATH) {
          launchOptions.executablePath = '/usr/bin/chromium';
      }

      this.browser = await chromium.launch(launchOptions);
      const isMobileView = this.config.viewport.width < 1024;
      
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        deviceScaleFactor: 1, // 1 is faster for 1080p streaming
        hasTouch: isMobileView,
        isMobile: isMobileView,
        userAgent: isMobileView 
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        colorScheme: 'dark', // Native dark mode feel
      });

      this.page = await this.context.newPage();

      // ✅ EXPOSE AUDIO BRIDGE (main frame only - iframes use postMessage)
      await this.page.exposeFunction('__cospira_audio_chunk', (base64Chunk) => {
        if (this.audioManager && base64Chunk && base64Chunk.length > 0) {
          this.audioManager.emit('audio-chunk', {
            sessionId: this.sessionId,
            data: base64Chunk,
            timestamp: Date.now(),
            format: 'webm',
            codec: 'libopus'
          });
        }
      });

      // ✅ INJECT CAPTURE ENGINE in ALL frames (main + iframes e.g. YouTube player)
      await this.context.addInitScript(() => {
        window.__cospira_capture_active = false;

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
        }

        async function initCospiraAudio() {
          if (window.__cospira_capture_active) return;
          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioCtx = new AudioContext();
            const destination = audioCtx.createMediaStreamDestination();
            window.__cospira_capture_active = true;

            const captureMedia = (el) => {
              if (el.__cospira_captured) return;
              try {
                el.setAttribute('crossorigin', 'anonymous');
                const source = audioCtx.createMediaElementSource(el);
                source.connect(destination);
                source.connect(audioCtx.destination);
                el.__cospira_captured = true;
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

            const recorder = new MediaRecorder(destination.stream, {
              mimeType: 'audio/webm;codecs=opus',
              audioBitsPerSecond: 128000
            });
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
            recorder.start(1000); 

            // Auto-resume context on any backend activity if it's suspended
            setInterval(() => {
              if (audioCtx.state === 'suspended') audioCtx.resume();
            }, 3000);
          } catch (e) {}
        }

        window.addEventListener('load', () => setTimeout(initCospiraAudio, 500));
        window.addEventListener('click', () => setTimeout(initCospiraAudio, 500), { once: true });
        window.addEventListener('touchstart', () => setTimeout(initCospiraAudio, 500), { once: true });
        if (document.readyState === 'complete') setTimeout(initCospiraAudio, 500);
      });
      
      // ✅ Enable audio capture (UI Side)
      await this.page.evaluate(() => {
        // Unmute all media elements
        document.addEventListener('play', (e) => {
          if (e.target.muted) {
            e.target.muted = false;
          }
        }, true);
      });

      // Optimize page performance by blocking some resources if bandwidth is low
      await this.page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['font', 'image'].includes(resourceType) && this.bandwidth === 'low') {
          route.abort();
        } else {
          route.continue();
        }
      });

      this.page.on('load', () => {
        this.lastActivityTime = Date.now();
      });

      logger.info(`[Browser ${this.sessionId}] Initialized with Playwright + Audio`);
      return true;
    } catch (error) {
      logger.error(`[Browser ${this.sessionId}] Init error: ${error.message}`);
      throw error;
    }
  }

  async captureFrame() {
    if (this.isProcessingFrame || !this.page) return null;
    
    this.isProcessingFrame = true;
    
    try {
      const screenshot = await this.page.screenshot({
        type: 'jpeg',
        quality: this.config.quality,
      });

      // Calculate frame hash for duplicate detection
      const frameHash = crypto.createHash('md5').update(screenshot).digest('hex');
      
      if (this.lastFrameHash === frameHash) {
        this.frameSkipCount++;
        this.stats.duplicateFrames++;
        
        // Force a keyframe every 30 skipped frames (~2 seconds) so late clients don't get stuck forever
        if (this.frameSkipCount > 30) {
          this.frameSkipCount = 0; // reset
          // return normal frame to wake up clients
        } else if (this.frameSkipCount > 10) { 
          this.isProcessingFrame = false;
          return { skipped: true, reason: 'duplicate' };
        }
      } else {
        this.frameSkipCount = 0;
      }
      
      this.lastFrameHash = frameHash;
      const base64Frame = screenshot.toString('base64');
      
      this.stats.framesSent++;
      this.stats.bytesTransferred += base64Frame.length;
      this.isProcessingFrame = false;
      this.consecutiveErrors = 0; // reset on success

      return {
        sessionId: this.sessionId,
        frame: base64Frame,
        timestamp: Date.now(),
        quality: this.config.quality,
        size: this.config.viewport,
        stats: {
          frameNumber: this.stats.framesSent,
          byteSize: base64Frame.length,
        }
      };
    } catch (error) {
      this.isProcessingFrame = false;
      this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;
      
      if (this.consecutiveErrors > 15) {
        logger.error(`[Browser ${this.sessionId}] Frame capture failed 15 times cleanly. Emitting crash.`);
        this.emit('crash', error);
      } else if (!error.message?.includes('Target closed') && !error.message?.includes('Session closed')) {
        // logger.error(`[Browser ${this.sessionId}] Capture error: ${error.message}`);
      }
      return null;
    }
  }

  startFrameCapture(emitCallback) {
    if (this.isCapturing) return;
    
    this.isCapturing = true;

    // ✅ Start audio capture if enabled
    if (this.audioManager && !this.audioManager.isCapturing) {
      this.audioManager.startCapture(this.sessionId);
      
      this.audioManager.on('audio-chunk', (audioData) => {
        emitCallback({
          type: 'audio',
          ...audioData
        });
      });
    }

    const captureLoop = async () => {
      if (!this.isCapturing) return;

      const frame = await this.captureFrame();
      
      if (frame && !frame.skipped) {
        emitCallback(frame);
      }

      // Adaptive timing
      const interval = 1000 / this.config.frameRate;
      const delay = Math.max(interval, this.clientLatency * 0.5);

      setTimeout(captureLoop, delay);
    };

    captureLoop();
    logger.info(`[Browser ${this.sessionId}] Frame capture started at ${this.config.frameRate}fps`);
  }

  stopFrameCapture() {
    this.isCapturing = false;
  }

  updateNetworkConditions(latency, bandwidth) {
    this.clientLatency = latency;
    const oldBandwidth = this.bandwidth;
    
    if (bandwidth === 'slow-2g' || bandwidth === '2g') {
      this.bandwidth = 'low';
      this.config.quality = 40;
      this.config.frameRate = 8;
    } else if (bandwidth === '3g') {
      this.bandwidth = 'medium';
      this.config.quality = 60;
      this.config.frameRate = 12;
    } else {
      this.bandwidth = 'high';
      this.config.quality = 75;
      this.config.frameRate = 20;
    }

    if (oldBandwidth !== this.bandwidth) {
      logger.info(`[Browser ${this.sessionId}] Bandwidth adjusted to ${this.bandwidth}`);
    }
  }

  async handleInput(event) {
    if (!this.page) {
      logger.warn(`[Browser ${this.sessionId}] handleInput called but page is null`);
      return;
    }

    if (!event || !event.type) {
      return;
    }
    
    this.lastActivityTime = Date.now();

    try {
      switch (event.type) {
        case 'tap':
        case 'click':
          // Convert normalized coordinates to absolute
          const clickX = Math.round(event.x * this.config.viewport.width);
          const clickY = Math.round(event.y * this.config.viewport.height);
          await this.page.mouse.click(clickX, clickY);
          break;

        case 'dblclick':
          const dblX = Math.round(event.x * this.config.viewport.width);
          const dblY = Math.round(event.y * this.config.viewport.height);
          await this.page.mouse.dblclick(dblX, dblY);
          break;

        case 'scroll':
        case 'wheel':
          // ✅ HANDLE SCROLL AND WHEEL EVENTS
          await this.page.evaluate((deltaY) => {
            window.scrollBy({ top: deltaY, behavior: 'smooth' });
          }, event.deltaY);
          break;

        case 'swipe':
          const swipeDistance = event.startY - event.endY;
          await this.page.evaluate((distance) => {
            window.scrollBy({ top: distance, behavior: 'smooth' });
          }, swipeDistance);
          break;

        case 'mousemove':
          const moveX = Math.round(event.x * this.config.viewport.width);
          const moveY = Math.round(event.y * this.config.viewport.height);
          await this.page.mouse.move(moveX, moveY);
          break;

        case 'mousedown':
          const downX = Math.round(event.x * this.config.viewport.width);
          const downY = Math.round(event.y * this.config.viewport.height);
          await this.page.mouse.move(downX, downY);
          await this.page.mouse.down();
          break;
        
        case 'mouseup':
          const upX = Math.round(event.x * this.config.viewport.width);
          const upY = Math.round(event.y * this.config.viewport.height);
          await this.page.mouse.move(upX, upY);
          await this.page.mouse.up();
          break;

        case 'type':
          await this.page.keyboard.type(event.text, { delay: 50 });
          break;

        case 'keypress':
        case 'keydown':
          await this.page.keyboard.press(event.key);
          break;

        case 'keyup':
          // Playwright doesn't have separate keyup
          break;

        default:
          logger.warn(`[Browser ${this.sessionId}] Unknown event type: ${event.type}`);
      }
    } catch (error) {
      // Silent fail for most input errors
      if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
        logger.info(`[Browser ${this.sessionId}] Input error: ${error.message}`);
      }
    }
  }

  async navigate(url) {
    if (!this.page) return;
    
    try {
      const validUrl = url.startsWith('http') ? url : `https://${url}`;
      this.currentUrl = validUrl;
      await this.page.goto(validUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      
      // ✅ Ensure audio is enabled after navigation
      await this.page.evaluate(() => {
        document.querySelectorAll('video, audio').forEach(media => {
          media.muted = false;
          media.volume = 1.0;
        });
      });
      
      this.lastActivityTime = Date.now();
      logger.info(`[Browser ${this.sessionId}] Navigated to ${validUrl}`);
    } catch (error) {
      logger.warn(`[Browser ${this.sessionId}] Navigation error: ${error.message}`);
    }
  }

  startIdleMonitor() {
    this.idleMonitorInterval = setInterval(async () => {
      const idleTime = Date.now() - this.lastActivityTime;
      if (idleTime > this.config.maxIdleTime) {
        logger.info(`[Browser ${this.sessionId}] Idle timeout - cleaning up`);
        await this.cleanup();
      }
    }, 60000); 
  }

  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.sessionStart,
      quality: this.config.quality,
      frameRate: this.config.frameRate,
      bandwidth: this.bandwidth,
    };
  }

  async cleanup() {
    this.stopFrameCapture();
    if (this.idleMonitorInterval) clearInterval(this.idleMonitorInterval);

    // Stop audio capture
    if (this.audioManager) {
      try {
        await this.audioManager.stopCapture(this.sessionId);
      } catch (e) {
        // ignore
      }
      this.audioManager = null;
    }

    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch (e) {
      // ignore
    }

    this.page = null;
    this.context = null;
    this.browser = null;
    this.emit('closed');
  }
}


export default OptimizedCloudBrowserManager;

