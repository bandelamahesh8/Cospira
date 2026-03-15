import mongoose from 'mongoose';

const userAnalyticsSettingSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  historyClearedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
userAnalyticsSettingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const UserAnalyticsSetting = mongoose.model('UserAnalyticsSetting', userAnalyticsSettingSchema);
