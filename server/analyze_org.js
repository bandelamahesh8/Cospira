import 'dotenv/config';
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const {RoomEvent} = await import('./src/models/RoomEvent.js');
  const {Room} = await import('./src/models/Room.js');
  
  // Find top active user
  const topUsers = await RoomEvent.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  
  if (topUsers.length === 0) {
      console.log('No users found with history.');
      process.exit(0);
  }

  const uid = topUsers[0]._id;
  console.log('Target UID:', uid);

  // Get all unique room IDs for this user
  const roomIds = await RoomEvent.distinct('roomId', { userId: uid });
  console.log('Room IDs in history:', roomIds.length);

  // Check how many of these are in MongoDB as organization rooms
  const rooms = await Room.find({ roomId: { $in: roomIds } }).lean();
  console.log('Rooms found in MongoDB:', rooms.length);
  
  const orgRooms = rooms.filter(r => r.organizationName || r.settings?.organizationId || r.settings?.organization_only);
  console.log('Organization rooms found:', orgRooms.length);
  
  if (orgRooms.length > 0) {
      console.log('Org Rooms List:', orgRooms.map(r => ({ roomId: r.roomId, orgName: r.organizationName, settings: r.settings })));
  }

  // Check events for any organization metadata in the events themselves
  const eventsWithOrgMetadata = await RoomEvent.find({ 
      userId: uid, 
      $or: [
          { 'metadata.organizationId': { $exists: true } },
          { 'metadata.orgId': { $exists: true } },
          { 'metadata.roomMode': 'organization' }
      ]
  }).limit(10).lean();
  
  console.log('Events with Org Metadata:', eventsWithOrgMetadata.length);
  if (eventsWithOrgMetadata.length > 0) {
    console.log('Sample Event Metadata:', eventsWithOrgMetadata[0].metadata);
  }

  process.exit(0);
}).catch(console.error);
