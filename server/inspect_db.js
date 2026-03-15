import 'dotenv/config';
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const {RoomEvent} = await import('./src/models/RoomEvent.js');
  const {Room} = await import('./src/models/Room.js');

  // Find some recent events
  const events = await RoomEvent.find({}).sort({ timestamp: -1 }).limit(10).lean();
  console.log('Recent Events:', JSON.stringify(events, null, 2));

  // Find some rooms
  const rooms = await Room.find({}).limit(5).lean();
  console.log('Sample Rooms:', JSON.stringify(rooms, null, 2));

  process.exit(0);
}).catch(console.error);
