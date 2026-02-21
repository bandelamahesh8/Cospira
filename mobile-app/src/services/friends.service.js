import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from './socket.service';
import { api } from './api';

class FriendsService {
  constructor() {
    this.friends = [];
    this.friendRequests = [];
    this.presence = {};
    this.listeners = [];
  }

  // Initialize friends service
  async initialize() {
    try {
      const storedFriends = await AsyncStorage.getItem('friends');
      const storedRequests = await AsyncStorage.getItem('friendRequests');
      
      if (storedFriends) {
        this.friends = JSON.parse(storedFriends);
      }
      if (storedRequests) {
        this.friendRequests = JSON.parse(storedRequests);
      }

      // Setup socket listeners for real-time updates
      this.setupSocketListeners();
      
      // Load presence data if authenticated
      if (api.getToken()) {
        await this.loadPresence();
      }
    } catch (error) {
      console.error('[FriendsService] Initialization error:', error);
    }
  }

  setupSocketListeners() {
    // Friend request received
    socketService.on('friend_request_received', (request) => {
      this.friendRequests.push(request);
      this.saveFriendRequests();
      this.notifyListeners('friend_request_received', request);
    });

    // Friend request accepted
    socketService.on('friend_request_accepted', (friendship) => {
      this.friends.push(friendship);
      this.saveFriends();
      this.notifyListeners('friend_request_accepted', friendship);
    });

    // Presence updates
    socketService.on('presence_update', (data) => {
      this.presence[data.userId] = {
        ...this.presence[data.userId],
        ...data.presence,
        lastSeen: new Date().toISOString()
      };
      this.notifyListeners('presence_update', data);
    });

    // Friend online/offline
    socketService.on('friend_status_change', (data) => {
      if (this.presence[data.userId]) {
        this.presence[data.userId].status = data.status;
        this.presence[data.userId].lastSeen = new Date().toISOString();
      }
      this.notifyListeners('friend_status_change', data);
    });
  }

  // Send friend request
  async sendFriendRequest(userId, message = '') {
    try {
      return await api.post('/friends/request', { targetUserId: userId, message });
    } catch (error) {
      console.error('[FriendsService] Send friend request error:', error);
      throw error;
    }
  }

  // Accept friend request
  async acceptFriendRequest(requestId) {
    try {
      const friendship = await api.post('/friends/accept', { requestId });
      
      // Remove from requests and add to friends
      this.friendRequests = this.friendRequests.filter(req => req.id !== requestId);
      this.friends.push(friendship);
      
      await this.saveFriends();
      await this.saveFriendRequests();
      
      return friendship;
    } catch (error) {
      console.error('[FriendsService] Accept friend request error:', error);
      throw error;
    }
  }

  // Decline friend request
  async declineFriendRequest(requestId) {
    try {
      await api.post('/friends/decline', { requestId });

      // Remove from requests
      this.friendRequests = this.friendRequests.filter(req => req.id !== requestId);
      await this.saveFriendRequests();
      
      return true;
    } catch (error) {
      console.error('[FriendsService] Decline friend request error:', error);
      throw error;
    }
  }

  // Remove friend
  async removeFriend(friendId) {
    try {
      await api.delete('/friends/remove', { friendId });

      // Remove from friends list
      this.friends = this.friends.filter(friend => friend.id !== friendId);
      await this.saveFriends();
      
      return true;
    } catch (error) {
      console.error('[FriendsService] Remove friend error:', error);
      throw error;
    }
  }

  // Get friends list
  getFriends() {
    return this.friends.map(friend => ({
      ...friend,
      presence: this.presence[friend.id] || { status: 'offline', lastSeen: null }
    }));
  }

  // Get friend requests
  getFriendRequests() {
    return this.friendRequests;
  }

  // Get online friends
  getOnlineFriends() {
    return this.getFriends().filter(friend => 
      friend.presence && friend.presence.status === 'online'
    );
  }

  // Search for users
  async searchUsers(query) {
    try {
      return await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error('[FriendsService] Search users error:', error);
      throw error;
    }
  }

  // Invite friend to room
  async inviteToRoom(friendId, roomId) {
    try {
      return await api.post('/rooms/invite', { friendId, roomId });
    } catch (error) {
      console.error('[FriendsService] Invite to room error:', error);
      throw error;
    }
  }

  // Update own presence
  async updatePresence(presenceData) {
    try {
      await socketService.emit('update_presence', presenceData);
    } catch (error) {
      console.error('[FriendsService] Update presence error:', error);
    }
  }

  // Load presence data
  async loadPresence() {
    try {
      const presenceData = await api.get('/friends/presence');
      this.presence = presenceData;
    } catch (error) {
      console.error('[FriendsService] Load presence error:', error);
    }
  }

  // Save friends to storage
  async saveFriends() {
    try {
      await AsyncStorage.setItem('friends', JSON.stringify(this.friends));
    } catch (error) {
      console.error('[FriendsService] Save friends error:', error);
    }
  }

  // Save friend requests to storage
  async saveFriendRequests() {
    try {
      await AsyncStorage.setItem('friendRequests', JSON.stringify(this.friendRequests));
    } catch (error) {
      console.error('[FriendsService] Save friend requests error:', error);
    }
  }

  // Get auth token (deprecated - use api service)
  async getAuthToken() {
    return api.getToken();
  }

  // Subscribe to events
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

  // Get friend by ID
  getFriendById(friendId) {
    return this.friends.find(friend => friend.id === friendId);
  }

  // Check if user is friend
  isFriend(userId) {
    return this.friends.some(friend => friend.id === userId);
  }

  // Get friendship status
  getFriendshipStatus(userId) {
    if (this.isFriend(userId)) return 'friends';
    
    const hasRequest = this.friendRequests.some(req => 
      (req.senderId === userId || req.receiverId === userId) && req.status === 'pending'
    );
    
    if (hasRequest) return 'pending';
    
    return 'none';
  }
}

export const friendsService = new FriendsService();
