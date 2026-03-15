import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import logger from '../shared/logger.js';
import { EventEmitter } from 'events';

chromium.use(stealth());

class CloudBrowserManager extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.sessions = new Map();
  }

  async startSession(roomId, initialUrl = 'https://www.google.com') {
    if (this.sessions.has(roomId)) {
      return this.sessions.get(roomId);
    }

    try {
      logger.info(`🚀 Starting cloud browser for room ${roomId}`);
      
      const MOBILE_WIDTH = 360;
      const MOBILE_HEIGHT = 600;

      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--autoplay-policy=no-user-gesture-required',
          '--disable-blink-features=AutomationControlled',
          '--disable-gpu',
          '--font-render-hinting=none',
          '--hide-scrollbars',
          `--window-size=${MOBILE_WIDTH},${MOBILE_HEIGHT}`,
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certificate-errors',
          '--disable-search-engine-choice-screen',
          '--use-fake-ui-for-media-stream',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process,GlobalMediaControls',
          '--allow-running-insecure-content',
        ],
        ignoreDefaultArgs: ['--mute-audio', '--enable-automation'],
        executablePath: process.env.CHROMIUM_PATH || undefined,
      };

      if (process.platform === 'linux') {
         launchOptions.args.push(
            '--enable-features=PulseAudio',
            '--enable-audio-service-sandbox'
         );
         if (!process.env.CHROMIUM_PATH) launchOptions.executablePath = '/usr/bin/chromium';
      }

      const browser = await chromium.launch(launchOptions);

      const context = await browser.newContext({
        viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT }, 
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
        permissions: ['notifications'],
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: 'en-US',
      });

      const page = await context.newPage();

      // Start CDP Session
      const cdpClient = await context.newCDPSession(page);
      
      await cdpClient.send('Page.stopScreencast').catch(() => {});
      
      // ✅ FIX: Reduced frame rate for stability
      await cdpClient.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 75, // ✅ Reduced quality slightly
        maxWidth: MOBILE_WIDTH,
        maxHeight: MOBILE_HEIGHT,
        everyNthFrame: 3 // ✅ Every 3rd frame = ~10 FPS (smooth + stable)
      });

      const session = {
        browser,
        context,
        page,
        cdpClient,
        roomId,
        url: initialUrl,
        lastActivity: Date.now(),
        audioProcess: null,
        stats: {
          frames: 0,
          startTime: Date.now()
        },
        audioInitSegment: null,
        viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
        isMobile: true
      };

      this.sessions.set(roomId, session);

      // ✅ Frame throttling on server side
      let lastFrameTime = 0;
      const MIN_FRAME_INTERVAL = 100; // Max 10 FPS

      cdpClient.on('Page.screencastFrame', async ({ data, sessionId }) => {
        try {
          await cdpClient.send('Page.screencastFrameAck', { sessionId });
          
          const now = Date.now();
          if (now - lastFrameTime < MIN_FRAME_INTERVAL) {
            return; // Skip frame
          }
          lastFrameTime = now;
          
          this.io.to(roomId).emit('browser-frame', {
            data: `data:image/jpeg;base64,${data}`,
            timestamp: now
          });
          
          session.stats.frames++;
        } catch (e) {
          // Session closed
        }
      });

      // Auto-focus helper
      await page.addInitScript(() => {
        document.addEventListener('click', e => {
          if (e.target && typeof e.target.focus === 'function') {
            try {
              e.target.focus();
            } catch (err) {
              // Ignore focus errors
            }
          }
        }, true);
      });

      // Start Audio
      this.startAudioStream(session);

      // Navigate
      try {
        await page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } catch (e) {
        logger.warn(`Navigation failed: ${e.message}`);
      }

      browser.on('disconnected', () => this.cleanupSession(roomId));

      logger.info(`✅ Browser started for room ${roomId}`);
      this.io.to(roomId).emit('browser-started', { url: initialUrl });

      return session;

    } catch (error) {
      logger.error(`Failed to start browser: ${error.message}`);
      throw error;
    }
  }

  async setViewport(roomId, width, height, isMobile = false) {
    const session = this.sessions.get(roomId);
    if (!session?.page) return;

    try {
        logger.info(`Setting viewport: ${width}x${height}`);
        
        session.viewport = { width, height };
        session.isMobile = isMobile;

        await session.page.setViewportSize({ width, height });

        const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1';
        const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        
        await session.cdpClient.send('Emulation.setUserAgentOverride', {
            userAgent: isMobile ? mobileUA : desktopUA
        });

        await session.cdpClient.send('Page.stopScreencast').catch(() => {});
        
        await session.cdpClient.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 75,
            maxWidth: width,
            maxHeight: height,
            everyNthFrame: 3
        });

        this.io.to(roomId).emit('browser-viewport-updated', { width, height, isMobile });
        logger.info(`✅ Viewport updated`);

    } catch (error) {
        logger.error(`Viewport error: ${error.message}`);
    }
  }

  async startAudioStream(session) {
    const { roomId, cdpClient, page } = session;

    try {
       logger.info(`🔊 Starting audio for room ${roomId}`);
       
       await cdpClient.send('Runtime.enable');
       await cdpClient.send('Runtime.addBinding', { name: '__sendAudioChunk' });
       
       let chunkCount = 0;
       
       cdpClient.on('Runtime.bindingCalled', (event) => {
         if (event.name === '__sendAudioChunk' && event.payload) {
           try {
             const audioData = Buffer.from(event.payload, 'base64');
             
             chunkCount++;
             
             if (chunkCount === 1) {
               logger.info(`✅ Audio started`);
             }
             
             if (!session.audioInitSegment && audioData.length > 100) {
               session.audioInitSegment = audioData;
             }
             
             this.io.to(roomId).emit('audio-chunk', audioData);
           } catch (e) {
             logger.error(`Audio error: ${e.message}`);
           }
         }
       });
       
       await page.addInitScript(() => {
         console.log('[Audio] Init');
         
         const AudioContextClass = window.AudioContext || window.webkitAudioContext;
         const audioContext = new AudioContextClass({
           latencyHint: 'interactive',
           sampleRate: 48000
         });
         
         const destination = audioContext.createMediaStreamDestination();
         
         window.__audioSources = new Set();
         window.__audioDestination = destination;
         window.__audioContext = audioContext;
         window.__capturedElements = new WeakSet();
         
         const ensureAudioContext = () => {
           if (audioContext.state === 'suspended') {
             audioContext.resume();
           }
         };
         
         ['click', 'touchstart', 'keydown'].forEach(event => {
           document.addEventListener(event, ensureAudioContext, { once: true, passive: true });
         });
         
         function captureMediaAudio(mediaElement) {
           try {
             if (window.__capturedElements.has(mediaElement)) return;
             
             window.__capturedElements.add(mediaElement);
             
             ensureAudioContext();
             
             const source = audioContext.createMediaElementSource(mediaElement);
             const gainNode = audioContext.createGain();
             gainNode.gain.value = 1.0;
             
             source.connect(gainNode);
             gainNode.connect(destination);
             gainNode.connect(audioContext.destination);
             
             window.__audioSources.add({ source, gainNode, element: mediaElement });
             
             console.log('[Audio] Captured:', mediaElement.tagName);
             
             mediaElement.addEventListener('play', ensureAudioContext);
             
           } catch (e) {
             console.warn('[Audio] Capture failed:', e.message);
           }
         }
         
         function captureExistingMedia() {
           const mediaElements = document.querySelectorAll('video, audio');
           mediaElements.forEach(captureMediaAudio);
         }
         
         const observer = new MutationObserver((mutations) => {
           mutations.forEach((mutation) => {
             mutation.addedNodes.forEach((node) => {
               if (node.nodeType === 1) {
                 if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                   captureMediaAudio(node);
                 }
                 if (node.querySelectorAll) {
                   const mediaElements = node.querySelectorAll('video, audio');
                   mediaElements.forEach(captureMediaAudio);
                 }
               }
             });
           });
         });
         
         observer.observe(document.documentElement, {
           childList: true,
           subtree: true
         });
         
         if (document.readyState === 'loading') {
           document.addEventListener('DOMContentLoaded', captureExistingMedia);
         } else {
           captureExistingMedia();
         }
         
         setInterval(captureExistingMedia, 2000);
         
         ['click', 'touchstart', 'scroll'].forEach(event => {
           document.addEventListener(event, () => {
             setTimeout(captureExistingMedia, 100);
           }, { passive: true });
         });
         
         setTimeout(() => {
           try {
             const stream = destination.stream;
             
             const mediaRecorder = new MediaRecorder(stream, {
               mimeType: 'audio/webm;codecs=opus',
               audioBitsPerSecond: 64000
             });
             
             mediaRecorder.ondataavailable = (event) => {
               if (event.data && event.data.size > 0) {
                 const reader = new FileReader();
                 reader.onloadend = () => {
                   const base64 = reader.result.split(',')[1];
                   if (window.__sendAudioChunk) {
                     window.__sendAudioChunk(base64);
                   }
                 };
                 reader.readAsDataURL(event.data);
               }
             };
             
             mediaRecorder.start(100);
             window.__mediaRecorder = mediaRecorder;
             
             console.log('[Audio] Recorder started');
           } catch (e) {
             console.error('[Audio] Recorder failed:', e);
           }
         }, 1000);
       });
       
       logger.info(`✅ Audio initialized`);
       
    } catch (e) {
       logger.error(`Audio failed: ${e.message}`);
    }
  }

  async navigate(roomId, url) {
    const session = this.sessions.get(roomId);
    if (!session?.page) throw new Error('No session');
    const page = session.page;

    try {
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

      let targetUrl = url;
      if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
      }

      try {
        new URL(targetUrl);
      } catch (e) {
        logger.warn(`Invalid URL: ${targetUrl}`);
        return; 
      }

      logger.info(`Navigating to ${targetUrl}`);
      
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000 
      });

      const pageTitle = await page.title();
      const isCaptcha = pageTitle.includes('Cloudflare') || pageTitle.includes('Just a moment');

      if (isCaptcha) {
        this.io.to(roomId).emit('browser-status', { type: 'captcha', message: 'CAPTCHA' });
      }

      session.url = page.url(); 
      session.lastActivity = Date.now();
      
      this.io.to(roomId).emit('browser-url-updated', { url: session.url });

    } catch (error) {
      console.error(`Navigation error: ${error.message}`);
      
      try {
        if (!page.isClosed() && page.url() === 'about:blank') {
             await page.goto('https://www.google.com');
        }
      } catch (e) {
        // ignore
      }
    }
  }

  async handleInput(roomId, input) {
    const session = this.sessions.get(roomId);
    if (!session?.page) return;

    session.lastActivity = Date.now();
    const page = session.page;
    
    const { width, height } = session.viewport;

    try {
      switch (input.type) {
        case 'click':
          if (input.x !== undefined && input.y !== undefined) {
            const x = Math.floor(input.x * width);
            const y = Math.floor(input.y * height);
            await page.mouse.click(x, y);
          }
          break;
          
        case 'scroll':
          const deltaX = input.deltaX || 0;
          const deltaY = input.deltaY || 0;
          await page.mouse.wheel(deltaX, deltaY);
          break;
          
        case 'mousemove':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.move(
              Math.floor(input.x * width), 
              Math.floor(input.y * height)
            );
          }
          break;
          
        case 'mousedown':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.move(
              Math.floor(input.x * width), 
              Math.floor(input.y * height)
            );
          }
          await page.mouse.down();
          break;
          
        case 'mouseup':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.move(
              Math.floor(input.x * width), 
              Math.floor(input.y * height)
            );
          }
          await page.mouse.up();
          break;
          
        case 'keydown':
          await page.keyboard.down(input.key);
          break;
          
        case 'keyup':
          await page.keyboard.up(input.key);
          break;

        case 'type':
          // ✅ FIX: Single bulk typing operation
          if (input.text) {
             await page.keyboard.type(input.text, { delay: 50 });
             console.log(`Typed: ${input.text}`);
          }
          break;
          
        case 'navigate':
          await this.navigate(roomId, input.url);
          break;
          
        default:
          console.log(`Unknown type: ${input.type}`);
      }
    } catch (error) {
      if (!error.message.includes('closed')) {
        logger.error(`Input error: ${error.message}`);
      }
    }
  }

  async stopSession(roomId) {
    const session = this.sessions.get(roomId);
    if (!session) return;

    logger.info(`Stopping session ${roomId}`);

    try {
      if (session.audioProcess) {
         session.audioProcess.kill();
      }
      
      if (session.cdpClient) {
        await session.cdpClient.send('Page.stopScreencast').catch(() => {});
      }
      
      if (session.context) await session.context.close();
      if (session.browser) await session.browser.close();

      this.sessions.delete(roomId);
      this.io.to(roomId).emit('browser-closed');
    } catch (error) {
      logger.error(`Stop error: ${error.message}`);
    }
  }

  async cleanupSession(roomId) {
    await this.stopSession(roomId);
  }

  getSession(roomId) {
    return this.sessions.get(roomId);
  }

  getStats(roomId) {
    const session = this.sessions.get(roomId);
    if (!session) return null;
    return {
      frames: session.stats.frames,
      uptime: Date.now() - session.stats.startTime,
      url: session.url,
      viewport: session.viewport,
      isMobile: session.isMobile
    };
  }
}

export default CloudBrowserManager;
