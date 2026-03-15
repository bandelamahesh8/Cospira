
import mongoose from 'mongoose';

const TranscriptSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String }, // Optional snapshot of name at time of speaking
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  confidence: { type: Number, default: 1.0 },
  isFinal: { type: Boolean, default: true }
});

// Index for efficient querying by room and time (for catch-up/summary)
TranscriptSchema.index({ roomId: 1, timestamp: 1 });

export const Transcript = mongoose.model('Transcript', TranscriptSchema);
