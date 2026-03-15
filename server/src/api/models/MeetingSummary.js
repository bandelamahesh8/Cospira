import mongoose from 'mongoose';

const actionItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: true,
    comment: 'userId of the person responsible'
  },
  ownerName: {
    type: String
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String
  }
}, { _id: true });

const decisionSchema = new mongoose.Schema({
  decision: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    comment: 'userId responsible for execution'
  },
  ownerName: {
    type: String
  },
  status: {
    type: String,
    enum: ['proposed', 'accepted', 'rejected', 'completed'],
    default: 'proposed'
  },
  votes: [{
    userId: String,
    userName: String,
    vote: {
      type: String,
      enum: ['yes', 'no', 'abstain']
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, { _id: true });

const meetingSummarySchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true
  },
  
  // Summary content
  bullets: [{
    type: String
  }],
  
  actionItems: [actionItemSchema],
  
  decisions: [decisionSchema],
  
  // Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generatedBy: {
    type: String,
    default: 'ai',
    enum: ['ai', 'manual', 'hybrid']
  },
  
  // Source data
  transcriptCount: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    comment: 'Duration in minutes'
  },
  participantCount: {
    type: Number
  },
  
  // Email tracking
  emailedTo: [{
    userId: String,
    email: String,
    sentAt: Date
  }],
  
  // Quality indicators
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    comment: 'AI confidence score'
  }
}, {
  timestamps: true
});

// Indexes
meetingSummarySchema.index({ roomId: 1, createdAt: -1 });
meetingSummarySchema.index({ sessionId: 1 });
meetingSummarySchema.index({ 'actionItems.owner': 1, 'actionItems.status': 1 });
meetingSummarySchema.index({ 'decisions.status': 1 });

// Methods
meetingSummarySchema.methods.getPendingActions = function() {
  return this.actionItems.filter(item => 
    item.status === 'pending' || item.status === 'in_progress'
  );
};

meetingSummarySchema.methods.getCompletedActions = function() {
  return this.actionItems.filter(item => item.status === 'completed');
};

meetingSummarySchema.methods.getActionsByOwner = function(userId) {
  return this.actionItems.filter(item => item.owner === userId);
};

meetingSummarySchema.methods.updateActionStatus = function(actionId, newStatus) {
  const action = this.actionItems.id(actionId);
  if (!action) {
    throw new Error('Action item not found');
  }
  
  action.status = newStatus;
  if (newStatus === 'completed') {
    action.completedAt = new Date();
  }
  
  return action;
};

meetingSummarySchema.methods.addVoteToDecision = function(decisionId, userId, userName, vote) {
  const decision = this.decisions.id(decisionId);
  if (!decision) {
    throw new Error('Decision not found');
  }
  
  // Remove existing vote from this user
  decision.votes = decision.votes.filter(v => v.userId !== userId);
  
  // Add new vote
  decision.votes.push({
    userId,
    userName,
    vote,
    votedAt: new Date()
  });
  
  return decision;
};

meetingSummarySchema.methods.getDecisionResults = function(decisionId) {
  const decision = this.decisions.id(decisionId);
  if (!decision) {
    throw new Error('Decision not found');
  }
  
  const results = {
    yes: 0,
    no: 0,
    abstain: 0,
    total: decision.votes.length
  };
  
  decision.votes.forEach(v => {
    results[v.vote]++;
  });
  
  return results;
};

// Statics
meetingSummarySchema.statics.findByRoom = function(roomId, limit = 10) {
  return this.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

meetingSummarySchema.statics.findBySession = function(sessionId) {
  return this.findOne({ sessionId });
};

meetingSummarySchema.statics.findPendingActionsForUser = function(userId) {
  return this.find({
    'actionItems.owner': userId,
    'actionItems.status': { $in: ['pending', 'in_progress'] }
  }).select('roomId sessionId actionItems createdAt');
};

meetingSummarySchema.statics.getLatestForRoom = function(roomId) {
  return this.findOne({ roomId })
    .sort({ createdAt: -1 });
};

export const MeetingSummary = mongoose.model('MeetingSummary', meetingSummarySchema);
