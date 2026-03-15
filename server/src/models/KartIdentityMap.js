import mongoose from 'mongoose';

const KartIdentityMapSchema = new mongoose.Schema({
  ugsPlayerId: { type: String, required: true, unique: true },
  cospiraUserId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  avatarUrl: String,
  kartSkin: String,
  trailEffect: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('KartIdentityMap', KartIdentityMapSchema);