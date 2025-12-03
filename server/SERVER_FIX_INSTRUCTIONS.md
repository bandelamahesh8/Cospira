# Server File Fix Instructions

## Problem
The server file (`server/src/index.js`) has syntax errors from manual code addition.

## Solution
The backup file is missing recent fixes (auto-cleanup, room settings handler). 

## Quick Fix
Since automated edits keep corrupting the file, here's the manual fix:

1. **Restore from backup** (already done)
2. **Add the room settings handler** manually:
   - Open `server/src/index.js`
   - Find the `leave-room` handler (around line 360-370)
   - Add this code AFTER the `leave-room` handler closing brace `});`:

```javascript
  // Update room settings (Host only)
  socket.on('update-room-settings', ({ roomId, roomName, password }) => {
    const room = rooms.get(roomId);
    const user = users.get(socket.id);

    // Check if user is host
    const isHost = room && user && room.hostId === user.id;

    if (!isHost) {
      socket.emit('error', 'Only the host can update room settings');
      return;
    }

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Update room name if provided
    if (roomName !== undefined && roomName.trim() !== '') {
      room.name = roomName.trim();
    }

    // Update password if provided (empty string removes password)
    if (password !== undefined) {
      room.passwordHash = password.trim() || null;
    }

    // Notify all users in the room
    io.to(roomId).emit('room-settings-updated', {
      roomId,
      roomName: room.name,
      hasPassword: !!room.passwordHash
    });

    // Update dashboard
    io.emit('room-updated', {
      id: roomId,
      name: room.name,
      requiresPassword: !!room.passwordHash
    });

    socket.emit('room-settings-update-success');
    console.log(`Room ${roomId} settings updated by host ${socket.id}`);
  });
```

3. **Save the file**
4. **Restart server**: `npm start`

## Note
The backup file is from before our recent changes, so it's missing:
- Auto-cleanup when room becomes empty
- Room settings update handler

The room settings handler is the critical one for the new feature to work.
