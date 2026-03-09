import { v4 as uuidv4 } from 'uuid';
import logger from '../logger.js';
import eventLogger from '../services/EventLogger.js';
import { getRoom, saveRoom, getUser, saveUser, hasRoom, deleteUser, getSystemStats, deleteRoom, getActiveRooms } from '../redis.js';
import { createRoomSchema, joinRoomSchema } from '../validation.js';
import { sanitizeRoomId } from '../utils/sanitize.js';
import { supabase } from '../supabase.js';
import PermissionEngine from '../services/PermissionEngine.js';
// ─── Neural Controls ─────────────────────────────────────────────────────────
import roomKernel, { KERNEL_EVENTS } from '../services/RoomKernel.js';
import authorityEngine from '../services/AuthorityEngine.js';
import { Room as RoomModel } from '../models/Room.js';

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

            const userId = socket.user?.id || socket.user?.sub || userData?.id || socket.id;
            console.log(`[Room] Create request by user: ${userId}`);

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
                hasWaitingRoom: settings?.waiting_lobby !== false,
                settings: settings || {},
                waitingUsers: {}
            };

            await saveRoom(newRoom);
            logger.info(`[Room] Created room: ${roomId} by ${userId} (${socket.id})`);
            
            // Log Activity
            await eventLogger.logRoomCreated(roomId, userId, roomName || roomId);
            
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

            let room = await getRoom(roomId);
            
            // Fallback for Breakout Sessions: Hydrate from Supabase if not in Redis
            if (!room && supabase) {
                try {
                    const { data: breakout, error: breakoutErr } = await supabase
                        .from('breakout_sessions')
                        .select('*, organizations(name)')
                        .eq('id', roomId)
                        .maybeSingle();
                    
                    if (breakout && !breakoutErr) {
                        logger.info(`[Room] Hydrating breakout ${roomId} from Supabase...`);
                        room = {
                            id: breakout.id,
                            name: breakout.name || `Breakout ${roomId.substring(0, 4)}`,
                            password: breakout.password || null,
                            hostId: breakout.host_id,
                            coHosts: [],
                            users: [],
                            messages: [],
                            files: [],
                            createdAt: breakout.created_at || new Date(),
                            isActive: breakout.status !== 'CLOSED',
                            isLocked: false,
                            hasWaitingRoom: true,
                            settings: { 
                                mode: breakout.mode_override || 'mixed',
                                organizationId: breakout.organization_id,
                                organizationName: breakout.organizations?.name 
                            },
                            waitingUsers: {}
                        };
                        await saveRoom(room);
                    }
                } catch (err) {
                    logger.error(`[Room] Supabase breakout hydration error: ${err.message}`);
                }
            }

            if (!room) {
                if (typeof callback === 'function') return callback({ success: false, error: 'Room not found' });
                return;
            }

            if (room.isLocked) {
                if (typeof callback === 'function') return callback({ success: false, error: 'Room is locked' });
                return;
            }

            // Permission Engine Check
            const userId = socket.user?.id || socket.user?.sub || userData?.id || socket.id;
            const permission = PermissionEngine.canJoin(room, { id: userId, orgId: socket.user?.orgId }, payload.inviteToken, payload.joinCode);
            
            if (!permission.allowed) {
                if (typeof callback === 'function') return callback({ success: false, error: permission.reason, status: permission.status });
                return;
            }

            if (permission.status === 'WAITING_LOBBY') {
                // Handle waiting lobby logic
                room.waitingUsers = room.waitingUsers || {};
                room.waitingUsers[userId] = {
                    id: userId,
                    name: socket.user?.name || userData?.name || 'Guest',
                    avatarUrl: socket.user?.avatar_url || userData?.photoUrl || null,
                    socketId: socket.id,
                    requestedAt: new Date()
                };
                await saveRoom(room);
                
                // Notify host
                socket.to(room.id).emit('waiting-user-joined', room.waitingUsers[userId]);
                
                if (typeof callback === 'function') return callback({ success: true, status: 'WAITING_LOBBY' });
                return;
            }

            if (room.password && room.password !== password) {
                 // Check if user is the host (re-joining)
                 if (room.hostId !== userId) {
                     if (typeof callback === 'function') return callback({ success: false, error: 'Incorrect password' });
                     return;
                 }
            }

            // Create User Object
            console.log(`[Room] Join request by user: ${userId}`);
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

            // Log Activity
            await eventLogger.logUserJoin(roomId, userId, { roomName: room.name });

            // ── Neural Controls: Kernel USER_JOIN ─────────────────────────────
            // Fire-and-forget: kernel runs policy & state checks, broadcasts
            roomKernel.processEvent(io, {
              type:    KERNEL_EVENTS.USER_JOIN,
              roomId,
              userId,
              payload: { name: userName },
            }, {
              participants: room.users.length,
              user: { id: userId, role: newUser.isHost ? 'HOST' : 'LISTENER' },
            }).catch(err => logger.debug(`[Kernel] join check skipped: ${err.message}`));

            // Notify others
            socket.to(roomId).emit('user-joined', newUser);
            
            let fetchedOrgName = null;
            if (!room.organizationName && !room.settings?.organizationName && supabase) {
                try {
                     let orgIdToCheck = room.settings?.organizationId || room.id;
                     const { data: exactOrg } = await supabase.from('organizations').select('name').or(`id.eq.${orgIdToCheck},slug.eq.${orgIdToCheck}`).maybeSingle();
                     if (exactOrg) {
                         fetchedOrgName = exactOrg.name;
                     } else {
                         const hostIdToSearch = room.hostId || (room.settings && room.settings.ownerId);
                         if (hostIdToSearch) {
                             const { data: member } = await supabase.from('organization_members').select('organizations(name)').eq('user_id', hostIdToSearch).limit(1).maybeSingle();
                             if (member && member.organizations) fetchedOrgName = member.organizations.name;
                         }
                     }
                } catch (e) {}
            }

            const roomJoinedData = {
                roomId: room.id,
                name: room.name,
                organizationName: room.organizationName || room.settings?.organizationName || fetchedOrgName,
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
                virtualBrowserUrl: room.virtualBrowser?.url,
                isVirtualBrowserActive: room.virtualBrowser?.isActive,
                gameState: room.gameState,
                status: room.isActive ? 'live' : 'closed',
                settings: room.settings || {},
                mode: room.settings?.mode || 'mixed',
                createdAt: room.createdAt
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
    // LOBBY HANDLERS
    // ===========================
    socket.on('admit-user', async ({ roomId, userId }, callback) => {
        try {
            const room = await getRoom(roomId);
            if (!PermissionEngine.canManageSettings(room, socket.user?.id || socket.id)) {
                return callback?.({ success: false, error: 'Unauthorized' });
            }

            const waitingUser = room.waitingUsers?.[userId];
            if (!waitingUser) return callback?.({ success: false, error: 'User not found in lobby' });

            // Add to approved users list
            room.approvedUsers = room.approvedUsers || {};
            room.approvedUsers[userId] = true;
            
            // Notify the specific user they are approved
            io.to(waitingUser.socketId).emit('lobby:approved', { roomId });
            
            // Remove from lobby
            delete room.waitingUsers[userId];
            await saveRoom(room);

            // Notify room that a waiting user was removed from queue (handled by join-room later)
            io.to(roomId).emit('waiting-user-removed', userId);

            callback?.({ success: true });
        } catch (error) {
            callback?.({ success: false, error: error.message });
        }
    });

    socket.on('deny-user', async ({ roomId, userId }, callback) => {
        try {
            const room = await getRoom(roomId);
            if (!PermissionEngine.canManageSettings(room, socket.user?.id || socket.id)) {
                return callback?.({ success: false, error: 'Unauthorized' });
            }

            const waitingUser = room.waitingUsers?.[userId];
            if (waitingUser) {
                io.to(waitingUser.socketId).emit('join-denied', { roomId });
                delete room.waitingUsers[userId];
                await saveRoom(room);
                io.to(roomId).emit('waiting-user-removed', userId);
            }

            callback?.({ success: true });
        } catch (error) {
            callback?.({ success: false, error: error.message });
        }
    });

    // ===========================
    // SPEAKER HANDLERS
    // ===========================
    socket.on('room:toggle-mic-permission', async ({ roomId, userId, allowed }, callback) => {
        try {
            const room = await getRoom(roomId);
            if (!PermissionEngine.canManageSettings(room, socket.user?.id || socket.id)) {
                return callback?.({ success: false, error: 'Unauthorized' });
            }

            room.speakers = room.speakers || {};
            room.speakers[userId] = { allowed };
            await saveRoom(room);

            // Notify user and room
            io.to(roomId).emit('room:mic-permission-updated', { userId, allowed });
            
            callback?.({ success: true });
        } catch (error) {
            callback?.({ success: false, error: error.message });
        }
    });

    // ===========================
    // SECURITY HANDLERS
    // ===========================
    socket.on('room:rotate-code', async ({ roomId }, callback) => {
        try {
            const room = await getRoom(roomId);
            if (!PermissionEngine.canManageSettings(room, socket.user?.id || socket.id)) {
                return callback?.({ success: false, error: 'Unauthorized' });
            }

            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            room.joinCode = newCode;
            await saveRoom(room);

            // Sync to Supabase
            if (supabase) {
                await supabase.from('room_codes').upsert({ room_id: roomId, code: newCode });
            }

            socket.emit('room:code-updated', { code: newCode });
            callback?.({ success: true, code: newCode });
        } catch (error) {
            callback?.({ success: false, error: error.message });
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

            let hostName = room.hostName || null;
            let fetchedOrgName = null;
            if (supabase) {
                 try {
                     const hostIdToSearch = room.hostId || (room.settings && room.settings.ownerId);
                     if (hostIdToSearch) {
                         if (!hostName) {
                             const { data: profile } = await supabase.from('player_profiles').select('display_name').eq('id', hostIdToSearch).maybeSingle();
                             if (profile) hostName = profile.display_name;
                         }

                         if (!room.organizationName && !room.settings?.organizationName) {
                             let orgIdToCheck = room.settings?.organizationId || room.id;
                             const { data: exactOrg } = await supabase.from('organizations').select('name').or(`id.eq.${orgIdToCheck},slug.eq.${orgIdToCheck}`).maybeSingle();
                             
                             if (exactOrg) {
                                 fetchedOrgName = exactOrg.name;
                             } else {
                                 const { data: member } = await supabase.from('organization_members').select('organizations(name)').eq('user_id', hostIdToSearch).limit(1).maybeSingle();
                                 if (member && member.organizations) fetchedOrgName = member.organizations.name;
                             }
                         }
                     }
                 } catch (err) { }
            }

            if (typeof callback === 'function') {
                callback({
                    success: true,
                    name: room.name,
                    requiresPassword: !!room.password,
                    isLocked: !!room.isLocked,
                    userCount: room.users ? room.users.length : 0,
                    hostName: hostName || room.hostId || 'a Cospira user',
                    organizationName: room.organizationName || room.settings?.organizationName || fetchedOrgName || null
                });
            }
        } catch (error) {
            logger.error(`[Room] Check error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    // ===========================
    // GET USER HISTORY
    // ===========================
    socket.on('get-user-history', async ({ userId }, callback) => {
        try {
            const uid = userId || socket.user?.id || socket.id;
            if (!uid) return callback?.({ success: false, error: 'User ID required' });

            // Fetch join/created events for this user
            const events = await eventLogger.getUserGlobalActivity(uid, 50);
            
            // Filter only join/created events and group by roomId
            const historyMap = new Map();
            for (const ev of events) {
                if ((ev.eventType === 'join' || ev.eventType === 'room_created') && ev.roomId !== 'global') {
                    if (!historyMap.has(ev.roomId)) {
                        historyMap.set(ev.roomId, {
                            id: ev.roomId,
                            name: ev.metadata?.roomName || ev.roomId,
                            joinedAt: ev.timestamp,
                            isActive: await hasRoom(ev.roomId)
                        });
                    }
                }
            }

            callback?.({ 
                success: true, 
                history: Array.from(historyMap.values()).slice(0, 5) 
            });
        } catch (error) {
            logger.error(`[Room] History error: ${error.message}`);
            callback?.({ success: false, error: error.message });
        }
    });

    // ===========================
    // GET ALL ACTIVE ROOMS (Internal/Debug)
    // ===========================
    socket.on('get-rooms', async (callback) => {
        try {
            const rooms = await getActiveRooms();
            if (typeof callback === 'function') {
                callback(rooms.map(r => ({
                    id: r.id,
                    name: r.name,
                    userCount: r.users ? r.users.length : 0,
                    isActive: r.isActive
                })));
            }
        } catch (error) {
            if (typeof callback === 'function') callback([]);
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
                const user = room.users.find(u => u.id === userId || u.socketId === socket.id);
                
                // Calculate duration
                const duration = user && user.joinedAt ? (new Date() - new Date(user.joinedAt)) / 1000 : 0;
                
                // Log Activity
                eventLogger.logUserLeave(rid, userId, { 
                    duration, 
                    roomName: room.name 
                });

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
    // DISBAND ROOM (Host Only)
    // ===========================
    socket.on('disband-room', async ({ roomId }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) return callback?.({ success: false, error: 'Invalid room id' });

            const room = await getRoom(rid);
            if (!room) return callback?.({ success: false, error: 'Room not found' });

            // Only host or authorized user can disband
            const userId = socket.user?.id || socket.user?.sub || socket.id;
            if (room.hostId !== userId) {
                return callback?.({ success: false, error: 'Unauthorized: Only host can disband' });
            }

            logger.info(`[Room] Disbanding room: ${rid} by host: ${userId}`);

            // Notify all users in the room
            io.to(rid).emit('room-disbanded', { roomId: rid, reason: 'disbanded_by_host' });

            // Remove room from storage
            await deleteRoom(rid);

            // Log activity
            eventLogger.logRoomDeleted(rid, userId, room.name);

            if (typeof callback === 'function') callback({ success: true });
            
            // Broadcast updated stats
            broadcastStats();

        } catch (error) {
            logger.error(`[Room] Disband error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
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
                        // ── Neural Controls: Kernel MIC_REQUEST ──────────────
                        let kernelAllowed = true;
                        if (audio === true) {
                            try {
                                const mongoRoom = await RoomModel.findByRoomId(rid);
                                if (mongoRoom) {
                                    const kResult = await roomKernel.processEvent(io, {
                                        type:    KERNEL_EVENTS.MIC_REQUEST,
                                        roomId:  rid,
                                        userId:  broadcastUserId,
                                        payload: {},
                                    }, {
                                        participants: room.users.length,
                                        user: { id: broadcastUserId },
                                    });
                                    kernelAllowed = kResult.allowed;
                                    if (!kernelAllowed) {
                                        socket.emit('system:announcement', {
                                            type: 'warning',
                                            message: kResult.reason || 'Microphone access denied.',
                                        });
                                    }
                                }
                            } catch (err) {
                                logger.debug(`[Kernel] MIC_REQUEST check skipped: ${err.message}`);
                            }
                        }
                        // Legacy PermissionEngine fallback
                        const legacyAllowed = !audio || PermissionEngine.canSpeak(room, broadcastUserId);

                        if (audio === true && (!kernelAllowed || !legacyAllowed)) {
                            socket.emit('system:announcement', { 
                                type: 'warning', 
                                message: 'Host has restricted speaking. You need permission to unmute.' 
                            });
                            // Force audio false in state
                            roomUser.audio = false;
                            roomUser.isMuted = true;
                        } else {
                            roomUser.audio = audio;
                            roomUser.isMuted = !audio;
                        }
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
                    if (enabled === true) {
                        // ── Neural Controls: Kernel audio toggle check ───────
                        try {
                            const mongoRoom = await RoomModel.findByRoomId(rid);
                            if (mongoRoom) {
                                const kResult = await roomKernel.processEvent(io, {
                                    type:    KERNEL_EVENTS.MIC_REQUEST,
                                    roomId:  rid,
                                    userId:  broadcastUserId,
                                    payload: {},
                                }, { participants: room.users.length, user: { id: broadcastUserId } });
                                if (!kResult.allowed) {
                                    socket.emit('system:announcement', { type: 'warning', message: kResult.reason || 'Speaking restricted.' });
                                    return;
                                }
                            }
                        } catch (err) {
                            logger.debug(`[Kernel] toggle-audio check skipped: ${err.message}`);
                        }
                        // Legacy fallback
                        if (!PermissionEngine.canSpeak(room, broadcastUserId)) {
                            socket.emit('system:announcement', { type: 'warning', message: 'Speaking restricted by host.' });
                            return;
                        }
                    }
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

    // ===========================
    // DISCONNECT CLEANUP
    // ===========================
    socket.on('disconnecting', async () => {
        try {
            const rooms = Array.from(socket.rooms);
            for (const rid of rooms) {
                if (rid && rid !== socket.id) {
                    const room = await getRoom(rid);
                    if (room) {
                        const userId = socket.user?.id || socket.id;
                        const user = room.users.find(u => u.id === userId || u.socketId === socket.id);
                        if (user) {
                            const duration = user.joinedAt ? (new Date() - new Date(user.joinedAt)) / 1000 : 0;
                            
                            // Log Activity if not already logged (e.g. by manual leave)
                            eventLogger.logUserLeave(rid, userId, { 
                                duration, 
                                roomName: room.name,
                                reason: 'disconnect'
                            });
                            
                            room.users = room.users.filter(u => u.id !== userId && u.socketId !== socket.id);
                            await saveRoom(room);
                            
                            socket.to(rid).emit('user-left', { userId });

                            // ── Neural Controls: Kernel USER_LEAVE + auto-promote ──
                            roomKernel.processEvent(io, {
                                type:    KERNEL_EVENTS.USER_LEAVE,
                                roomId:  rid,
                                userId,
                                payload: {},
                            }, { user: { id: userId } }).catch(err =>
                                logger.debug(`[Kernel] USER_LEAVE skipped: ${err.message}`)
                            );
                            
                            if (sfuHandler) {
                                sfuHandler.removePeer(rid, socket.id);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            logger.error('[Room] Disconnect cleanup error:', err);
        }
    });
}
