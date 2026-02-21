

class Logger {
  private static isDev = import.meta.env.DEV;
  private static forceEnabled = false;

  static init() {
    try {
        if (localStorage.getItem('cospira_debug') === 'true') {
            this.forceEnabled = true;
            // eslint-disable-next-line no-console
            console.log('[Logger] Hard Logging Enabled via LocalStorage');
        }
    } catch (_e) { /* ignore */ }

    // Global Interaction Logging (Phase 0 Requirement)
    if (this.isDev || this.forceEnabled) {
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const clickable = target.closest('button, a, [role="button"], input, select, textarea') as HTMLElement;
            if (clickable) {
                const label = clickable.innerText || (clickable as HTMLInputElement).value || clickable.getAttribute('aria-label') || clickable.tagName;
                // eslint-disable-next-line no-console
                console.debug(`[UI Interaction] Clicked: ${label.substring(0, 50)}`, { 
                    tag: clickable.tagName, 
                    id: clickable.id, 
                    classes: clickable.className 
                });
            }
        }, { capture: true, passive: true });
    }
  }

  static info(message: string, ...args: unknown[]) {
    if (this.isDev || this.forceEnabled) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: unknown[]) {
    // Warnings should always be visible in most cases, or at least in hard check
    if (this.isDev || this.forceEnabled) { // Always show warnings? Phase 0 says "log every error"
        // eslint-disable-next-line no-console
        console.warn(`[WARN] ${message}`, ...args);
    }
  }

  static error(message: string, ...args: unknown[]) {
    // Errors must always be visible
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, ...args);
  }

  static debug(message: string, ...args: unknown[]) {
    if (this.isDev || this.forceEnabled) {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

export const logger = Logger;
