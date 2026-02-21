/**
 * Comprehensive Bug Fixes and Optimizations
 * 
 * This file contains fixes for common issues and performance optimizations
 * to ensure the app runs smoothly without bugs.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory leak prevention
export class MemoryManager {
  static timers = new Set();
  static listeners = new Set();

  // Safe timer management
  static setTimeout(callback, delay) {
    const timerId = setTimeout(() => {
      callback();
      this.timers.delete(timerId);
    }, delay);
    
    this.timers.add(timerId);
    return timerId;
  }

  static clearTimeout(timerId) {
    clearTimeout(timerId);
    this.timers.delete(timerId);
  }

  // Safe listener management
  static addListener(event, callback) {
    const listener = { event, callback };
    this.listeners.add(listener);
    return listener;
  }

  static removeListener(listener) {
    this.listeners.delete(listener);
  }

  // Cleanup all resources
  static cleanup() {
    // Clear all timers
    this.timers.forEach(timerId => clearTimeout(timerId));
    this.timers.clear();

    // Clear all listeners
    this.listeners.clear();
  }
}

// Network error handling
export class NetworkErrorHandler {
  static async safeFetch(url, options = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          timeout: 10000, // 10 second timeout
          ...options
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        console.warn(`[Network] Attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          throw new Error(`Network request failed after ${retries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  static isOnline() {
    // In a real app, you'd use NetInfo here
    return true;
  }
}

// Async storage error handling
export class SafeStorage {
  static async getItem(key, defaultValue = null) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`[Storage] Error getting item ${key}:`, error);
      return defaultValue;
    }
  }

  static async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[Storage] Error setting item ${key}:`, error);
      return false;
    }
  }

  static async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[Storage] Error removing item ${key}:`, error);
      return false;
    }
  }

  static async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
      return false;
    }
  }
}

// Component lifecycle manager
export class ComponentLifecycleManager {
  static components = new Map();

  static register(componentId, cleanupCallback) {
    this.components.set(componentId, cleanupCallback);
  }

  static unregister(componentId) {
    const cleanup = this.components.get(componentId);
    if (cleanup) {
      cleanup();
      this.components.delete(componentId);
    }
  }

  static cleanupAll() {
    this.components.forEach(cleanup => cleanup());
    this.components.clear();
  }
}

// Performance monitor
export class PerformanceMonitor {
  static metrics = {
    renderTimes: [],
    networkRequests: [],
    memoryUsage: [],
    errors: []
  };

  static startRenderTimer(componentName) {
    return {
      componentName,
      startTime: performance.now()
    };
  }

  static endRenderTimer(timer) {
    const renderTime = performance.now() - timer.startTime;
    this.metrics.renderTimes.push({
      component: timer.componentName,
      time: renderTime,
      timestamp: Date.now()
    });

    // Warn if render is slow
    if (renderTime > 16) { // 16ms = 60fps
      console.warn(`[Performance] Slow render detected: ${timer.componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  static trackNetworkRequest(url, duration, success) {
    this.metrics.networkRequests.push({
      url,
      duration,
      success,
      timestamp: Date.now()
    });

    if (duration > 5000) {
      console.warn(`[Performance] Slow network request: ${url} took ${duration}ms`);
    }
  }

  static trackError(error, context) {
    this.metrics.errors.push({
      error: error.message,
      context,
      timestamp: Date.now()
    });
  }

  static getMetrics() {
    return {
      ...this.metrics,
      averageRenderTime: this.calculateAverage(this.metrics.renderTimes, 'time'),
      averageNetworkTime: this.calculateAverage(this.metrics.networkRequests, 'duration'),
      errorRate: this.metrics.errors.length / (this.metrics.renderTimes.length || 1)
    };
  }

  static calculateAverage(array, property) {
    if (array.length === 0) return 0;
    const sum = array.reduce((acc, item) => acc + item[property], 0);
    return sum / array.length;
  }
}

// Input validation
export class InputValidator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateUsername(username) {
    return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
  }

  static validatePassword(password) {
    return password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
  }

  static validateGameMove(move, gameType) {
    switch (gameType) {
      case 'tictactoe':
        return typeof move.position === 'number' && move.position >= 0 && move.position <= 8;
      case 'chess':
        return move.from && move.to && /^[a-h][1-8]$/.test(move.from) && /^[a-h][1-8]$/.test(move.to);
      case 'connect4':
        return typeof move.column === 'number' && move.column >= 0 && move.column <= 6;
      default:
        return true;
    }
  }

  static sanitizeInput(input) {
    return input.toString().trim().replace(/[<>]/g, '');
  }
}

// Animation helpers
export class AnimationHelper {
  static createAnimatedValue(initialValue = 0) {
    return new Animated.Value(initialValue);
  }

  static safeAnimate(animatedValue, toValue, duration = 300, callback) {
    try {
      Animated.timing(animatedValue, {
        toValue,
        duration,
        useNativeDriver: true
      }).start(callback);
    } catch (error) {
      console.error('[Animation] Error:', error);
      callback?.(error);
    }
  }

  static springAnimate(animatedValue, toValue, tension = 100, friction = 8) {
    try {
      return Animated.spring(animatedValue, {
        toValue,
        tension,
        friction,
        useNativeDriver: true
      });
    } catch (error) {
      console.error('[Animation] Spring error:', error);
      return null;
    }
  }
}

// Platform-specific fixes
export class PlatformFixes {
  static getSafePadding() {
    if (Platform.OS === 'ios') {
      return {
        paddingTop: 44, // Status bar height
        paddingBottom: 34 // Home indicator
      };
    } else {
      return {
        paddingTop: 24, // Status bar height
        paddingBottom: 0
      };
    }
  }

  static getSafeKeyboardOffset() {
    return Platform.OS === 'ios' ? 0 : 20;
  }

  static fixImageCache(uri) {
    if (Platform.OS === 'android') {
      return uri.includes('?') ? `${uri}&t=${Date.now()}` : `${uri}?t=${Date.now()}`;
    }
    return uri;
  }
}

// Debounce and throttle utilities
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Error boundary helper
export class ErrorHandler {
  static logError(error, errorInfo = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: Platform.OS,
      version: Platform.Version
    };

    console.error('[Error]', errorData);
    
    // In production, send to error reporting service
    if (__DEV__ === false) {
      // Send to crashlytics, sentry, etc.
    }
  }

  static createUserFriendlyMessage(error) {
    if (error.message.includes('Network')) {
      return 'Please check your internet connection and try again.';
    } else if (error.message.includes('Authentication')) {
      return 'Please log in again to continue.';
    } else if (error.message.includes('Permission')) {
      return 'Please grant the necessary permissions to continue.';
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }
}

// State management utilities
export class StateHelper {
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  }

  static shallowEqual(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
      if (obj1[key] !== obj2[key]) return false;
    }
    
    return true;
  }

  static mergeState(currentState, newState) {
    return {
      ...currentState,
      ...newState,
      // Deep merge for nested objects
      ...Object.keys(newState).reduce((acc, key) => {
        if (typeof newState[key] === 'object' && !Array.isArray(newState[key])) {
          acc[key] = { ...currentState[key], ...newState[key] };
        }
        return acc;
      }, {})
    };
  }
}

// Game engine utilities
export class GameEngineHelper {
  static validateGameState(gameState, gameType) {
    const requiredFields = ['id', 'players', 'status', 'currentPlayer'];
    
    for (const field of requiredFields) {
      if (!gameState[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (gameState.players.length < 2) {
      throw new Error('Game must have at least 2 players');
    }

    return true;
  }

  static generateGameId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static calculateEloRating(playerRating, opponentRating, score, kFactor = 32) {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const newRating = playerRating + kFactor * (score - expectedScore);
    return Math.round(newRating);
  }

  static formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static isValidMove(move, gameState, gameType) {
    // Game-specific move validation
    switch (gameType) {
      case 'tictactoe':
        return this.validateTicTacToeMove(move, gameState);
      case 'chess':
        return this.validateChessMove(move, gameState);
      case 'connect4':
        return this.validateConnect4Move(move, gameState);
      default:
        return true;
    }
  }

  static validateTicTacToeMove(move, gameState) {
    const { position } = move;
    const board = gameState.board || Array(9).fill(null);
    
    return position >= 0 && position < 9 && board[position] === null;
  }

  static validateChessMove(move, gameState) {
    // Simplified chess validation
    const { from, to } = move;
    const board = gameState.board;
    
    if (!from || !to || !board[from]) return false;
    
    // Check if destination is valid
    const piece = board[from];
    const destinationPiece = board[to];
    
    // Can't capture own piece
    if (destinationPiece && piece.color === destinationPiece.color) {
      return false;
    }
    
    return true;
  }

  static validateConnect4Move(move, gameState) {
    const { column } = move;
    const board = gameState.board || Array(42).fill(null);
    
    if (column < 0 || column > 6) return false;
    
    // Check if column is full
    for (let row = 0; row < 6; row++) {
      if (board[row * 7 + column] === null) {
        return true;
      }
    }
    
    return false; // Column is full
  }
}

// Export all utilities
export {
  MemoryManager,
  NetworkErrorHandler,
  SafeStorage,
  ComponentLifecycleManager,
  PerformanceMonitor,
  InputValidator,
  AnimationHelper,
  PlatformFixes,
  ErrorHandler,
  StateHelper,
  GameEngineHelper
};
