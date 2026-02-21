export interface DesktopAdapter {
  setTrayStatus(status: 'online' | 'idle' | 'offline'): Promise<void>;
  showNotification(title: string, body: string): Promise<void>;
  requestMediaPermissions(): Promise<boolean>;
  keepAlive(enable: boolean): Promise<void>;
  onSystemSleep(callback: () => void): void;
}
