import mongoose from 'mongoose';

const roomEventSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  eventType: { 
    type: String, 
    required: true, 
    enum: [
      // Connection events
      'join', 'leave',
      
      // Media events
      'mute', 'unmute', 'share', 'stop_share', 'speak',
      
      // Communication events
      'chat', 'react',
      
      // Action & Decision events
      'action_created', 'action_updated', 'action_completed',
      'decision_made', 'decision_updated',
      
      // Poll events
      'poll_created', 'poll_voted', 'poll_closed',
      
      // Moderation events
      'room_locked', 'room_unlocked', 'user_kicked', 'user_promoted',
      
      // Settings events
      'settings_changed'
    ] 
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, expires: '90d' } // TTL 30-90 days
});

// Index for efficient querying by room
roomEventSchema.index({ roomId: 1, timestamp: -1 });
// Index for filtering specific event types (e.g., chat history) in a room
roomEventSchema.index({ roomId: 1, eventType: 1, timestamp: -1 });
// Index for user activity profile
roomEventSchema.index({ userId: 1, timestamp: -1 });

export const RoomEvent = mongoose.model('RoomEvent', roomEventSchema);
