// Core API Service
import { Platform } from 'react-native';

/**
 * Base API Service Class
 * Exported for inheritance by specialized services
 */
export class ApiService {
  constructor() {
    this._token = null;
    this._onUnauthorized = null;
  }

  setToken(token) {
    this._token = token;
  }

  getToken() {
    return this._token;
  }

  onUnauthorized(callback) {
    this._onUnauthorized = callback;
  }

  async request(endpoint, method = 'GET', body = null, params = null) {
    let url = `${API_BASE_URL}${endpoint}`;
    
    if (params && method === 'GET') {
      const queryString = new URLSearchParams(params).toString();
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    const config = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      console.log(`[API] ${method} ${url}`);
      
      // Add timeout to prevent long waits for non-existent endpoints
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        data = { error: response.statusText };
      }

      // Handle unauthorized (session expired)
      if (response.status === 401) {
        const errorMsg = data.message || data.error || 'Unauthorized';
        const isSessionError =
          errorMsg.toLowerCase().includes('session') ||
          errorMsg.toLowerCase().includes('token') ||
          errorMsg.toLowerCase().includes('expired');

        // Background/sync endpoints: clear token so future requests don't use it, but do NOT
        // trigger global logout (user may be in a call; let them stay until they leave).
        const soft401Endpoints = ['/friends/sync', '/tournaments/sync', '/ai/sync', '/auth/me'];
        const isSoftEndpoint = soft401Endpoints.some((e) => endpoint.includes(e));

        if (this._token && endpoint !== '/auth/login' && isSessionError) {
          console.warn(`[API] Session invalid: ${errorMsg}. Clearing token.`);
          this._token = null;
          if (!isSoftEndpoint && this._onUnauthorized) {
            this._onUnauthorized();
          }
        }

        throw new Error(errorMsg);
      }
      
      if (!response.ok) {
        const errorMsg = data.message || data.error || 'API Request Failed';
        const errorDetails = data.details ? ` (${JSON.stringify(data.details)})` : '';
        throw new Error(errorMsg + errorDetails);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`[API Timeout] ${endpoint}: Request timed out after 15s`);
        throw new Error('Request timeout');
      }
      if (!error.message.includes('Invalid session')) {
        console.error(`[API Error] ${endpoint}:`, error.message);
      }
      throw error;
    }
  }

  get(endpoint, params = null) {
    return this.request(endpoint, 'GET', null, params);
  }

  post(endpoint, body) {
    return this.request(endpoint, 'POST', body);
  }

  put(endpoint, body) {
    return this.request(endpoint, 'PUT', body);
  }

  delete(endpoint) {
    return this.request(endpoint, 'DELETE');
  }

  patch(endpoint, body) {
    return this.request(endpoint, 'PATCH', body);
  }
}

// Environment Configuration
const getBaseUrl = () => {
  return 'http://192.168.1.9:3001';
};

const DEV_URL = getBaseUrl();
const API_BASE_URL = `${DEV_URL}/api`;

export const api = new ApiService();
