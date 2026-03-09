import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import logger from '../logger.js';

chromium.use(stealth());

class VirtualBrowserManager {
  constructor(io) {
    this.io = io;
    this.sessions = new Map(); // roomId -> { browser, session, page, lastActivity }
    this.navDebounceTimers = new Map(); // roomId -> timeout handle (debounce navigation)
  }

  async startSession(roomId, initialUrl = 'https://www.google.com') {
    if (this.sessions.has(roomId)) {
      return this.sessions.get(roomId);
    }

    try {
      logger.info(`Starting Advanced Virtual Browser for room ${roomId}`);

      // 1. Launch Browser with Performance Flags
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--hide-scrollbars',
          '--mute-audio',
          '--disable-notifications',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-component-extensions-with-background-pages',
          '--disable-extensions',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees',
          '--disable-ipc-flooding-protection',
          '--disable-renderer-backgrounding',
          '--enable-features=NetworkService,NetworkServiceInProcess',
          '--force-color-profile=srgb',
        ]
      });

      // 2. Create Context with Stealth & Viewport
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        ignoreHTTPSErrors: true, // Prevent SSL errors from blocking load
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      // 3. Initialize on safe page to ensure CDP attachment works
      try {
        await page.goto('about:blank');
      } catch (e) {
        // Find
      }

      // 4. Start CDP Session for Low-Latency Screencast
      const client = await context.newCDPSession(page);
      
      // OPTIMIZATION: Bypass CSP to ensure Google scripts run in our frame context
      await page.setExtraHTTPHeaders({
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      });
      
      const session = {
        browser,
        context,
        page,
        client,
        roomId,
        url: initialUrl,
        lastActivity: Date.now(),
        startTime: Date.now()
      };

      // Configure Screencast
      await client.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 60, 
        maxWidth: 1280,
        maxHeight: 720,
        everyNthFrame: 1, 
      });

      // 5. Navigate to actual URL asynchronously (don't block session start)
      if (initialUrl && initialUrl !== 'about:blank') {
         page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
             .catch(e => logger.warn(`Background navigation failed: ${e.message}`));
      }

      // Handle Frames
      client.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
        try {
          // Acknowledge frame immediately to request next one
          await client.send('Page.screencastFrameAck', { sessionId });

            // Emit to client
          this.io.to(roomId).emit('browser-frame', { 
            data: `data:image/jpeg;base64,${data}`,
            timestamp: metadata.timestamp, // Chrome timestamp
             // Forward scroll metadata for potential client-side optimization
            metadata: {
                scrollOffsetX: metadata.scrollOffsetX,
                scrollOffsetY: metadata.scrollOffsetY,
                deviceScaleFactor: metadata.deviceScaleFactor,
            }
          });

        } catch (e) {
          // Session likely ended
        }
      });

      this.sessions.set(roomId, session);

      // Cleanup listener
      browser.on('disconnected', () => this.cleanupSession(roomId));

      logger.info(`✅ Advanced Browser Session Active: ${roomId}`);
      return session;

    } catch (error) {
      logger.error(`Failed to start session: ${error.message}`);
      throw error;
    }
  }

  async navigate(roomId, url) {
    // Debounce navigation to prevent ERR_ABORTED from rapid calls (300ms window)
    if (this.navDebounceTimers.has(roomId)) {
      clearTimeout(this.navDebounceTimers.get(roomId));
    }
    return new Promise((resolve) => {
      this.navDebounceTimers.set(roomId, setTimeout(async () => {
        this.navDebounceTimers.delete(roomId);
        await this._doNavigate(roomId, url);
        resolve();
      }, 300));
    });
  }

  async _doNavigate(roomId, url) {
    const session = this.sessions.get(roomId);
    if (!session || !session.page) return;
    const page = session.page;

    try {
      if (url === 'back') {
        await page.goBack().catch(() => {});
        session.url = page.url();
        this.io.to(roomId).emit('browser-url-updated', { url: session.url });
        return;
      }
      if (url === 'forward') {
        await page.goForward().catch(() => {});
        session.url = page.url();
        this.io.to(roomId).emit('browser-url-updated', { url: session.url });
        return;
      }
      if (url === 'reload') {
        await page.reload().catch(() => {});
        return;
      }

      // Ensure Protocol
      let targetUrl = url;
      if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

      // Validate
      try { new URL(targetUrl); } catch (e) { return; }

      // Don't await full load, just trigger
      session.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      session.url = targetUrl;
      
      this.io.to(roomId).emit('browser-url-updated', { url: targetUrl });
    } catch (e) {
      logger.error('Nav error', e);
    }
  }

  async handleInput(roomId, input) {
    const session = this.sessions.get(roomId);
    if (!session) return;
    session.lastActivity = Date.now();

    const { client } = session; // Use CDP client directly

    try {
      switch (input.type) {
        case 'mousemove':
            await client.send('Input.dispatchMouseEvent', {
                type: 'mouseMoved',
                x: input.x * 1280,
                y: input.y * 720,
            });
            break;
        case 'mousedown':
            await client.send('Input.dispatchMouseEvent', {
                type: 'mousePressed',
                x: input.x * 1280,
                y: input.y * 720,
                button: 'left',
                clickCount: 1
            });
            break;
        case 'mouseup':
            await client.send('Input.dispatchMouseEvent', {
                type: 'mouseReleased',
                x: input.x * 1280,
                y: input.y * 720,
                button: 'left',
                clickCount: 1
            });
            break;
        case 'click':
             // Simulate complete click sequence for reliability
             const x = input.x * 1280;
             const y = input.y * 720;
             await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
             await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
            break;
        case 'wheel':
        case 'scroll':
            await client.send('Input.dispatchMouseEvent', {
                type: 'mouseWheel',
                x: input.x * 1280,
                y: input.y * 720,
                deltaX: input.deltaX || 0,
                deltaY: input.deltaY || 0
            });
            break;
        // Advanced Keyboard Handling
        case 'keydown':
        case 'keypress': // Handle keypress as keydown for compatibility
            await client.send('Input.dispatchKeyEvent', {
                type: 'keyDown',
                text: input.key.length === 1 ? input.key : undefined, 
                unmodifiedText: input.key.length === 1 ? input.key : undefined,
                keyIdentifier: input.key,
                code: input.code,
                key: input.key,
                windowsVirtualKeyCode: input.keyCode,
                nativeVirtualKeyCode: input.keyCode,
                autoRepeat: false,
                isKeypad: false,
                isSystemKey: false
            });
            break;
        case 'keyup':
             await client.send('Input.dispatchKeyEvent', {
                type: 'keyUp',
                text: input.key.length === 1 ? input.key : undefined,
                unmodifiedText: input.key.length === 1 ? input.key : undefined,
                keyIdentifier: input.key,
                code: input.code,
                key: input.key,
                windowsVirtualKeyCode: input.keyCode,
                nativeVirtualKeyCode: input.keyCode,
            });
            break;
        case 'navigate':
             // Back / Forward / Reload from toolbar buttons
             await this.navigate(roomId, input.url);
             break;
        case 'char':
             // Only if explicitly sent as char, otherwise keydown handles text
             if (input.char) {
                await client.send('Input.dispatchKeyEvent', {
                    type: 'char',
                    text: input.char,
                    unmodifiedText: input.char
                });
             }
             break;
        default:
             logger.warn(`[Browser ${roomId}] Unknown event type: ${input.type}`);
             break;
      }
    } catch (e) {
      // Ignore input errors (race conditions)
    }
  }

  async stopSession(roomId) {
    const session = this.sessions.get(roomId);
    if (!session) return;

    try {
      this.io.to(roomId).emit('browser-closed');
      await session.browser.close();
    } catch (e) {
       // ignore
    }
    this.sessions.delete(roomId);
  }

  async cleanupSession(roomId) {
    this.stopSession(roomId);
  }

  getSession(roomId) {
    return this.sessions.get(roomId);
  }

  getStats(roomId) {
      return { status: 'active', type: 'cdp-screencast' };
  }
}

export default VirtualBrowserManager;
