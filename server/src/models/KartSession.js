import mongoose from 'mongoose';

const KartSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  roomId: { type: String, required: true },
  joinCode: { type: String, required: true },
  hostUserId: { type: String, required: true },
  trackId: { type: String, required: true },
  maxPlayers: { type: Number, required: true },
  status: { type: String, default: 'waiting' },
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('KartSession', KartSessionSchema);