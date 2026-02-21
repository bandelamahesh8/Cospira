import AsyncStorage from '@react-native-async-storage/async-storage';
import { friendsService } from './friends.service';
import { tournamentService } from './tournament.service';
import { aiService } from './ai.service';
import { socketService } from './socket.service';
import { api } from './api';

class DataSyncService {
  constructor() {
    this.syncInterval = null;
    this.isOnline = true;
    this.pendingOperations = [];
    this.lastSyncTime = null;
    this.listeners = [];
  }

  // Initialize data sync service
  async initialize() {
    try {
      // Load last sync time
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      this.lastSyncTime = lastSync ? new Date(lastSync) : new Date(0);
      
      // Load pending operations
      const pending = await AsyncStorage.getItem('pending_operations');
      this.pendingOperations = pending ? JSON.parse(pending) : [];
      
      // Setup network monitoring
      this.setupNetworkMonitoring();
      
      // Setup socket listeners
      this.setupSocketListeners();
      
      // Start periodic sync
      this.startPeriodicSync();
      
      // Initial sync
      await this.syncAllData();
      
      console.log('[DataSyncService] Initialized successfully');
    } catch (error) {
      console.error('[DataSyncService] Initialization error:', error);
    }
  }

  setupNetworkMonitoring() {
    // Monitor network status
    this.isOnline = true; // Assume online initially
    
    // In a real app, you'd use NetInfo here
    // NetInfo.addEventListener(state => {
    //   this.isOnline = state.isConnected;
    //   if (this.isOnline) {
    //     this.syncPendingOperations();
    //   }
    // });
  }

  setupSocketListeners() {
    // Listen for real-time data updates
    socketService.on('data_update', (data) => {
      this.handleRealtimeUpdate(data);
    });

    socketService.on('sync_required', async () => {
      await this.syncAllData();
    });
  }

