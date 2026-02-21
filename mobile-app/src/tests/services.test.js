import { friendsService } from '../services/friends.service';
import { tournamentService } from '../services/tournament.service';
import { aiService } from '../services/ai.service';
import { dataSyncService } from '../services/dataSync.service';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Services Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FriendsService', () => {
    test('should initialize correctly', async () => {
      const mockGetItem = require('@react-native-async-storage/async-storage').getItem;
      mockGetItem.mockResolvedValue('[]');

      await friendsService.initialize();
      
      expect(friendsService.friends).toEqual([]);
      expect(friendsService.friendRequests).toEqual([]);
    });

    test('should send friend request', async () => {
      const mockFetch = global.fetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'req1', status: 'pending' })
      });

      const result = await friendsService.sendFriendRequest('user123', 'Hello!');
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/friends/request',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('user123')
        })
      );
      expect(result.id).toBe('req1');
    });

    test('should accept friend request', async () => {
      const mockFetch = global.fetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'friend1', status: 'friends' })
      });

      // Add a pending request
      friendsService.friendRequests = [{ id: 'req1', senderId: 'user123' }];
      
      const result = await friendsService.acceptFriendRequest('req1');
      
      expect(result.id).toBe('friend1');
      expect(friendsService.friendRequests).toHaveLength(0);
    });

    test('should get online friends', () => {
      friendsService.friends = [
        { id: 'user1', displayName: 'User 1' },
        { id: 'user2', displayName: 'User 2' }
      ];
      friendsService.presence = {
        'user1': { status: 'online' },
        'user2': { status: 'offline' }
      };

      const onlineFriends = friendsService.getOnlineFriends();
      
      expect(onlineFriends).toHaveLength(1);
      expect(onlineFriends[0].id).toBe('user1');
    });
  });

  describe('TournamentService', () => {
    test('should create tournament', async () => {
      const mockFetch = global.fetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 't1', name: 'Test Tournament' })
      });

      const tournamentData = {
        name: 'Test Tournament',
        gameType: 'chess',
        maxParticipants: 8,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString()
      };

      const result = await tournamentService.createTournament(tournamentData);
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tournaments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(tournamentData)
        })
      );
      expect(result.id).toBe('t1');
    });

    test('should validate tournament data', () => {
      const validData = {
        name: 'Test Tournament',
        gameType: 'chess',
        maxParticipants: 8,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString()
      };

      const errors = tournamentService.validateTournamentData(validData);
      expect(errors).toHaveLength(0);

      const invalidData = { name: 'Test' }; // Missing required fields
      const invalidErrors = tournamentService.validateTournamentData(invalidData);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    test('should generate bracket', () => {
      const participants = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
        { id: 'p4', name: 'Player 4' }
      ];

      const bracket = tournamentService.generateBracket(participants);
      
      expect(bracket).toBeDefined();
      expect(bracket.length).toBeGreaterThan(0);
    });

    test('should get tournament status', () => {
      const now = new Date();
      const upcomingTournament = {
        startTime: new Date(now.getTime() + 3600000).toISOString(),
        endTime: new Date(now.getTime() + 7200000).toISOString()
      };

      const status = tournamentService.getTournamentStatus(upcomingTournament);
      expect(status).toBe('upcoming');
    });
  });

  describe('AIService', () => {
    test('should generate room summary', async () => {
      const roomData = {
        id: 'room1',
        name: 'Test Room',
        participants: [{ id: 'user1', displayName: 'User 1' }],
        topic: 'Project Planning'
      };

      const summary = await aiService.generateRoomSummary(roomData);
      
      expect(summary).toBeDefined();
      expect(summary.roomId).toBe('room1');
      expect(summary.executiveSummary).toBeDefined();
      expect(summary.highlights).toBeDefined();
      expect(summary.actionItems).toBeDefined();
      expect(summary.confidenceScore).toBeGreaterThan(0);
    });

    test('should analyze gameplay', async () => {
      const gameData = { id: 'game1', type: 'chess' };
      const playerData = { id: 'player1', rating: 1500 };

      const analysis = await aiService.analyzeGameplay(gameData, playerData);
      
      expect(analysis).toBeDefined();
      expect(analysis.gameId).toBe('game1');
      expect(analysis.performance).toBeDefined();
      expect(analysis.strengths).toBeDefined();
      expect(analysis.improvements).toBeDefined();
      expect(analysis.confidenceScore).toBeGreaterThan(0);
    });

    test('should moderate content', async () => {
      const content = 'This is a test message';
      const moderation = await aiService.moderateContent(content);
      
      expect(moderation).toBeDefined();
      expect(moderation.safety).toBeDefined();
      expect(moderation.toxicity).toBeDefined();
      expect(moderation.spam).toBeDefined();
      expect(moderation.action).toBeDefined();
    });

    test('should predict tournament outcome', async () => {
      const tournamentData = { id: 't1', type: 'single_elimination' };
      const participantData = [
        { id: 'p1', rating: 1500 },
        { id: 'p2', rating: 1450 }
      ];

      const predictions = await aiService.predictTournamentOutcome(tournamentData, participantData);
      
      expect(predictions).toBeDefined();
      expect(predictions.winnerPredictions).toBeDefined();
      expect(predictions.bracketAnalysis).toBeDefined();
      expect(predictions.confidence).toBeGreaterThan(0);
    });
  });

  describe('DataSyncService', () => {
    test('should initialize correctly', async () => {
      const mockGetItem = require('@react-native-async-storage/async-storage').getItem;
      mockGetItem.mockResolvedValue(null);

      await dataSyncService.initialize();
      
      expect(dataSyncService.isOnline).toBe(true);
      expect(dataSyncService.pendingOperations).toEqual([]);
    });

    test('should add pending operation', async () => {
      const mockSetItem = require('@react-native-async-storage/async-storage').setItem;
      mockSetItem.mockResolvedValue();

      const operation = {
        endpoint: '/api/test',
        method: 'POST',
        data: { test: 'data' }
      };

      await dataSyncService.addPendingOperation(operation);
      
      expect(dataSyncService.pendingOperations).toHaveLength(1);
      expect(mockSetItem).toHaveBeenCalled();
    });

    test('should get sync status', () => {
      const status = dataSyncService.getSyncStatus();
      
      expect(status).toBeDefined();
      expect(status.hasOwnProperty('isOnline')).toBe(true);
      expect(status.hasOwnProperty('pendingOperations')).toBe(true);
      expect(status.hasOwnProperty('syncInterval')).toBe(true);
    });

    test('should export data', async () => {
      // Mock some data
      friendsService.friends = [{ id: 'user1', displayName: 'User 1' }];
      tournamentService.tournaments = [{ id: 't1', name: 'Test Tournament' }];

      const exportedData = await dataSyncService.exportData();
      
      expect(exportedData).toBeDefined();
      expect(exportedData.friends).toBeDefined();
      expect(exportedData.tournaments).toBeDefined();
      expect(exportedData.exportTime).toBeDefined();
    });

    test('should import data', async () => {
      const importData = {
        friends: [{ id: 'user1', displayName: 'User 1' }],
        tournaments: [{ id: 't1', name: 'Test Tournament' }],
        exportTime: new Date().toISOString()
      };

      const mockSetItem = require('@react-native-async-storage/async-storage').setItem;
      mockSetItem.mockResolvedValue();

      await dataSyncService.importData(importData);
      
      expect(friendsService.friends).toEqual(importData.friends);
      expect(tournamentService.tournaments).toEqual(importData.tournaments);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const mockFetch = global.fetch;
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(friendsService.sendFriendRequest('user123')).rejects.toThrow();
    });

    test('should handle invalid data gracefully', async () => {
      const mockFetch = global.fetch;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400
      });

      await expect(tournamentService.createTournament({})).rejects.toThrow();
    });

    test('should handle storage errors gracefully', async () => {
      const mockGetItem = require('@react-native-async-storage/async-storage').getItem;
      mockGetItem.mockRejectedValue(new Error('Storage error'));

      await expect(friendsService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should handle large friends list efficiently', async () => {
      // Create a large friends list
      const largeFriendsList = Array.from({ length: 1000 }, (_, i) => ({
        id: `user${i}`,
        displayName: `User ${i}`
      }));

      friendsService.friends = largeFriendsList;
      
      const startTime = Date.now();
      const onlineFriends = friendsService.getOnlineFriends();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
      expect(Array.isArray(onlineFriends)).toBe(true);
    });

    test('should handle multiple concurrent operations', async () => {
      const mockFetch = global.fetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'test', status: 'success' })
      });

      const operations = Array.from({ length: 10 }, (_, i) =>
        friendsService.sendFriendRequest(`user${i}`)
      );

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1s
    });
  });
});

// Integration Tests
describe('Integration Tests', () => {
  test('should sync friends and tournaments together', async () => {
    const mockFetch = global.fetch;
    mockFetch.mockImplementation((url) => {
      if (url.includes('/friends/sync')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            friends: [{ id: 'user1', displayName: 'User 1' }],
            requests: [],
            presence: { 'user1': { status: 'online' } }
          })
        });
      }
      if (url.includes('/tournaments/sync')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            tournaments: [{ id: 't1', name: 'Test Tournament' }],
            matches: [],
            participations: []
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await dataSyncService.syncAllData();
    
    expect(friendsService.friends).toHaveLength(1);
    expect(tournamentService.tournaments).toHaveLength(1);
  });

  test('should handle real-time updates', async () => {
    let updateReceived = false;
    
    dataSyncService.subscribe((event, data) => {
      if (event === 'friend_request_update') {
        updateReceived = true;
      }
    });

    dataSyncService.handleRealtimeUpdate({
      type: 'friend_request',
      data: { requestId: 'req1', status: 'pending' }
    });

    expect(updateReceived).toBe(true);
  });
});
