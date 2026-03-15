import logger from '../../logger.js';

/**
 * AI Browser Intent Parser
 * Parses natural language commands into browser actions
 * Security: Only allows safe, read-only operations
 */

// Allowed action types
export const BROWSER_ACTIONS = {
  NAVIGATE: 'navigate',
  CLICK: 'click',
  SCROLL: 'scroll',
  TYPE: 'type',
  EXTRACT: 'extract',
  SCREENSHOT: 'screenshot',
  SEARCH: 'search',
  WAIT: 'wait',
  UNKNOWN: 'unknown'
};

// Security: Blocked patterns
const BLOCKED_PATTERNS = [
  /download/i,
  /install/i,
  /delete/i,
  /remove/i,
  /login/i,
  /password/i,
  /credit\s*card/i,
  /payment/i,
  /purchase/i,
  /buy/i,
  /checkout/i,
  /admin/i,
  /sudo/i,
  /execute/i,
  /eval/i,
  /script/i
];

// Intent patterns for each action
const INTENT_PATTERNS = {
  navigate: [
    /go to (.+)/i,
    /open (.+)/i,
    /visit (.+)/i,
    /navigate to (.+)/i,
    /load (.+)/i,
    /browse to (.+)/i
  ],
  click: [
    /click (?:on )?(.+)/i,
    /press (?:on )?(.+)/i,
    /tap (?:on )?(.+)/i,
    /select (.+)/i,
    /choose (.+)/i
  ],
  scroll: [
    /scroll (up|down|to top|to bottom)/i,
    /scroll to (.+)/i,
    /page (up|down)/i,
    /go (up|down)/i
  ],
  type: [
    /type (.+)/i,
    /enter (.+)/i,
    /input (.+)/i,
    /write (.+)/i,
    /fill (.+)/i
  ],
  search: [
    /search (?:for )?(.+)/i,
    /find (.+)/i,
    /look for (.+)/i,
    /google (.+)/i
  ],
  extract: [
    /extract (.+)/i,
    /get (.+)/i,
    /read (.+)/i,
    /copy (.+)/i,
    /grab (.+)/i
  ],
  screenshot: [
    /screenshot/i,
    /capture/i,
    /take (?:a )?picture/i,
    /snap/i
  ],
  wait: [
    /wait (\d+) (?:seconds?|secs?)/i,
    /pause (\d+)/i,
    /sleep (\d+)/i
  ]
};

/**
 * Parse a natural language command into a browser action
 * @param {string} command - User's natural language command
 * @returns {Object} Parsed action with type and parameters
 */
export function parseIntent(command) {
  try {
    if (!command || typeof command !== 'string') {
      return {
        action: BROWSER_ACTIONS.UNKNOWN,
        error: 'Invalid command'
      };
    }

    const normalizedCommand = command.trim().toLowerCase();

    // Security check: Block dangerous patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(normalizedCommand)) {
        logger.warn(`[BrowserIntentParser] Blocked dangerous command: ${command}`);
        return {
          action: BROWSER_ACTIONS.UNKNOWN,
          error: 'Command blocked for security reasons',
          blocked: true
        };
      }
    }

    // Try to match against intent patterns
    for (const [actionType, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        const match = normalizedCommand.match(pattern);
        if (match) {
          return buildAction(actionType, match, command);
        }
      }
    }

    // No match found
    return {
      action: BROWSER_ACTIONS.UNKNOWN,
      error: 'Could not understand command',
      originalCommand: command
    };

  } catch (error) {
    logger.error('[BrowserIntentParser] Error parsing intent:', error);
    return {
      action: BROWSER_ACTIONS.UNKNOWN,
      error: error.message
    };
  }
}

/**
 * Build action object from matched pattern
 * @param {string} actionType - Type of action
 * @param {Array} match - Regex match result
 * @param {string} originalCommand - Original command
 * @returns {Object} Action object
 */
