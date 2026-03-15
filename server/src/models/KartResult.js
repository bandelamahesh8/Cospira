import mongoose from 'mongoose';

const KartResultSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  position: { type: Number, required: true },
  bestLapMs: { type: Number, required: true },
  totalTimeMs: { type: Number, required: true },
  checkpointsHit: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('KartResult', KartResultSchema);