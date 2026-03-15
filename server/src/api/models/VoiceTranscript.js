import mongoose from 'mongoose';

const voiceTranscriptSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  transcript: { type: String, required: true },
  language: String,
  confidence: Number,
  createdAt: { type: Date, default: Date.now }
});

export const VoiceTranscript = mongoose.model('VoiceTranscript', voiceTranscriptSchema);
