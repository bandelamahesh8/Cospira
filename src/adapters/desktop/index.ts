import { DesktopAdapter } from '../types';
import { logger } from '@/utils/logger';
// For Tauri v2, imports might be specific. Using generic approach or v2 references if strictly known.
// But as per package.json it is v2.
// We'll use dynamic imports or assume standard v2 paths.
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
// import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export class TauriDesktopAdapter implements DesktopAdapter {
  constructor() {
    logger.info('[DesktopAdapter] Initialized');
    this.setupWindowListeners();
  }

  private async setupWindowListeners() {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.onCloseRequested(async (event) => {
        // Prevent the default close event
        event.preventDefault();
        // Hide the window instead
        await appWindow.hide();
        logger.info('[DesktopAdapter] Window hidden to tray');
      });
    } catch (error) {
      logger.error('[DesktopAdapter] Failed to setup window listeners:', error);
    }
  }

  async setTrayStatus(status: 'online' | 'idle' | 'offline'): Promise<void> {
    logger.debug('[DesktopAdapter] setTrayStatus:', status);
    try {
      await invoke('set_tray_status', { status });
    } catch (e) {
      logger.warn('[DesktopAdapter] Failed to set tray status:', e);
    }
  }

  async showNotification(title: string, body: string): Promise<void> {
    try {
      // Mock notification for now as plugin setup requires Rust changes
      // await sendNotification({ title, body });
      logger.info('[DesktopAdapter] showNotification:', title, body);
      await invoke('show_notification', { title, body });
    } catch (e) {
      logger.error('[DesktopAdapter] Notification error:', e);
    }
  }

  async requestMediaPermissions(): Promise<boolean> {
    // Tauri v2 on macOS requires entitlements.
    // We can rely on webview permissions or explicit commands.
    // For now, delegate to web API inside the webview, which Tauri handles.
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      return true;
    } catch (e) {
      logger.error('[DesktopAdapter] Media permission denied:', e);
      return false;
    }
  }

  async keepAlive(enable: boolean): Promise<void> {
    logger.debug('[DesktopAdapter] keepAlive:', enable);
    // try { await invoke('keep_alive', { enable }); } catch (e) {}
  }

  onSystemSleep(callback: () => void): void {
    // Listen to system events
    // getCurrentWindow().listen('system-sleep', callback);
    logger.debug('[DesktopAdapter] onSystemSleep registered', callback);
  }
}