  startPeriodicSync() {
    // Sync every 30 seconds
    this.syncInterval = setInterval(async () => {
      if (this.isOnline) {
        await this.syncAllData();
      }
    }, 30000);
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync all data
  async syncAllData() {
    try {
      if (!this.isOnline) {
        console.log('[DataSyncService] Offline, skipping sync');
        return;
      }

      // Safeguard: Don't sync if we don't have a token
      if (!api.getToken()) {
        // console.log('[DataSyncService] No auth token, skipping sync');
        return;
      }

      const syncStartTime = Date.now();
      
      // Sync friends data
      await this.syncFriendsData();
      
      // Sync tournament data
      await this.syncTournamentData();
      
      // Sync AI data
      await this.syncAIData();
      
      // Sync user profile
      await this.syncUserProfile();
      
      // Update last sync time
      this.lastSyncTime = new Date();
      await AsyncStorage.setItem('last_sync_time', this.lastSyncTime.toISOString());
      
      // Process pending operations
      await this.processPendingOperations();
      
      const syncDuration = Date.now() - syncStartTime;
      console.log(`[DataSyncService] Sync completed in ${syncDuration}ms`);
      
      this.notifyListeners('sync_completed', { 
        duration: syncDuration,
        timestamp: this.lastSyncTime 
      });
      
    } catch (error) {
      // Handle session expiry gracefully
      if (error.message && error.message.includes('Invalid session')) {
        console.log('[DataSyncService] Sync aborted due to invalid session');
      } else {
        console.error('[DataSyncService] Sync error:', error);
      }
      this.notifyListeners('sync_error', { error });
    }
  }

  // Sync friends data (401/session errors do not throw - avoid triggering logout while in call)
  async syncFriendsData() {
    try {
      const data = await api.post('/friends/sync', {
        lastSync: this.lastSyncTime?.toISOString?.() || new Date(0).toISOString(),
      });
      if (data?.friends) await this.updateLocalFriends(data.friends);
      if (data?.requests) await this.updateLocalFriendRequests(data.requests);
      if (data?.presence) await this.updateLocalPresence(data.presence);
    } catch (error) {
      if (error?.message?.includes('Invalid session') || error?.message?.includes('Unauthorized')) {
        console.log('[DataSyncService] Friends sync skipped (session invalid)');
        return;
      }
      console.error('[DataSyncService] Friends sync error:', error?.message);
      throw error;
    }
  }

  async syncTournamentData() {
    try {
      const data = await api.post('/tournaments/sync', {
        lastSync: this.lastSyncTime?.toISOString?.() || new Date(0).toISOString(),
      });
      if (data?.tournaments) await this.updateLocalTournaments(data.tournaments);
      if (data?.matches) await this.updateLocalMatches(data.matches);
      if (data?.participations) await this.updateLocalParticipations(data.participations);
    } catch (error) {
      if (error?.message?.includes('Invalid session') || error?.message?.includes('Unauthorized')) {
        console.log('[DataSyncService] Tournament sync skipped (session invalid)');
        return;
      }
      console.error('[DataSyncService] Tournament sync error:', error?.message);
      throw error;
    }
  }

  async syncAIData() {
    try {
      const data = await api.post('/ai/sync', {
        lastSync: this.lastSyncTime?.toISOString?.() || new Date(0).toISOString(),
      });
      if (data?.summaries) await this.updateLocalSummaries(data.summaries);
      if (data?.analysis) await this.updateLocalAnalysis(data.analysis);
    } catch (error) {
      if (error?.message?.includes('Invalid session') || error?.message?.includes('Unauthorized')) {
        console.log('[DataSyncService] AI sync skipped (session invalid)');
        return;
      }
      console.error('[DataSyncService] AI sync error:', error?.message);
      throw error;
    }
  }

  async syncUserProfile() {
    try {
      const profile = await api.get('/auth/me');
      await this.updateLocalProfile(profile);
    } catch (error) {
      if (error?.message?.includes('Invalid session') || error?.message?.includes('Unauthorized')) {
        console.log('[DataSyncService] Profile sync skipped (session invalid)');
        return;
      }
      console.error('[DataSyncService] Profile sync error:', error?.message);
      throw error;
    }
  }

  // Handle real-time updates
  handleRealtimeUpdate(data) {
    switch (data.type) {
      case 'friend_request':
        this.handleFriendRequestUpdate(data);
        break;
      case 'tournament_update':
        this.handleTournamentUpdate(data);
        break;
      case 'presence_update':
        this.handlePresenceUpdate(data);
        break;
      default:
        console.log('[DataSyncService] Unknown update type:', data.type);
    }
  }

  handleFriendRequestUpdate(data) {
    // Update local friends data in real-time
    this.notifyListeners('friend_request_update', data);
  }

  handleTournamentUpdate(data) {
    // Update local tournament data in real-time
    this.notifyListeners('tournament_update', data);
  }

  handlePresenceUpdate(data) {
    // Update local presence data in real-time
    this.notifyListeners('presence_update', data);
  }

  // Add pending operation
  async addPendingOperation(operation) {
    try {
      this.pendingOperations.push({
        ...operation,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        retries: 0
      });
      
      await AsyncStorage.setItem('pending_operations', JSON.stringify(this.pendingOperations));
      
      // Try to process immediately if online
      if (this.isOnline) {
        await this.processPendingOperations();
      }
    } catch (error) {
      console.error('[DataSyncService] Add pending operation error:', error);
    }
  }

  // Process pending operations
  async processPendingOperations() {
    try {
      const operations = [...this.pendingOperations];
      const processed = [];
      const failed = [];
      
      for (const operation of operations) {
        try {
          const success = await this.executeOperation(operation);
          if (success) {
            processed.push(operation);
          } else {
            failed.push(operation);
          }
        } catch (error) {
          console.error('[DataSyncService] Operation failed:', error);
          failed.push(operation);
        }
      }
      
      // Update pending operations
      this.pendingOperations = failed;
      await AsyncStorage.setItem('pending_operations', JSON.stringify(this.pendingOperations));
      
      if (processed.length > 0) {
        console.log(`[DataSyncService] Processed ${processed.length} pending operations`);
        this.notifyListeners('operations_processed', { count: processed.length });
      }
      
    } catch (error) {
      console.error('[DataSyncService] Process pending operations error:', error);
    }
  }

  // Execute a pending operation
  async executeOperation(operation) {
    try {
      const endpoint = operation.endpoint.startsWith('/api') 
        ? operation.endpoint.substring(4) 
        : operation.endpoint;
      
      const response = await api.request(endpoint, operation.method || 'POST', operation.data);
      return !!response;
    } catch (error) {
      console.error('[DataSyncService] Execute operation error:', error);
      return false;
    }
  }

  // Local data update methods
  async updateLocalFriends(friends) {
    // Update friends service local data
    friendsService.friends = friends;
    await friendsService.saveFriends();
  }

  async updateLocalFriendRequests(requests) {
    friendsService.friendRequests = requests;
    await friendsService.saveFriendRequests();
  }

  async updateLocalPresence(presence) {
    friendsService.presence = presence;
  }

  async updateLocalTournaments(tournaments) {
    tournamentService.tournaments = tournaments;
    await tournamentService.saveTournaments();
  }

  async updateLocalMatches(matches) {
    // Update matches in tournaments
    // This would be more sophisticated in a real implementation
  }

  async updateLocalParticipations(participations) {
    tournamentService.participatingTournaments = participations;
    await tournamentService.saveParticipatingTournaments();
  }

  async updateLocalSummaries(summaries) {
    aiService.summaries = summaries;
    await aiService._saveSummaries();
  }

  async updateLocalAnalysis(analysis) {
    aiService.analysis = analysis;
    await aiService._saveAnalysis();
  }

  async updateLocalProfile(profile) {
    await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
  }

  // Get auth token (deprecated - use api service)
  async getAuthToken() {
    return api.getToken();
  }

  // Force sync
  async forceSync() {
    console.log('[DataSyncService] Force sync initiated');
    await this.syncAllData();
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      lastSync: this.lastSyncTime,
      pendingOperations: this.pendingOperations.length,
      syncInterval: !!this.syncInterval
    };
  }

