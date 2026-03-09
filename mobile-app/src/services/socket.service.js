import io from 'socket.io-client';
import { Platform } from 'react-native';

// Helper to get dynamic URL
// EXPO_PUBLIC_SERVER_HOST: override for native (e.g. '192.168.1.3' for LAN, '10.0.2.2' for Android emulator)
const getSocketUrl = () => {
  if (Platform.OS === 'web') {
    const isSecure = window.location.protocol === 'https:';
    const host = window.location.hostname === 'localhost' ? 'localhost' : '192.168.1.9';
    return isSecure ? `https://${host}:3001` : `http://${host}:3001`;
  }
  return 'http://192.168.1.9:3001';
};

class SocketService {
  constructor() {
    this.socket = null;
    this.connectionPromise = null;
  }

  connect(token, retryCount = 0) {
    // If already connected, return immediately
    if (this.socket && this.socket.connected) {
      console.log('[Socket] Already connected');
      return Promise.resolve();
    }

    // If connection is in progress, return the existing promise
    if (this.connectionPromise) {
      console.log('[Socket] Connection already in progress');
      return this.connectionPromise;
    }

    // Create new connection promise
    this.connectionPromise = new Promise((resolve, reject) => {
      const url = getSocketUrl();
      console.log(`[Socket] Attempt ${retryCount + 1}: Connecting to ${url}...`);
      console.log('[Socket] Auth:', token ? 'With token' : 'Anonymous');

      this.socket = io(url, {
        auth: { token },
        path: '/socket.io',
        transports: ['websocket', 'polling'], // Add polling as fallback
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000, // Increased from default 20s
        secure: url.startsWith('https') || url.startsWith('wss'),
        rejectUnauthorized: false // Allow self-signed certs in dev
      });

      // Set up one-time connection handlers
      const onConnect = () => {
        console.log('[Socket] ✅ Connected successfully to server');
        console.log('[Socket] Socket ID:', this.socket.id);
        cleanup();
        this.connectionPromise = null;
        resolve();
      };

      const onConnectError = (err) => {
        console.error('[Socket] ❌ Connection error:', err.message);
        console.error('[Socket] Error type:', err.type);
        console.error('[Socket] Error description:', err.description);
        
        // Provide helpful diagnostic info
        if (err.message.includes('timeout')) {
          console.error('[Socket] DIAGNOSIS: Server not responding. Check if server is running and accessible.');
        } else if (err.message.includes('ECONNREFUSED')) {
          console.error('[Socket] DIAGNOSIS: Connection refused. Server may not be listening on this port.');
        } else if (err.message.includes('CORS')) {
          console.error('[Socket] DIAGNOSIS: CORS error. Server may not allow connections from this origin.');
        }
        
        cleanup();
        this.connectionPromise = null;
        
        // Retry logic with exponential backoff
        if (retryCount < 2) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
          console.log(`[Socket] Retrying in ${delay}ms...`);
          setTimeout(() => {
            this.connect(token, retryCount + 1).then(resolve).catch(reject);
          }, delay);
        } else {
          reject(err);
        }
      };

      const onError = (err) => {
        console.error('[Socket] Socket error:', err);
      };

      const cleanup = () => {
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onConnectError);
      };

      // Set up persistent error handler
      this.socket.on('error', onError);
      
      // Set up one-time connection handlers
      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onConnectError);

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected. Reason:', reason);
      });

      // Timeout after 10 seconds (increased from 5)
      setTimeout(() => {
        if (!this.socket?.connected) {
          console.error('[Socket] ⏱️ Connection timeout after 10 seconds');
          console.error('[Socket] URL attempted:', url);
          console.error('[Socket] Platform:', Platform.OS);
          cleanup();
          this.connectionPromise = null;
          
          // Retry on timeout
          if (retryCount < 2) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`[Socket] Retrying in ${delay}ms...`);
            setTimeout(() => {
              this.connect(token, retryCount + 1).then(resolve).catch(reject);
            }, delay);
          } else {
            reject(new Error('Connection timeout after multiple attempts'));
          }
        }
      }, 10000); // Increased from 5000
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event, ...args) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  joinRoom(roomId, password, user) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('Socket not initialized'));
      }
      this.socket.emit('join-room', { roomId, password: password || '', user }, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Failed to join room'));
        }
      });
    });
  }

  leaveRoom(roomId) {
    this.emit('leave-room', { roomId });
  }

  getUserActivity(limit = 20) {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));
      
      this.socket.emit('get-user-activity', { limit }, (response) => {
        if (response?.success) {
          resolve(response.activities);
        } else {
          reject(new Error(response?.error || 'Failed to fetch activity'));
        }
      });
    });
  }
}

export const socketService = new SocketService();
