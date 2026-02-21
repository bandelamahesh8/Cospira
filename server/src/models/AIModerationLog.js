import mongoose from 'mongoose';

const AIModerationLogSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userName: String,
  contentType: {
    type: String,
    enum: ['chat', 'voice', 'filename'],
    required: true
  },
  content: String, // Truncated or stored based on privacy settings
  severity: {
    type: String,
    required: true
  },
  violations: [{
    type: { type: String },
    matches: [String],
    count: Number
  }],
  actionTaken: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: String,
  resolutionNotes: String
});

// TTL index to automatically remove old logs after 30 days
AIModerationLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const AIModerationLog = mongoose.model('AIModerationLog', AIModerationLogSchema);