  // Subscribe to sync events
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  // Cleanup
  cleanup() {
    this.stopPeriodicSync();
    this.listeners = [];
  }

  // Export data for backup
  async exportData() {
    try {
      const data = {
        friends: friendsService.friends,
        friendRequests: friendsService.friendRequests,
        tournaments: tournamentService.tournaments,
        participatingTournaments: tournamentService.participatingTournaments,
        summaries: aiService.summaries,
        analysis: aiService.analysis,
        profile: await AsyncStorage.getItem('user_profile'),
        exportTime: new Date().toISOString()
      };
      
      return data;
    } catch (error) {
      console.error('[DataSyncService] Export data error:', error);
      throw error;
    }
  }

  // Import data from backup
  async importData(data) {
    try {
      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }
      
      // Import friends data
      if (data.friends) {
        await this.updateLocalFriends(data.friends);
      }
      
      if (data.friendRequests) {
        await this.updateLocalFriendRequests(data.friendRequests);
      }
      
      // Import tournament data
      if (data.tournaments) {
        await this.updateLocalTournaments(data.tournaments);
      }
      
      if (data.participatingTournaments) {
        await this.updateLocalParticipations(data.participatingTournaments);
      }
      
      // Import AI data
      if (data.summaries) {
        await this.updateLocalSummaries(data.summaries);
      }
      
      if (data.analysis) {
        await this.updateLocalAnalysis(data.analysis);
      }
      
      // Import profile
      if (data.profile) {
        await this.updateLocalProfile(JSON.parse(data.profile));
      }
      
      // Force a sync to merge with server data
      await this.forceSync();
      
      console.log('[DataSyncService] Data import completed');
      this.notifyListeners('data_imported', { importTime: data.exportTime });
      
    } catch (error) {
      console.error('[DataSyncService] Import data error:', error);
      throw error;
    }
  }
}

export const dataSyncService = new DataSyncService();
