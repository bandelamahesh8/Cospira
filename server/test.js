
import 'dotenv/config';
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const {RoomEvent} = await import('./src/models/RoomEvent.js');
  
  const recentEvents = await RoomEvent.find().sort({ timestamp: -1 }).limit(10).lean();
  console.log('Recent events userIds:', recentEvents.map(e => ({ userId: e.userId, eventType: e.eventType, timestamp: e.timestamp })));

  process.exit(0);
}).catch(console.error);

