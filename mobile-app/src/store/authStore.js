import { authService } from '../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const SESSION_KEY = '@cospira_session';
const SESSION_DURATION = 10 * 24 * 60 * 60 * 1000; // 10 days in milliseconds

export const authStore = {
  user: null, // { id, username, email, role }
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
  
  // Basic subscriber pattern for updates (simplified for now)
  listeners: [],
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },
  notify() {
    this.listeners.forEach(l => l());
  },

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('[AuthStore] Initializing session from storage...');
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      
      if (sessionData) {
        const { token, refreshToken, user, expiresAt } = JSON.parse(sessionData);
        
        // Check for session expiration (Sliding Window: 10 days since last app open)
        if (expiresAt && Date.now() > expiresAt) {
          console.warn('[AuthStore] Session expired after 10 days of inactivity');
          await this.logout();
          return;
        }

        if (token && user) {
          this.token = token;
          this.refreshToken = refreshToken;
          this.user = user;
          this.isAuthenticated = true;
          api.setToken(token);
          
          console.log('[AuthStore] Session found. Checking refresh requirements...');
          
          // Reset the 10-day window on every app open
          try {
            if (user.role !== 'guest') {
                await this.refreshSession(refreshToken || token);
            } else {
                await this._updateSessionStorage();
            }
          } catch (refreshErr) {
            console.error('[AuthStore] Initial refresh failed:', refreshErr.message);
            // If refresh fails but we have a token, we might still be able to use the app 
            // if the access token hasn't reached its own short-term expiry.
            // But for security, if sliding window failed, we update the expiry anyway if still authenticated.
            if (this.isAuthenticated) {
                await this._updateSessionStorage();
            }
          }
        }
      }
      
      // Register unauthorized listener (idempotent)
      api.onUnauthorized(() => {
        console.warn('[AuthStore] Session expired or invalid - logging out');
        this.logout();
      });
    } catch (err) {
      console.error('[AuthStore] Initialization failed:', err.message);
    } finally {
      this.isInitialized = true;
      this.notify();
    }
  },

  async login(email, password) {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      console.log('[AuthStore] Attempting login for:', email);
      const response = await authService.login(email, password);
      
      // Assuming response structure: { token, refreshToken, user }
      if (response && response.token) {
        this.user = response.user;
        this.token = response.token;
        this.refreshToken = response.refreshToken;
        this.isAuthenticated = true;
        
        // Save to storage with 10-day expiry
        await this._updateSessionStorage();
        
        console.log('[AuthStore] Login success and session saved:', this.user.username);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('[AuthStore] Login failed:', err.message);
      this.error = err.message;
      this.isAuthenticated = false;
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  },

  async refreshSession(refreshToken) {
    try {
      const response = await authService.refreshSession(refreshToken || this.refreshToken);
      if (response && response.token) {
        this.token = response.token;
        if (response.refreshToken) {
          this.refreshToken = response.refreshToken;
        }
        if (response.user) {
          this.user = response.user;
        }
        
        await this._updateSessionStorage();
        console.log('[AuthStore] Session refreshed successfully');
        this.notify();
      }
    } catch (err) {
      console.error('[AuthStore] Refresh session failed:', err.message);
      throw err;
    }
  },

  async _updateSessionStorage() {
    try {
      const expiresAt = Date.now() + SESSION_DURATION;
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
        token: this.token,
        refreshToken: this.refreshToken,
        user: this.user,
        expiresAt
      }));
    } catch (err) {
      console.error('[AuthStore] Failed to update storage:', err.message);
    }
  },

  async loginAsGuest() {
    this.isLoading = true;
    this.notify();

    try {
      const guestId = 'guest-' + Math.floor(Math.random() * 100000);
      const guestUser = {
        id: guestId,
        username: `Guest_${guestId.split('-')[1]}`,
        email: `${guestId}@cospira.com`,
        role: 'guest'
      };

      // For guests, we use a dummy token or no token depending on API requirements
      // In this app, many things might need a token, so we provide a placeholder
      const guestToken = 'guest-session-token-' + Date.now();

      this.user = guestUser;
      this.token = guestToken;
      this.isAuthenticated = true;
      api.setToken(guestToken);

      await this._updateSessionStorage();

      console.log('[AuthStore] Logged in as guest:', guestUser.username);
    } catch (err) {
      console.error('[AuthStore] Guest login failed:', err.message);
      this.error = err.message;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  },

  async refreshProfile() {
    try {
      const response = await authService.getProfile();
      if (response && response.user) {
        console.log('[AuthStore] Profile refreshed. Email:', response.user.email);
        this.user = response.user;
        
        // Update stored session if profile details changed
        const sessionData = await AsyncStorage.getItem(SESSION_KEY);
        if (sessionData) {
          const currentSession = JSON.parse(sessionData);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
            ...currentSession,
            user: response.user
          }));
        }
        
        this.notify();
      }
    } catch (err) {
      console.error('[AuthStore] Profile refresh failed:', err.message);
    }
  },

  async logout() {
    try {
      await authService.logout();
      await AsyncStorage.removeItem(SESSION_KEY);
      this.user = null;
      this.token = null;
      this.refreshToken = null;
      this.isAuthenticated = false;
      console.log('[AuthStore] Logged out and session cleared');
      this.notify();
    } catch (err) {
      console.error('[AuthStore] Logout failed:', err.message);
    }
  }
};

