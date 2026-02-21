import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['host', 'member', 'guest'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'away', 'offline'],
    default: 'active'
  },
  lastStatusChange: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const roomSettingsSchema = new mongoose.Schema({
  allowGuests: {
    type: Boolean,
    default: true
  },
  requireApproval: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 50,
    min: 2,
    max: 100
  },
  recordSessions: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  purpose: {
    type: String,
    enum: ['meeting', 'study', 'entertainment', 'general'],
    default: 'general'
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  host: {
    type: String,
    required: true
  },
  members: [memberSchema],
  settings: {
    type: roomSettingsSchema,
    default: () => ({})
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  roomStatus: {
    type: String,
    enum: ['upcoming', 'live', 'paused', 'ended'],
    default: 'live',
    index: true
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  
  // Privacy & Access Control
  accessType: {
    type: String,
    enum: ['public', 'private', 'password', 'invite'],
    default: 'public',
    index: true
  },
  passwordHash: {
    type: String,
    select: false // Do not return by default
  },
  
  // Metadata - computed over time
  totalSessions: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0,
    comment: 'Total duration in minutes'
  },
  totalParticipants: {
    type: Number,
    default: 0,
    comment: 'Unique participant count'
  },

  // Phase 3: Smart Rooms - Intelligence Metadata
  intelligence: {
    currentMode: {
      type: String,
      enum: ['meeting', 'study', 'casual', 'gaming', 'unknown'],
      default: 'unknown'
    },
    confidence: {
      type: Number,
      default: 0
    },
    lastClassifiedAt: {
      type: Date
    },
    activityType: {
      type: String,
      default: 'unknown'
    },
    autoModeEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for efficient queries
roomSchema.index({ createdBy: 1, createdAt: -1 });
roomSchema.index({ 'members.userId': 1 });
roomSchema.index({ isActive: 1, lastActiveAt: -1 });

// Methods
roomSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(m => m.userId === userId);
  if (existingMember) {
    existingMember.lastSeenAt = new Date();
    return existingMember;
  }
  
  const newMember = {
    userId,
    role,
    joinedAt: new Date(),
    lastSeenAt: new Date()
  };
  this.members.push(newMember);
  return newMember;
};

roomSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.userId !== userId);
};

roomSchema.methods.updateMemberLastSeen = function(userId) {
  const member = this.members.find(m => m.userId === userId);
  if (member) {
    member.lastSeenAt = new Date();
  }
  this.lastActiveAt = new Date();
};

roomSchema.methods.updateMemberStatus = function(userId, status) {
  const member = this.members.find(m => m.userId === userId);
  if (member) {
    member.status = status;
    member.lastStatusChange = new Date();
    member.lastSeenAt = new Date();
  }
  this.lastActiveAt = new Date();
};

roomSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.userId === userId);
  return member?.role || null;
};

roomSchema.methods.isHost = function(userId) {
  return this.host === userId;
};

roomSchema.methods.promoteToHost = function(userId) {
  const member = this.members.find(m => m.userId === userId);
  if (!member) {
    throw new Error('User is not a member of this room');
  }
  
  // Demote current host to member
  const currentHost = this.members.find(m => m.userId === this.host);
  if (currentHost) {
    currentHost.role = 'member';
  }
  
  // Promote new host
  member.role = 'host';
  this.host = userId;
};

roomSchema.methods.updateRole = function(userId, newRole) {
  const member = this.members.find(m => m.userId === userId);
  if (!member) {
    throw new Error('User is not a member of this room');
  }
  
  if (newRole === 'host') {
    this.promoteToHost(userId);
  } else {
    member.role = newRole;
  }
};

// Statics
roomSchema.statics.findByRoomId = function(roomId) {
  return this.findOne({ roomId });
};

roomSchema.statics.findUserRooms = function(userId, activeOnly = false) {
  const query = { 'members.userId': userId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).sort({ lastActiveAt: -1 });
};

roomSchema.statics.findActiveRooms = function() {
  return this.find({ isActive: true }).sort({ lastActiveAt: -1 });
};

export const Room = mongoose.model('Room', roomSchema);
