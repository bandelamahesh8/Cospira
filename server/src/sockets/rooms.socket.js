import { v4 as uuidv4 } from 'uuid';
import logger from '../logger.js';
import { getRoom, saveRoom, getUser, saveUser, hasRoom, deleteUser, getSystemStats } from '../redis.js';
import { createRoomSchema, joinRoomSchema } from '../validation.js';
import { sanitizeRoomId } from '../utils/sanitize.js';

export default function registerRoomHandlers(io, socket, sfuHandler) {
    
    // ===========================
    // CREATE ROOM
    // ===========================
    socket.on('create-room', async (payload, callback) => {
        try {
            const validatedData = createRoomSchema.parse(payload);
            const { roomId, roomName, password, settings, user: userData } = validatedData;
            
            if (await hasRoom(roomId)) {
                return callback({ success: false, error: 'Room already exists' });
            }

            const userId = socket.user?.id || userData?.id || socket.id;

            const newRoom = {
                id: roomId,
                name: roomName || roomId,
                password,
                hostId: userId,
                coHosts: [],
                users: [], // Array of user objects
                messages: [],
                files: [],
                createdAt: new Date(),
                isActive: true,
                isLocked: false,
                hasWaitingRoom: false,
                settings: settings || {},
                waitingUsers: {}
            };

            await saveRoom(newRoom);
            logger.info(`[Room] Created room: ${roomId} by ${userId} (${socket.id})`);
            
            // Broadcast new room count
            broadcastStats();
            
            if (typeof callback === 'function') callback({ success: true, roomId });
        } catch (error) {
            logger.error(`[Room] Create error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    // ===========================
    // JOIN ROOM
    // ===========================
    socket.on('join-room', async (payload, callback) => {
        try {
            const validatedData = joinRoomSchema.parse(payload);
            const { roomId, password, user: userData } = validatedData;

            const room = await getRoom(roomId);
            if (!room) {
                if (typeof callback === 'function') return callback({ success: false, error: 'Room not found' });
                return;
            }

            if (room.isLocked) {
                if (typeof callback === 'function') return callback({ success: false, error: 'Room is locked' });
                return;
            }

            if (room.password && room.password !== password) {
                 // Check if user is the host (re-joining)
                 if (room.hostId !== (socket.user?.id || socket.id)) {
                     if (typeof callback === 'function') return callback({ success: false, error: 'Invalid password' });
                     return;
                 }
            }

            // Create User Object
            const userId = socket.user?.id || userData?.id || socket.id;
            const userName = socket.user?.name || userData?.name || 'Guest';
            
            const newUser = {
                id: userId,
                name: userName,
                socketId: socket.id,
                joinedAt: new Date(),
                isHost: room.hostId === userId,
                audio: false, // Initial state
                video: false,  // Initial state
                isMuted: true,
                isVideoOn: false
            };

            // Add to Room
            socket.join(roomId);
            
            // Remove existing if present (re-join)
            room.users = room.users.filter(u => u.id !== userId);
            room.users.push(newUser);
            
            await saveRoom(room);
            await saveUser(socket.id, newUser);

            // Notify others
            socket.to(roomId).emit('user-joined', newUser);
            
            const roomJoinedData = {
                roomId: room.id,
                name: room.name,
                users: room.users,
                messages: room.messages,
                files: room.files,
                isHost: room.hostId === userId,
                hasWaitingRoom: room.hasWaitingRoom,
                waitingUsers: Object.values(room.waitingUsers || {}),
                accessType: room.settings?.accessType || 'public',
                inviteToken: room.settings?.inviteToken,
                youtubeVideoId: room.youtubeVideoId,
                youtubeStatus: room.youtubeStatus,
                youtubeCurrentTime: room.youtubeCurrentTime,
                youtubeLastActionTime: room.youtubeLastActionTime,
                youtubePresenterName: room.youtubePresenterName,
                gameState: room.gameState,
                status: room.isActive ? 'live' : 'closed',
                settings: room.settings || {},
                mode: room.settings?.mode || 'mixed'
            };
            
            socket.emit('room-joined', roomJoinedData);

            // Return success with current room state. joinedAsUserId ensures clients use
            // the same id for SFU producers as room.users, fixing remote stream lookup.
            if (typeof callback === 'function') {
                callback({ 
                    success: true, 
                    joinedAsUserId: userId,
                    room: {
                        ...room,
                        users: room.users 
                    }
                });
            }

            logger.info(`[Room] User ${userId} joined room ${roomId}`);

        } catch (error) {
            logger.error(`[Room] Join error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    // ===========================
    // GET SYSTEM STATS
    // ===========================
    socket.on('get-system-stats', async (callback) => {
        try {
            const stats = await getSystemStats();
            if (typeof callback === 'function') {
                callback({ success: true, stats });
            }
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    // Helper to broadcast stats to everyone
    const broadcastStats = async () => {
        const stats = await getSystemStats();
        io.emit('stats-updated', stats);
    };

    // ===========================
    // CHECK ROOM (Pre-Join)
    // ===========================
    socket.on('check-room', async ({ roomId }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) {
                if (typeof callback === 'function') return callback({ success: false, error: 'Invalid room id' });
                return;
            }
            const room = await getRoom(rid);
            if (!room) {
                 if (typeof callback === 'function') return callback({ success: false, error: 'Room not found' });
                 return;
            }

            if (typeof callback === 'function') {
                callback({
                    success: true,
                    name: room.name,
                    requiresPassword: !!room.password,
                    isLocked: !!room.isLocked,
                    userCount: room.users ? room.users.length : 0
                });
            }
        } catch (error) {
            logger.error(`[Room] Check error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    // ===========================
    // LEAVE ROOM
    // ===========================
    socket.on('leave-room', async ({ roomId }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) {
                if (typeof callback === 'function') callback({ success: false, error: 'Invalid room id' });
                return;
            }
            logger.info(`[Room] User leaving room: ${rid}`);
            
            const room = await getRoom(rid);
            if (room) {
                const userId = socket.user?.id || socket.id;
                room.users = room.users.filter(u => u.id !== userId && u.socketId !== socket.id);
                
                await saveRoom(room);
                
                socket.to(rid).emit('user-left', { userId });
                socket.leave(rid);
                
                if (sfuHandler) {
                    sfuHandler.removePeer(rid, socket.id);
                }
            }
            
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            logger.error(`[Room] Leave error: ${error.message}`);
        }
    });

    // ===========================
    // CRITICAL HOTFIX: MEDIA STATE
    // userId must match room.users[].id for VideoGrid remoteStreams lookup
    // ===========================
    socket.on('user:media-state', async ({ roomId, audio, video }) => {
        if (typeof audio !== 'boolean' && audio !== undefined) return;
        if (typeof video !== 'boolean' && video !== undefined) return;
        const rid = sanitizeRoomId(roomId);
        if (!rid) return;

        let broadcastUserId = socket.user?.id || socket.id;
        try {
            const room = await getRoom(rid);
            if (room?.users) {
                const roomUser = room.users.find(u => u.socketId === socket.id);
                if (roomUser) {
                    broadcastUserId = roomUser.id;
                    if (audio !== undefined) {
                        roomUser.audio = audio;
                        roomUser.isMuted = !audio;
                    }
                    if (video !== undefined) {
                        roomUser.video = video;
                        roomUser.isVideoOn = video;
                    }
                    roomUser.audioEnabled = audio ?? roomUser.audioEnabled;
                    roomUser.videoEnabled = video ?? roomUser.videoEnabled;
                    await saveRoom(room);
                }
            }
            if (broadcastUserId === socket.id) {
                const savedUser = await getUser(socket.id);
                if (savedUser?.id) broadcastUserId = savedUser.id;
            }
        } catch (err) {
            logger.error('[Room] user:media-state Redis update:', err);
        }

        socket.to(rid).emit('user:media-state', {
            userId: broadcastUserId,
            audio,
            video
        });
    });

    socket.on('toggle-audio', async ({ roomId, enabled }) => {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return;
        let broadcastUserId = socket.user?.id || socket.id;
        try {
            const room = await getRoom(rid);
            if (room?.users) {
                const roomUser = room.users.find(u => u.socketId === socket.id);
                if (roomUser) {
                    broadcastUserId = roomUser.id;
                }
            }
        } catch (_) {}
        socket.to(rid).emit('user:media-state', {
            userId: broadcastUserId,
            audio: enabled,
            video: undefined
        });
    });

    socket.on('toggle-video', async ({ roomId, enabled }) => {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return;
        let broadcastUserId = socket.user?.id || socket.id;
        try {
            const room = await getRoom(rid);
            if (room?.users) {
                const roomUser = room.users.find(u => u.socketId === socket.id);
                if (roomUser) broadcastUserId = roomUser.id;
            }
        } catch (_) {}
        socket.to(rid).emit('user:media-state', {
            userId: broadcastUserId,
            audio: undefined,
            video: enabled
        });
    });
}
