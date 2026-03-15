import logger from '../../logger.js';
import { BROWSER_ACTIONS } from './BrowserIntentParser.js';

/**
 * Browser Action Executor
 * Safely executes parsed browser actions using Playwright
 */

export class BrowserActionExecutor {
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Execute a parsed action
   * @param {string} roomId - Room ID
   * @param {Object} action - Parsed action object
   * @returns {Promise<Object>} Execution result
   */
  async executeAction(roomId, action) {
    try {
      const session = this.browserManager.getSession(roomId);
      
      if (!session || !session.page) {
        return {
          success: false,
          error: 'No active browser session'
        };
      }

      const page = session.page;

      logger.info(`[BrowserActionExecutor] Executing ${action.action} for room ${roomId}`);

      switch (action.action) {
        case BROWSER_ACTIONS.NAVIGATE:
          return await this.executeNavigate(page, action);

        case BROWSER_ACTIONS.CLICK:
          return await this.executeClick(page, action);

        case BROWSER_ACTIONS.SCROLL:
          return await this.executeScroll(page, action);

        case BROWSER_ACTIONS.TYPE:
          return await this.executeType(page, action);

        case BROWSER_ACTIONS.SEARCH:
          return await this.executeSearch(page, action);

        case BROWSER_ACTIONS.EXTRACT:
          return await this.executeExtract(page, action);

        case BROWSER_ACTIONS.SCREENSHOT:
          return await this.executeScreenshot(page, action);

        case BROWSER_ACTIONS.WAIT:
          return await this.executeWait(page, action);

        default:
          return {
            success: false,
            error: 'Unknown action type'
          };
      }

    } catch (error) {
      logger.error('[BrowserActionExecutor] Error executing action:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Navigate to URL
   */
  async executeNavigate(page, action) {
    try {
      await page.goto(action.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      return {
        success: true,
        message: `Navigated to ${action.url}`,
        url: page.url()
      };
    } catch (error) {
      return {
        success: false,
        error: `Navigation failed: ${error.message}`
      };
    }
  }

  /**
   * Click on element
   */
  async executeClick(page, action) {
    try {
      // Try to find element by text content first
      const element = await page.locator(`text=${action.target}`).first();
      
      if (await element.count() > 0) {
        await element.click({ timeout: 5000 });
        return {
          success: true,
          message: `Clicked on "${action.target}"`
        };
      }

      // Fallback: Try CSS selector
      if (action.selector) {
        await page.click(action.selector, { timeout: 5000 });
        return {
          success: true,
          message: `Clicked on element`
        };
      }

      return {
        success: false,
        error: `Could not find "${action.target}" to click`
      };

    } catch (error) {
      return {
        success: false,
        error: `Click failed: ${error.message}`
      };
    }
  }

  /**
   * Scroll page
   */
  async executeScroll(page, action) {
    try {
      const amount = action.amount || 500;

      if (action.direction.includes('top')) {
        await page.evaluate(() => window.scrollTo(0, 0));
      } else if (action.direction.includes('bottom')) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      } else {
        await page.evaluate((amt) => window.scrollBy(0, amt), amount);
      }

      return {
        success: true,
        message: `Scrolled ${action.direction}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Scroll failed: ${error.message}`
      };
    }
  }

  /**
   * Type text into input
   */
  async executeType(page, action) {
    try {
      // Find focused input or first visible input
      const input = await page.locator('input:visible, textarea:visible').first();
      
      if (await input.count() > 0) {
        await input.fill(action.text);
        return {
          success: true,
          message: `Typed "${action.text.substring(0, 50)}${action.text.length > 50 ? '...' : ''}"`
        };
      }

      return {
        success: false,
        error: 'No input field found'
      };

    } catch (error) {
      return {
        success: false,
        error: `Type failed: ${error.message}`
      };
    }
  }

  /**
   * Search (navigate to Google search)
   */
  async executeSearch(page, action) {
    try {
      await page.goto(action.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      return {
        success: true,
        message: `Searching for "${action.query}"`,
        url: page.url()
      };

    } catch (error) {
      return {
        success: false,
        error: `Search failed: ${error.message}`
      };
    }
  }

  /**
   * Extract text from page
   */
  async executeExtract(page, action) {
    try {
      let text = '';

      // Try to extract specific element
      if (action.target) {
        const element = await page.locator(`text=${action.target}`).first();
        if (await element.count() > 0) {
          text = await element.textContent();
        }
      }

      // Fallback: Extract page title and first paragraph
      if (!text) {
        const title = await page.title();
        const firstPara = await page.locator('p').first().textContent().catch(() => '');
        text = `${title}\n\n${firstPara}`;
      }

      return {
        success: true,
        message: 'Text extracted',
        data: text.substring(0, 500) // Limit to 500 chars
      };

    } catch (error) {
      return {
        success: false,
        error: `Extract failed: ${error.message}`
      };
    }
  }

  /**
   * Take screenshot
   */
  async executeScreenshot(page, action) {
    try {
      const screenshot = await page.screenshot({
        fullPage: action.fullPage || false,
        type: 'png'
      });

      return {
        success: true,
        message: 'Screenshot captured',
        data: screenshot.toString('base64')
      };

    } catch (error) {
      return {
        success: false,
        error: `Screenshot failed: ${error.message}`
      };
    }
  }

  /**
   * Wait/pause
   */
  async executeWait(page, action) {
    try {
      await page.waitForTimeout(action.duration);

      return {
        success: true,
        message: `Waited ${action.duration / 1000} seconds`
      };

    } catch (error) {
      return {
        success: false,
        error: `Wait failed: ${error.message}`
      };
    }
  }
}

export default BrowserActionExecutor;