function buildAction(actionType, match, originalCommand) {
  const action = {
    action: actionType,
    originalCommand,
    timestamp: new Date().toISOString()
  };

  switch (actionType) {
    case 'navigate':
      action.url = normalizeUrl(match[1]);
      break;

    case 'click':
      action.target = match[1].trim();
      action.selector = generateSelector(match[1]);
      break;

    case 'scroll':
      action.direction = match[1].toLowerCase();
      action.amount = getScrollAmount(match[1]);
      break;

    case 'type':
      action.text = match[1].trim();
      break;

    case 'search':
      action.query = match[1].trim();
      action.url = `https://www.google.com/search?q=${encodeURIComponent(match[1].trim())}`;
      break;

    case 'extract':
      action.target = match[1].trim();
      action.selector = generateSelector(match[1]);
      break;

    case 'screenshot':
      action.fullPage = true;
      break;

    case 'wait':
      action.duration = parseInt(match[1]) * 1000; // Convert to ms
      break;

    default:
      action.error = 'Unknown action type';
  }

  return action;
}

/**
 * Normalize URL (add protocol if missing)
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  url = url.trim();
  
  // If it looks like a domain without protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Check if it's a search query or a domain
    if (url.includes(' ') || !url.includes('.')) {
      // Treat as search query
      return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    // Add https:// to domain
    return `https://${url}`;
  }
  
  return url;
}

/**
 * Generate CSS selector from natural language target
 * @param {string} target - Natural language target description
 * @returns {string} CSS selector
 */
function generateSelector(target) {
  target = target.toLowerCase().trim();
  
  // Common button patterns
  if (target.includes('button')) {
    const buttonText = target.replace(/button/i, '').trim();
    if (buttonText) {
      return `button:contains("${buttonText}"), input[type="button"][value*="${buttonText}"]`;
    }
    return 'button';
  }
  
  // Link patterns
  if (target.includes('link')) {
    const linkText = target.replace(/link/i, '').trim();
    if (linkText) {
      return `a:contains("${linkText}")`;
    }
    return 'a';
  }
  
  // Input/form patterns
  if (target.includes('search box') || target.includes('search bar')) {
    return 'input[type="search"], input[name*="search"], input[placeholder*="search"]';
  }
  
  if (target.includes('input') || target.includes('text box')) {
    return 'input[type="text"], input:not([type])';
  }
  
  // Generic text-based selector
  return `*:contains("${target}")`;
}

/**
 * Get scroll amount from direction
 * @param {string} direction - Scroll direction
 * @returns {number} Scroll amount in pixels
 */
function getScrollAmount(direction) {
  const dir = direction.toLowerCase();
  
  if (dir.includes('top')) return -999999; // Scroll to top
  if (dir.includes('bottom')) return 999999; // Scroll to bottom
  if (dir.includes('up')) return -500;
  if (dir.includes('down')) return 500;
  
  return 500; // Default
}

/**
 * Validate action for security
 * @param {Object} action - Action to validate
 * @returns {Object} Validation result
 */
export function validateAction(action) {
  if (!action || !action.action) {
    return { valid: false, error: 'Invalid action' };
  }

  // Check if action type is allowed
  if (!Object.values(BROWSER_ACTIONS).includes(action.action)) {
    return { valid: false, error: 'Unknown action type' };
  }

  // Specific validations
  switch (action.action) {
    case BROWSER_ACTIONS.NAVIGATE:
    case BROWSER_ACTIONS.SEARCH:
      if (!action.url) {
        return { valid: false, error: 'URL required' };
      }
      // Only allow http/https protocols
      if (!action.url.startsWith('http://') && !action.url.startsWith('https://')) {
        return { valid: false, error: 'Only HTTP/HTTPS URLs allowed' };
      }
      break;

    case BROWSER_ACTIONS.TYPE:
      if (!action.text) {
        return { valid: false, error: 'Text required' };
      }
      // Limit text length
      if (action.text.length > 500) {
        return { valid: false, error: 'Text too long (max 500 characters)' };
      }
      break;

    case BROWSER_ACTIONS.WAIT:
      if (!action.duration || action.duration < 0 || action.duration > 30000) {
        return { valid: false, error: 'Wait duration must be between 0-30 seconds' };
      }
      break;
  }

  return { valid: true };
}

export default {
  parseIntent,
  validateAction,
  BROWSER_ACTIONS
};
