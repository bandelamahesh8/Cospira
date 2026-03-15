import 'dotenv/config';
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const cospiraServer = await import('./src/models/UserAnalyticsSetting.js');
  const UserAnalyticsSetting = cospiraServer.UserAnalyticsSetting || mongoose.model('UserAnalyticsSetting');

  // Clear historyClearedAt for all users to restore history for testing
  const result = await UserAnalyticsSetting.updateMany({}, { $unset: { historyClearedAt: "" } });
  console.log('Restored history for users. Modified count:', result.modifiedCount);
  process.exit(0);
}).catch(console.error);
