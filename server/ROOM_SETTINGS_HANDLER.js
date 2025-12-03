// ADD THIS CODE TO server/src/index.js
// Location: After the 'leave-room' handler (around line 360-370)
// OR after any other socket.on handler

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
