import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String
  },
  joinedAt: {
    type: Date,
    required: true
  },
  leftAt: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0,
    comment: 'Duration in minutes'
  }
}, { _id: false });

const qualityMetricsSchema = new mongoose.Schema({
  avgLatency: {
    type: Number,
    default: 0,
    comment: 'Average latency in ms'
  },
  avgPacketLoss: {
    type: Number,
    default: 0,
    comment: 'Average packet loss percentage'
  },
  disconnections: {
    type: Number,
    default: 0
  },
  poorQualityReports: {
    type: Number,
    default: 0
  }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  endedAt: {
    type: Date,
    index: true
  },
  participants: [participantSchema],
  
  // Computed on session end
  totalDuration: {
    type: Number,
    default: 0,
    comment: 'Total session duration in minutes'
  },
  peakParticipants: {
    type: Number,
    default: 0
  },
  
  // Links to generated content
  summaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeetingSummary'
  },
  transcriptCount: {
    type: Number,
    default: 0
  },
  actionItemsCount: {
    type: Number,
    default: 0
  },
  decisionsCount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  purpose: {
    type: String,
    enum: ['meeting', 'study', 'entertainment', 'general'],
    default: 'general'
  },
  quality: {
    type: qualityMetricsSchema,
    default: () => ({})
  },
  
  // Flags
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  endedBy: {
    type: String,
    comment: 'userId who ended the session, or "auto" if last user left'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
sessionSchema.index({ roomId: 1, startedAt: -1 });
sessionSchema.index({ 'participants.userId': 1 });
sessionSchema.index({ isActive: 1, startedAt: -1 });

// Methods
sessionSchema.methods.addParticipant = function(userId, userName) {
  const existing = this.participants.find(p => p.userId === userId && !p.leftAt);
  if (existing) {
    return existing; // User already in session
  }
  
  const participant = {
    userId,
    userName,
    joinedAt: new Date()
  };
  this.participants.push(participant);
  
  // Update peak participants
  const currentCount = this.participants.filter(p => !p.leftAt).length;
  if (currentCount > this.peakParticipants) {
    this.peakParticipants = currentCount;
  }
  
  return participant;
};

sessionSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId === userId && !p.leftAt);
  if (!participant) {
    return null;
  }
  
  participant.leftAt = new Date();
  participant.duration = Math.round((participant.leftAt - participant.joinedAt) / 1000 / 60); // minutes
  
  return participant;
};

sessionSchema.methods.endSession = function(endedBy = 'auto') {
  if (!this.isActive) {
    return; // Already ended
  }
  
  this.endedAt = new Date();
  this.isActive = false;
  this.endedBy = endedBy;
  
  // Mark all active participants as left
  this.participants.forEach(p => {
    if (!p.leftAt) {
      p.leftAt = this.endedAt;
      p.duration = Math.round((p.leftAt - p.joinedAt) / 1000 / 60);
    }
  });
  
  // Calculate total session duration
  this.totalDuration = Math.round((this.endedAt - this.startedAt) / 1000 / 60);
};

sessionSchema.methods.getActiveParticipants = function() {
  return this.participants.filter(p => !p.leftAt);
};

sessionSchema.methods.getActiveParticipantCount = function() {
  return this.getActiveParticipants().length;
};

sessionSchema.methods.updateQuality = function(metrics) {
  if (metrics.latency !== undefined) {
    this.quality.avgLatency = metrics.latency;
  }
  if (metrics.packetLoss !== undefined) {
    this.quality.avgPacketLoss = metrics.packetLoss;
  }
  if (metrics.disconnection) {
    this.quality.disconnections += 1;
  }
  if (metrics.poorQuality) {
    this.quality.poorQualityReports += 1;
  }
};

// Statics
sessionSchema.statics.findActiveByRoom = function(roomId) {
  return this.findOne({ roomId, isActive: true });
};

sessionSchema.statics.findRoomSessions = function(roomId, limit = 10) {
  return this.find({ roomId })
    .sort({ startedAt: -1 })
    .limit(limit)
    .populate('summaryId');
};

sessionSchema.statics.findUserSessions = function(userId, limit = 10) {
  return this.find({ 'participants.userId': userId })
    .sort({ startedAt: -1 })
    .limit(limit);
};

sessionSchema.statics.getSessionStats = function(roomId) {
  return this.aggregate([
    { $match: { roomId, isActive: false } },
    {
      $group: {
        _id: '$roomId',
        totalSessions: { $sum: 1 },
        avgDuration: { $avg: '$totalDuration' },
        avgPeakParticipants: { $avg: '$peakParticipants' },
        totalParticipants: { $sum: { $size: '$participants' } }
      }
    }
  ]);
};

export const Session = mongoose.model('Session', sessionSchema);
