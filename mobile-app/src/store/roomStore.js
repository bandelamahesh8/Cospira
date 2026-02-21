import { webrtc } from '../services/webrtc.manager';

class RoomStore {
  constructor() {
    this.rooms = [];
    this.activeRoom = null;
    this.participants = [];
    this.isMicOn = true;
    this.isVideoOn = true;
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => cb());
  }

  async fetchRooms() {
    // Mock API call
    this.rooms = [
      { id: '1', name: 'Sector 4 Strategy', users: 3, status: 'Active' },
      { id: '2', name: 'Deep Space Sim', users: 1, status: 'Idle' },
    ];
    this.notify();
  }

  async joinRoom(roomId) {
    console.log(`[RoomStore] Joining ${roomId}...`);
    await webrtc.initialize();
    await webrtc.joinChannel(roomId);
    
    this.activeRoom = this.rooms.find(r => r.id === roomId) || { id: roomId, name: 'Unknown Room' };
    
    // Mock participants
    this.participants = [
      { id: 'self', name: 'Me', isSpeaking: false, role: 'Commander' },
      { id: 'p1', name: 'Sarah', isSpeaking: true, role: 'Specialist' },
      { id: 'p2', name: 'AI Core', isSpeaking: false, role: 'System' },
    ];
    
    this.notify();
  }

  async leaveRoom() {
    await webrtc.leaveChannel();
    this.activeRoom = null;
    this.participants = [];
    this.notify();
  }

  toggleMic() {
    this.isMicOn = !this.isMicOn;
    webrtc.toggleMicrophone(this.isMicOn);
    this.notify();
  }

  toggleVideo() {
    this.isVideoOn = !this.isVideoOn;
    webrtc.toggleCamera(this.isVideoOn);
    this.notify();
  }
}

export const roomStore = new RoomStore();
