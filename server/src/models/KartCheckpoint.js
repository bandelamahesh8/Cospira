import mongoose from 'mongoose';

const KartCheckpointSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  checkpointIndex: { type: Number, required: true },
  timestampMs: { type: Number, required: true },
  sequenceHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('KartCheckpoint', KartCheckpointSchema);