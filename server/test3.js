import 'dotenv/config';
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const {RoomEvent} = await import('./src/models/RoomEvent.js');
  const EventLoggerModule = await import('./src/services/EventLogger.js');
  const eventLogger = EventLoggerModule.default;
  
  const cospiraServer = await import('./src/models/UserAnalyticsSetting.js');
  const UserAnalyticsSetting = cospiraServer.UserAnalyticsSetting || mongoose.model('UserAnalyticsSetting');

  // Find the top active user
  const topUsers = await RoomEvent.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  const uid = topUsers[0]._id;
  console.log('Top UID:', uid, 'Total events in DB:', topUsers[0].count);
  
  const settings = await UserAnalyticsSetting.findOne({ userId: uid }).lean();
  const afterDate = settings?.historyClearedAt || null;
  console.log('History Cleared At:', afterDate);

  const events = await eventLogger.getUserGlobalActivity(uid, 50, afterDate);
  console.log('Fetched events by service:', events.length);

  const historyMap = new Map();
  for (const ev of events) {
      if ((ev.eventType === 'join' || ev.eventType === 'room_created') && ev.roomId !== 'global') {
          if (!historyMap.has(ev.roomId)) {
              let displayName = ev.metadata?.roomName || ev.roomId;
              historyMap.set(ev.roomId, {
                  id: ev.roomId,
                  name: displayName,
                  joinedAt: ev.timestamp,
                  isActive: false,
                  type: 'private'
              });
          }
      }
  }

  console.log('Resulting historyMap size:', historyMap.size);

  const allEvents = await eventLogger.getUserGlobalActivity(uid, 50, null);
  console.log('Total valid events BEFORE filter:', allEvents.length);

  process.exit(0);
}).catch(console.error);
