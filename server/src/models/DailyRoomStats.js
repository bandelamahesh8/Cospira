import mongoose from 'mongoose';

const dailyRoomStatsSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  date: { type: Date, required: true }, // Normalized to start of day
  totalJoins: { type: Number, default: 0 },
  avgDuration: { type: Number, default: 0 },
  peakParticipants: { type: Number, default: 0 }
});

dailyRoomStatsSchema.index({ roomId: 1, date: 1 }, { unique: true });

export const DailyRoomStats = mongoose.model('DailyRoomStats', dailyRoomStatsSchema);
