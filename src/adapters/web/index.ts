import { DesktopAdapter } from '../types';
import { logger } from '@/utils/logger';

export class WebAdapter implements DesktopAdapter {
  async setTrayStatus(status: 'online' | 'idle' | 'offline'): Promise<void> {
    logger.debug('[WebAdapter] setTrayStatus:', status);
    // No-op on web
  }

  async showNotification(title: string, body: string): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else {
        logger.debug('[WebAdapter] Notification permission not granted');
    }
  }

  async requestMediaPermissions(): Promise<boolean> {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      return true;
    } catch (error) {
      logger.error('[WebAdapter] Media permission denied:', error);
      return false;
    }
  }

  async keepAlive(enable: boolean): Promise<void> {
    logger.debug('[WebAdapter] keepAlive:', enable);
    // No-op or use generic wake lock API if needed
  }

  onSystemSleep(_callback: () => void): void {
      // No standard API for sleep detection in generic web, 
      // but visibilitychange can capture some aspects
      document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
              // Not exactly sleep, but close enough for web context
          }
      });
  }
}
