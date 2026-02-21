import { api } from './api';
import { socketService } from './socket.service';

export const roomsService = {
  getAll() {
    return api.get('/rooms');
  },

  getById(id) {
    return api.get(`/rooms/${id}`);
  },

  create(name, roomId, accessType = 'public', password = "", settings = {}, user = null) {
      return new Promise((resolve, reject) => {
          if (!socketService.socket?.connected) {
              return reject(new Error('No socket connection'));
          }

          // Timeout (20s) - Safety net
          const timeoutId = setTimeout(() => {
              reject(new Error('Room creation timed out after 20 seconds. Please check your connection and try again.'));
          }, 20000);

          // Emit event with full settings AND callback
          socketService.emit('create-room', {
              roomName: name,
              roomId: roomId,
              accessType,
              password: password || "",
              user, // Include user info in payload
              settings: {
                  mode: settings.mode || 'fun',
                  maxParticipants: settings.maxParticipants || 50,
                  requireApproval: settings.requireApproval || false,
                  ...settings
              }
          }, (response) => {
              clearTimeout(timeoutId);
              if (response?.success) {
                  resolve(response);
              } else {
                  reject(new Error(response?.error || 'Failed to create room'));
              }
          });
      });
  },

  checkRoom(roomId) {
      return new Promise((resolve, reject) => {
          if (!socketService.socket?.connected) {
              return reject(new Error('No socket connection'));
          }

          socketService.emit('check-room', { roomId }, (response) => {
              if (response?.success) {
                  resolve(response);
              } else {
                  reject(new Error(response?.error || 'Room not found'));
              }
          });

          // Timeout (5s)
          setTimeout(() => {
              reject(new Error('Check room timed out'));
          }, 5000);
      });
  },

  join(id, password = null) {
    // Socket service already handles the callback pattern server supports for joining
    return socketService.joinRoom(id, password);
  },

  delete(roomId) {
      return new Promise((resolve, reject) => {
          if (!socketService.socket?.connected) {
              return reject(new Error('No socket connection'));
          }

          socketService.emit('leave-room', { roomId }, (response) => {
              if (response?.success !== false) {
                  resolve(response);
              } else {
                  reject(new Error(response?.error || 'Failed to leave room'));
              }
          });

          // Timeout (5s)
          setTimeout(() => {
              reject(new Error('Leave room timed out'));
          }, 5000);
      });
  }
};
