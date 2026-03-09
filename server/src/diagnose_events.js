
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const roomEventSchema = new mongoose.Schema({
  roomId: String,
  userId: String,
  eventType: String,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: Date
});

const RoomEvent = mongoose.model('RoomEvent', roomEventSchema);

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const count = await RoomEvent.countDocuments();
  console.log(`Total RoomEvents: ${count}`);

  const roomCreatedEvents = await RoomEvent.find({ eventType: 'room_created' }).sort({ timestamp: -1 });
  console.log(`Total room_created events: ${roomCreatedEvents.length}`);
  roomCreatedEvents.forEach(e => {
    console.log(`[${e.timestamp.toISOString()}] Room: ${e.roomId} - User: ${e.userId}`);
  });

  const recent = await RoomEvent.find().sort({ timestamp: -1 }).limit(20);
  console.log('\nMost recent 20 events:');
  recent.forEach(e => {
    console.log(`[${e.timestamp.toISOString()}] ${e.eventType} - Room: ${e.roomId} - User: ${e.userId}`);
  });

  const distinctEventTypes = await RoomEvent.distinct('eventType');
  console.log('Distinct event types in database:', distinctEventTypes);

  const distinctUsers = await RoomEvent.distinct('userId');
  console.log('Distinct users in ALL events:', distinctUsers.length);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
