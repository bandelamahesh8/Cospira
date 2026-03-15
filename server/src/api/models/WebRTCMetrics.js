import mongoose from 'mongoose';

const webrtcMetricsSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  bitrate: Number,
  packetLoss: Number,
  jitter: Number,
  latency: Number,
  timestamp: { type: Date, default: Date.now, expires: '14d' } // TTL 7-14 days
});

// Composite indexes for analytics
webrtcMetricsSchema.index({ roomId: 1, timestamp: -1 });
webrtcMetricsSchema.index({ userId: 1, timestamp: -1 });

export const WebRTCMetrics = mongoose.model('WebRTCMetrics', webrtcMetricsSchema);
