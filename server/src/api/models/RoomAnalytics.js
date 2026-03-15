import mongoose from 'mongoose';

const roomAnalyticsSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true },
  duration: Number, // in seconds
  peakParticipants: Number,
  deviceStats: {
    mobile: Number,
    desktop: Number,
    tablet: Number
  },
  createdAt: { type: Date, default: Date.now }
});

export const RoomAnalytics = mongoose.model('RoomAnalytics', roomAnalyticsSchema);
