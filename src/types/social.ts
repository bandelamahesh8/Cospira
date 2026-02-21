export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface FriendProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  displayName?: string;
  isOnline: boolean;
  lastSeen?: Date;
  status: FriendshipStatus; // Relationship relative to current user
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'global' | 'private' | 'system';
}
