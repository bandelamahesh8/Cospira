
import 'dotenv/config';
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const {RoomEvent} = await import('./src/models/RoomEvent.js');
  const EventLoggerModule = await import('./src/services/EventLogger.js');
  const eventLogger = EventLoggerModule.default;
  
  const cospiraServer = await import('./src/models/UserAnalyticsSetting.js');
  const UserAnalyticsSetting = cospiraServer.UserAnalyticsSetting || mongoose.model('UserAnalyticsSetting');

  const ev = await RoomEvent.findOne({ eventType: 'join' }).select('userId').lean();
  const uid = ev.userId;
  
  const settings = await UserAnalyticsSetting.findOne({ userId: uid }).lean();
  const afterDate = settings?.historyClearedAt || null;

  const events = await eventLogger.getUserGlobalActivity(uid, 50, afterDate);
  console.log('Fetched events length:', events.length, 'afterDate:', afterDate);

  const historyMap = new Map();
  for (const ev of events) {
      if ((ev.eventType === 'join' || ev.eventType === 'room_created') && ev.roomId !== 'global') {
          if (!historyMap.has(ev.roomId)) {
              let displayName = ev.metadata?.roomName || ev.roomId;
              // ignoring async getRoom for debug
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
  process.exit(0);
}).catch(console.error);

