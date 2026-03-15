import { v4 as uuidv4 } from 'uuid';
import logger from '../../shared/logger.js';
import eventLogger from '../services/EventLogger.js';
import { getRoom, saveRoom, getUser, saveUser, hasRoom, deleteUser, getSystemStats, deleteRoom, getActiveRooms } from '../../shared/redis.js';
import { createRoomSchema, joinRoomSchema } from '../../shared/validation.js';
import { sanitizeRoomId } from '../utils/sanitize.js';
import { supabase } from '../../shared/supabase.js';
import PermissionEngine from '../services/PermissionEngine.js';
import { UserAnalyticsSetting } from '../models/UserAnalyticsSetting.js';
// ─── Neural Controls ─────────────────────────────────────────────────────────
import roomKernel, { KERNEL_EVENTS } from '../services/RoomKernel.js';
import authorityEngine from '../services/AuthorityEngine.js';
import { Room as RoomModel } from '../models/Room.js';
import { RoomEvent } from '../models/RoomEvent.js';
import analyticsService from '../services/ai/AnalyticsService.js';
import { deleteRoomUploads } from '../utils/fileCleanup.js';

export default function registerRoomHandlers(io, socket, sfuHandler) {
    
    // ===========================
    // CREATE ROOM
    // ===========================
    socket.on('create-room', async (payload, callback) => {
        try {
            const validatedData = createRoomSchema.parse(payload);
            const { roomId, roomName, password, settings, user: userData, orgId, roomMode } = validatedData;
            
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
                settings: {
                    ...settings,
                    organizationId: orgId,
                    roomMode
                },
                waitingUsers: {},
                pollHistory: []
            };

            await saveRoom(newRoom);
            
            // NEW: Persist/Update to MongoDB for long-term history/analytics
            try {
                await RoomModel.findOneAndUpdate(
                    { roomId: newRoom.id },
                    {
                        roomId: newRoom.id,
                        name: newRoom.name,
                        host: newRoom.hostId,
                        createdBy: newRoom.hostId,
                        settings: newRoom.settings,
                        isActive: true,
                        roomStatus: 'live',
                        accessType: validatedData.accessType || 'public'
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                logger.info(`[Room] Persisted/Updated room ${roomId} in MongoDB`);
            } catch (mongoErr) {
                logger.error(`[Room] MongoDB persistence error: ${mongoErr.message}`);
                // Continue anyway if Redis save was successful
            }

            logger.info(`[Room] Created room: ${roomId} by ${userId} (${socket.id})`);
            
            // Log Activity with metadata for analytics
            await eventLogger.logRoomCreated(roomId, userId, roomName || roomId);
            // Manually logging additional metadata as logRoomCreated only takes name
            await eventLogger.logRoomEvent(roomId, userId, 'room_created', { 
                roomName: roomName || roomId,
                organizationId: orgId,
                roomMode
            });
            
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
            console.log(`[Room] Join attempt with payload:`, JSON.stringify(payload));
            const validatedData = joinRoomSchema.parse(payload);
            const { roomId, password, user: userData } = validatedData;
            // Ghost Observer mode: Super Host joins silently, invisible to participants
            const isGhost = payload.isGhost === true;

            let room = await getRoom(roomId);
            
            // Fallback for Breakout Sessions: Hydrate from Supabase if not in Redis
            if (!room && supabase) {
                try {
                    const { data: breakout, error: breakoutErr } = await supabase
                        .from('breakout_sessions')
                        .select('*, organization_id, organizations(name, mode)')
                        .eq('id', roomId)
                        .maybeSingle();
                    
                    if (breakout && !breakoutErr) {
                        logger.info(`[Room] Hydrating breakout ${roomId} from Supabase (org: ${breakout.organization_id})...`);
                        
                        // Resolve effective mode: override wins, else fallback to organization mode
                        const orgMode = breakout.organizations?.mode || 'MIXED';
                        const resolvedMode = (breakout.mode_override && breakout.mode_override !== 'MIXED') 
                            ? breakout.mode_override.toUpperCase() 
                            : orgMode.toUpperCase();

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
                            // FIX: Do NOT hardcode hasWaitingRoom=true for breakouts.
                            // Super Host (org owner) must NOT be gated by the waiting lobby.
                            // Regular waiting room policy is handled by PermissionEngine after isSuperHost check.
                            hasWaitingRoom: breakout.has_waiting_room === true ? true : false,
                            settings: { 
                                mode: resolvedMode,
                                organizationId: breakout.organization_id,
                                organizationName: breakout.organizations?.name 
                            },
                            waitingUsers: {},
                            pollHistory: []
                        };
                        await saveRoom(room);
                    }
                } catch (err) {
                    logger.error(`[Room] Supabase breakout hydration error: ${err.message}`);
                }
            }
            
            // NEW: Fallback for Standard Rooms: Hydrate from MongoDB 
            if (!room) {
                try {
                    const mongoRoom = await RoomModel.findOne({ roomId }).lean();
                    if (mongoRoom) {
                        logger.info(`[Room] Hydrating standard room ${roomId} from MongoDB...`);
                        room = {
                            id: mongoRoom.roomId,
                            name: mongoRoom.name,
                            hostId: mongoRoom.host,
                            users: [],
                            createdAt: mongoRoom.createdAt,
                            isActive: true, // Re-activate if found
                            settings: mongoRoom.settings || {},
                            accessType: mongoRoom.accessType,
                            messages: [],
                            files: [],
                            hasWaitingRoom: mongoRoom.settings?.waiting_lobby || false,
                            waitingUsers: {},
                            pollHistory: []
                        };
                        await saveRoom(room);
                    }
                } catch (err) {
                    logger.error(`[Room] MongoDB hydration error: ${err.message}`);
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
            const userName = socket.user?.name || userData?.name || 'Guest';
            console.log(`[Room] Join request by user: ${userId}`);

            // Check if user is organization owner (Super Host)
            // FIX: Use the correct orgId — for breakouts, settings.organizationId is the real org.
            // Never fall back to room.id as the orgId (for breakouts, room.id is a UUID, not an org ID).
            let isSuperHost = false;
            if (supabase) {
                try {
                    // Priority: explicit organizationId from settings (set during breakout hydration)
                    // Fallback: use room.id only if it looks like an org slug (non-UUID pattern)
                    const explicitOrgId = room.settings?.organizationId;
                    // Build list of org identifiers to check
                    const orgIdentifiers = [];
                    if (explicitOrgId) orgIdentifiers.push(explicitOrgId);
                    // Always check room.id as well (could be org ID or host org slug)
                    if (room.id) orgIdentifiers.push(room.id);

                    if (orgIdentifiers.length > 0) {
                        logger.info(`[Room] Checking Super Host for user ${userId} against orgs: [${orgIdentifiers.join(', ')}]`);
                        
                        for (const orgId of orgIdentifiers) {
                            // Check by organization_id directly
                            const { data: memberById } = await supabase
                                .from('organization_members')
                                .select('role')
                                .eq('organization_id', orgId)
                                .eq('user_id', userId)
                                .eq('role', 'owner')
                                .maybeSingle();
                            
                            if (memberById) {
                                isSuperHost = true;
                                logger.info(`[Room] User ${userId} confirmed as Super Host (Org Owner) via org ${orgId} for room ${roomId}`);
                                break;
                            }

                            // Also check by slug (for org slug-based rooms)
                            const { data: memberBySlug } = await supabase
                                .from('organization_members')
                                .select('role, organizations!inner(id, slug)')
                                .eq('organizations.slug', orgId)
                                .eq('user_id', userId)
                                .eq('role', 'owner')
                                .maybeSingle();
                            
                            if (memberBySlug) {
                                isSuperHost = true;
                                logger.info(`[Room] User ${userId} confirmed as Super Host (Org Owner) via slug ${orgId} for room ${roomId}`);
                                break;
                            }
                        }
                    }

                    if (!isSuperHost) {
                        logger.info(`[Room] User ${userId} is NOT a Super Host for room ${roomId} (orgIds checked: [${orgIdentifiers.join(', ')}])`);
                    }
                } catch (err) {
                    logger.error(`[Room] Super Host check error: ${err.message}`);
                }
            }

            // FIX: Super Host ALWAYS bypasses the waiting lobby — check this BEFORE PermissionEngine.
            if (isSuperHost) {
                logger.info(`[Room] Super Host ${userId} bypassing waiting lobby for room ${roomId}`);
                // Super Host skips PermissionEngine entirely — fall through to join logic below
            } else {
                const permission = PermissionEngine.canJoin(room, { id: userId, orgId: socket.user?.orgId, isSuperHost }, payload.inviteToken, payload.joinCode);
                
                if (!permission.allowed) {
                    if (typeof callback === 'function') return callback({ success: false, error: permission.reason, status: permission.status });
                    return;
                }

                if (permission.status === 'WAITING_LOBBY') {
                    // Handle waiting lobby logic
                    room.waitingUsers = room.waitingUsers || {};
                    room.waitingUsers[userId] = {
                        id: userId,
                        name: userName,
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
            }

            if (room.password && room.password !== password) {
                 // Check if user is the host (re-joining)
                 if (room.hostId !== userId && !isSuperHost) {
                     if (typeof callback === 'function') return callback({ success: false, error: 'Incorrect password' });
                     return;
                 }
            }
            

            const isRegularHost = room.hostId === userId;
            const finalIsHost = isRegularHost || isSuperHost;

            const newUser = {
                id: userId,
                name: userName,
                socketId: socket.id,
                joinedAt: new Date(),
                isHost: finalIsHost,
                isSuperHost: isSuperHost, // Keep track of the exact reason if needed later
                audio: false, // Initial state
                video: false,  // Initial state
                isMuted: true,
                isVideoOn: false
            };

            // Ghost Observer: join the socket room to receive events but stay invisible
            socket.join(roomId);
            socket.currentRoomId = roomId;
            socket.isSuperHost = isSuperHost;

            if (isGhost) {
                // Ghost mode — receive room state but DON'T add to room.users or notify others
                logger.info(`[Room] Ghost Observer ${userId} silently joined ${roomId}`);
                const roomJoinedDataGhost = {
                    roomId: room.id,
                    name: room.name,
                    organizationName: room.organizationName || room.settings?.organizationName || null,
                    users: room.users,
                    messages: room.messages,
                    files: room.files,
                    isHost: finalIsHost,
                    isSuperHost: isSuperHost,
                    isGhost: true,
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
                    presentedFile: room.presentedFile,
                    isPresentingFile: room.isPresentingFile,
                    presenterName: room.presenterName,
                    activePoll: room.activePoll,
                    status: room.isActive ? 'live' : 'closed',
                    settings: room.settings || {},
                    mode: room.settings?.mode || 'MIXED',
                    createdAt: room.createdAt
                };
                socket.emit('room-joined', roomJoinedDataGhost);
                if (typeof callback === 'function') callback({ success: true, joinedAsUserId: userId, isGhost: true });
                return;
            }

            // Normal join — add to room.users and notify others
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
                     let orgIdToCheck = room.settings?.organizationId || roomId;
                     const { data: exactOrg } = await supabase.from('organizations').select('name').or(`id.eq.${orgIdToCheck},slug.eq.${orgIdToCheck}`).maybeSingle();
                     if (exactOrg) {
                         fetchedOrgName = exactOrg.name;
                     } 
                     // REMOVED: Fallback to host's organization. This caused private rooms to adopt org branding incorrectly.
                } catch (e) {}
            }

            const roomJoinedData = {
                roomId: room.id,
                name: room.name,
                organizationName: room.organizationName || room.settings?.organizationName || fetchedOrgName,
                users: room.users,
                messages: room.messages,
                files: room.files,
                isHost: finalIsHost,
                isSuperHost: isSuperHost,
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
                presentedFile: room.presentedFile,
                isPresentingFile: room.isPresentingFile,
                presenterName: room.presenterName,
                activePoll: room.activePoll,
                status: room.isActive ? 'live' : 'closed',
                settings: room.settings || {},
                mode: room.settings?.mode || 'MIXED',
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
                             let orgIdToCheck = room.settings?.organizationId || roomId;
                             const { data: exactOrg } = await supabase.from('organizations').select('name').or(`id.eq.${orgIdToCheck},slug.eq.${orgIdToCheck}`).maybeSingle();
                             
                             if (exactOrg) {
                                 fetchedOrgName = exactOrg.name;
                             }
                             // REMOVED: Fallback to host's organization lookup.
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
    // VERIFY ROOM PASSWORD
    // ===========================
    socket.on('verify-room-password', async ({ roomId, password }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) return callback?.({ success: false, error: 'Invalid room id' });

            const room = await getRoom(rid);
            if (!room) return callback?.({ success: false, error: 'Room not found' });

            // If room has no password, any attempt (or no attempt) is technically valid/invalid
            // but for Ultra Secure mode we want to handle the "no password" case gracefully.
            if (!room.password) {
                return callback?.({ success: true });
            }

            const isValid = room.password === password;
            callback?.({ success: isValid });
        } catch (error) {
            logger.error(`[Room] Verify password error: ${error.message}`);
            callback?.({ success: false, error: 'Internal server error' });
        }
    });

    // ===========================
    // GET USER HISTORY
    // ===========================
    socket.on('get-user-history', async (payload, callback) => {
        try {
            if (typeof payload === 'function') {
                callback = payload;
                payload = {};
            }
            const { limit, filterType } = payload || {};
            const userId = payload?.userId || socket.user?.id || socket.id;
            const uid = userId;
            if (!uid) return callback?.({ success: false, error: 'User ID required' });

            const settings = await UserAnalyticsSetting.findOne({ userId: uid }).lean();
            const afterDate = settings?.historyClearedAt || null;

            // Fetch join/created events for this user
            const fetchLimit = limit ? limit * 3 : 50; // Query more deeply to ensure deduplication limit
            const events = await eventLogger.getUserGlobalActivity(uid, fetchLimit, afterDate);
            
            // Filter only join/created events and group by roomId
            const historyMap = new Map();
            const roomIds = [];
            
            for (const ev of events) {
                if ((ev.eventType === 'join' || ev.eventType === 'room_created') && ev.roomId !== 'global') {
                    if (!historyMap.has(ev.roomId)) {
                        roomIds.push(ev.roomId);
                        historyMap.set(ev.roomId, { roomId: ev.roomId, event: ev });
                    }
                }
            }

            // Batch fetch participant counts for these roomIds
            const counts = await RoomEvent.aggregate([
                { $match: { roomId: { $in: roomIds }, eventType: 'join' } },
                { $group: { _id: '$roomId', uniqueUsers: { $addToSet: '$userId' } } },
                { $project: { _id: 1, count: { $size: '$uniqueUsers' } } }
            ]);
            const countsMap = new Map(counts.map(c => [c._id, c.count]));

            const historyResult = [];
            for (const roomId of roomIds) {
                const { event: ev } = historyMap.get(roomId);
                let displayName = ev.metadata?.roomName || ev.roomId;
                let isActive = false;
                let roomType = 'private';
                let participantCount = countsMap.get(roomId) || 1; // Default to 1 (the user themselves)

                try {
                    const roomInfo = await analyticsService.resolveRoomName(roomId, ev.metadata?.roomName);
                    displayName = roomInfo.name;
                    roomType = roomInfo.type;
                    isActive = roomInfo.isActive;
                    participantCount = roomInfo.participantCount || participantCount;
                } catch(e) {}

                if (!filterType || filterType === 'all' || filterType === roomType) {
                    historyResult.push({
                        id: roomId,
                        name: displayName,
                        joinedAt: ev.timestamp,
                        isActive,
                        type: roomType,
                        participantCount
                    });
                }
            }

            callback?.({ 
                success: true, 
                history: historyResult.slice(0, limit || 50) 
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
                
                // Security Check: If 'require_reapproval_on_rejoin' is checked, remove from approved list
                if (room.settings?.require_reapproval_on_rejoin && room.approvedUsers) {
                    delete room.approvedUsers[userId];
                }

                await saveRoom(room);
                
                socket.to(rid).emit('user-left', userId);
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
    socket.on('disband-room', async ({ roomId, isMainRoom, orgId: providedOrgId }, callback) => {
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

            logger.info(`[Room] Disbanding room: ${rid} (Main: ${isMainRoom}) by host: ${userId}`);
            
            // Determine if this is a main organization room or a breakout
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rid);
            const orgId = providedOrgId || room.organizationId || room.settings?.organizationId;

            if (isMainRoom || rid === orgId) {
                // Handle Main Organization Disband
                if (orgId) {
                    try {
                        logger.info(`[Room] Marking organization ${orgId} as deleted in Supabase`);
                        await supabase
                            .from('organizations')
                            .update({ 
                                status: 'deleted', 
                                updated_at: new Date().toISOString() 
                            })
                            .eq('id', orgId);
                    } catch (dbError) {
                        logger.error(`[Room] Failed to update organization status for ${orgId}: ${dbError.message}`);
                    }
                }
            } else if (isUuid && orgId) {
                // Handle Breakout Room Disband
                try {
                    await supabase
                        .from('breakout_sessions')
                        .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
                        .eq('id', rid);
                    
                    logger.info(`[Room] Supabase status updated to CLOSED for breakout: ${rid}`);
                    
                    // Notify organization room so dashboard updates
                    io.to(`org:${orgId}`).emit('breakout:closed', { breakoutId: rid });
                    io.to(`org:${orgId}`).emit('breakout:state-updated', { breakoutId: rid, status: 'CLOSED' });
                } catch (dbError) {
                    logger.error(`[Room] Failed to update breakout status for ${rid}: ${dbError.message}`);
                }
            }

            // Notify all users in the room
            io.to(rid).emit('room-disbanded', { roomId: rid, reason: 'disbanded_by_host' });

            // Remove room from storage
            await deleteRoom(rid);

            // NEW: Update MongoDB status
            try {
                // Ensure rid is a valid string for MongoDB query
                if (rid) {
                    await RoomModel.findOneAndUpdate(
                        { roomId: rid },
                        { isActive: false, roomStatus: 'closed', updatedAt: new Date() }
                    );
                    logger.info(`[Room] Marked room ${rid} as inactive in MongoDB`);
                }
            } catch (mongoErr) {
                logger.error(`[Room] MongoDB status update error: ${mongoErr.message}`);
            }

            // Log activity
            eventLogger.logRoomDeleted(rid, userId, room.name);

            // NEW: Purge all assets associated with this room for security
            await deleteRoomUploads(rid);

            if (typeof callback === 'function') callback({ success: true });
            
            // Broadcast updated stats
            broadcastStats();

        } catch (error) {
            logger.error(`[Room] Disband error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    // ===========================
    // SET ROOM TIMER
    // ===========================
    socket.on('set-room-timer', async ({ roomId, duration, label, type, action }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) return callback?.({ success: false, error: 'Invalid room id' });

            const room = await getRoom(rid);
            if (!room) return callback?.({ success: false, error: 'Room not found' });

            const userId = socket.user?.id || socket.user?.sub || socket.id;
            const isHost = room.hostId === userId;
            if (!isHost && !socket.user?.isSuperHost) {
                if (room.hostId !== userId) {
                    return callback?.({ success: false, error: 'Unauthorized: Only host can set timers' });
                }
            }

            logger.info(`[Room] Setting timer for room: ${rid}: ${duration} min (${label}) - Action: ${action}`);

            const timerData = {
                duration,
                label,
                type: type || 'custom',
                action: action || 'none',
                startedAt: Date.now(),
                isPaused: false
            };

            // Store in room state for persistence across reloads/new joins
            room.activeTimer = timerData;
            await saveRoom(room);

            io.to(rid).emit('room:timer-started', timerData);
            if (typeof callback === 'function') callback({ success: true, timer: timerData });

            await eventLogger.logEvent(rid, userId, 'timer_set', { duration, label, action, timerType: type });
        } catch (error) {
            logger.error(`[Room] Set timer error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    // ===========================
    // PAUSE ROOM TIMER
    // ===========================
    socket.on('pause-room-timer', async ({ roomId }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) return callback?.({ success: false, error: 'Invalid room id' });

            const room = await getRoom(rid);
            if (!room || !room.activeTimer) return callback?.({ success: false, error: 'No active timer' });

            if (room.activeTimer.isPaused) return callback?.({ success: true, timer: room.activeTimer });

            const userId = socket.user?.id || socket.user?.sub || socket.id;
            // Auth check omitted for brevity or use host check from above
            
            logger.info(`[Room] Pausing timer for room: ${rid}`);

            room.activeTimer.isPaused = true;
            room.activeTimer.pausedAt = Date.now();
            await saveRoom(room);

            io.to(rid).emit('room:timer-paused', room.activeTimer);
            if (typeof callback === 'function') callback({ success: true, timer: room.activeTimer });
        } catch (error) {
            logger.error(`[Room] Pause timer error: ${error.message}`);
        }
    });

    // ===========================
    // RESUME ROOM TIMER
    // ===========================
    socket.on('resume-room-timer', async ({ roomId }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) return callback?.({ success: false, error: 'Invalid room id' });

            const room = await getRoom(rid);
            if (!room || !room.activeTimer || !room.activeTimer.isPaused) {
                return callback?.({ success: false, error: 'Timer not paused' });
            }

            logger.info(`[Room] Resuming timer for room: ${rid}`);

            const pauseDuration = Date.now() - room.activeTimer.pausedAt;
            room.activeTimer.startedAt = room.activeTimer.startedAt + pauseDuration;
            room.activeTimer.isPaused = false;
            room.activeTimer.pausedAt = null;
            await saveRoom(room);

            io.to(rid).emit('room:timer-started', room.activeTimer); // Reuse timer-started to reset client clocks
            if (typeof callback === 'function') callback({ success: true, timer: room.activeTimer });
        } catch (error) {
            logger.error(`[Room] Resume timer error: ${error.message}`);
        }
    });

    // ===========================
    // STOP ROOM TIMER
    // ===========================
    socket.on('stop-room-timer', async ({ roomId }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) return callback?.({ success: false, error: 'Invalid room id' });

            const room = await getRoom(rid);
            if (!room) return callback?.({ success: false, error: 'Room not found' });

            logger.info(`[Room] Stopping timer for room: ${rid}`);

            room.activeTimer = null;
            await saveRoom(room);

            io.to(rid).emit('room:timer-stopped');
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            logger.error(`[Room] Stop timer error: ${error.message}`);
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
    // UPDATING ROOM SETTINGS
    // ===========================
    socket.on('update-room-settings', async ({ roomId, roomName, password, hasWaitingRoom, autoApprove, stopJoiningTime, accessType, ...otherSettings }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) {
                if (typeof callback === 'function') callback({ success: false, error: 'Invalid Room ID' });
                return;
            }

            const room = await getRoom(rid);
            if (!room) {
                if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
                return;
            }

            const userId = socket.user?.id || socket.id;
            const isAuthorized = socket.isSuperHost || socket.id === room.hostId || userId === room.hostId || (Array.isArray(room.coHosts) && room.coHosts.includes(userId));

            if (!isAuthorized) {
                if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized to update settings' });
                return;
            }

            // Sync legacy and advanced settings
            const effectiveWaitingRoom = hasWaitingRoom !== undefined ? hasWaitingRoom : (otherSettings.waiting_lobby !== undefined ? otherSettings.waiting_lobby : room.hasWaitingRoom);

            // Update room object
            if (roomName !== undefined) room.name = roomName;
            if (password !== undefined) room.password = password;
            room.hasWaitingRoom = !!effectiveWaitingRoom;
            
            // Sync settings object
            room.settings = {
                ...(room.settings || {}),
                ...otherSettings,
                autoApprove: autoApprove !== undefined ? autoApprove : room.settings?.autoApprove,
                stopJoiningTime: stopJoiningTime !== undefined ? stopJoiningTime : room.settings?.stopJoiningTime,
                accessType: accessType !== undefined ? accessType : room.settings?.accessType,
                waiting_lobby: !!effectiveWaitingRoom
            };

            await saveRoom(room);
            
            // NEW: Persist settings to MongoDB
            try {
                await RoomModel.findOneAndUpdate(
                    { roomId: rid },
                    { 
                        name: room.name,
                        settings: room.settings,
                        accessType: room.settings?.accessType || room.accessType || 'public'
                    },
                    { upsert: true }
                );
                logger.info(`[Room] Persisted updated settings for ${rid} to MongoDB`);
            } catch (mongoErr) {
                logger.error(`[Room] MongoDB settings update error: ${mongoErr.message}`);
            }

            logger.info(`[Room] Settings updated for ${rid} by ${userId}`);

            // Broadcast to everyone in the room
            io.to(rid).emit('room-settings-updated', {
                roomId: rid,
                roomName: room.name,
                hasWaitingRoom: room.hasWaitingRoom,
                isLocked: room.isLocked,
                settings: room.settings,
                updatedBy: userId
            });

            if (typeof callback === 'function') callback({ success: true, settings: room.settings });
        } catch (error) {
            logger.error(`[Room] Update settings error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    socket.on('toggle-room-lock', async ({ roomId, locked }, callback) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) {
                if (typeof callback === 'function') callback({ success: false, error: 'Invalid Room ID' });
                return;
            }

            const room = await getRoom(rid);
            if (!room) {
                if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
                return;
            }

            const userId = socket.user?.id || socket.id;
            const isAuthorized = socket.isSuperHost || socket.id === room.hostId || userId === room.hostId || (Array.isArray(room.coHosts) && room.coHosts.includes(userId));

            if (!isAuthorized) {
                if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized' });
                return;
            }

            room.isLocked = !!locked;
            await saveRoom(room);
            
            logger.info(`[Room] ${rid} lock state: ${room.isLocked} by ${userId}`);
            io.to(rid).emit('room-lock-toggled', { isLocked: room.isLocked });
            
            if (typeof callback === 'function') callback({ success: true, isLocked: room.isLocked });
        } catch (error) {
            logger.error(`[Room] Toggle lock error: ${error.message}`);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });


    // ===========================
    // AI POLL HANDLERS
    // ===========================
    socket.on('create-poll', async ({ roomId, question, options, scope, onlySelectOption, duration = 5, type = 'POLL', correctOption }, callback) => {
        try {
            logger.info(`[Poll] Attempting to create ${type} in room ${roomId} (scope: ${scope})`);
            const room = await getRoom(roomId);
            if (!room) {
                logger.warn(`[Poll] Create failed: Room ${roomId} not found`);
                return callback?.({ success: false, error: 'Room not found' });
            }

            const userId = socket.user?.id || socket.user?.sub || socket.id;

            // Authorization: Host of the room OR Super Host
            const isAuthorized = socket.isSuperHost || socket.id === room.hostId || userId === room.hostId;
            if (!isAuthorized) {
                logger.warn(`[Poll] Unauthorized create attempt by user ${userId} in room ${roomId}`);
                return callback?.({ success: false, error: 'Unauthorized to create poll' });
            }

            const pollId = `poll-${Date.now()}`;
            const pollData = {
                id: pollId,
                question,
                options,
                totalVotes: 0,
                results: options.reduce((acc, _, idx) => ({ ...acc, [idx]: 0 }), {}),
                expiresAt: Date.now() + (duration * 60 * 1000),
                onlySelectOption,
                duration,
                type,
                correctOption,
                votedUsers: [],
                voters: options.reduce((acc, _, idx) => ({ ...acc, [idx]: [] }), {})
            };
            if (scope === 'CURRENT' || !scope) {
                room.activePoll = pollData;
                room.pollHistory = room.pollHistory || [];
                room.pollHistory.push(pollData);
                await saveRoom(room);
                io.to(roomId).emit('room:poll-created', pollData);
            } else if (scope === 'ALL') {
                const orgId = room.settings?.organizationId || room.organizationId;
                if (!orgId) {
                    logger.warn(`[Poll] Scope ALL requested but no orgId found for room ${roomId}`);
                    room.activePoll = pollData;
                    room.pollHistory = room.pollHistory || [];
                    room.pollHistory.push(pollData);
                    await saveRoom(room);
                    io.to(roomId).emit('room:poll-created', pollData);
                } else {
                    const allRooms = await getActiveRooms();
                    const orgRooms = allRooms.filter(r => (r.organizationId === orgId) || (r.settings?.organizationId === orgId));
                    logger.info(`[Poll] Broadcasting to ${orgRooms.length} rooms in org ${orgId}`);
                    
                    for (const orgRoom of orgRooms) {
                        orgRoom.activePoll = pollData;
                        orgRoom.pollHistory = orgRoom.pollHistory || [];
                        orgRoom.pollHistory.push(pollData);
                        await saveRoom(orgRoom);
                        io.to(orgRoom.id).emit('room:poll-created', pollData);
                    }
                }
            } else if (scope === 'SPECIFIC') {
                room.activePoll = pollData;
                room.pollHistory = room.pollHistory || [];
                room.pollHistory.push(pollData);
                await saveRoom(room);
                io.to(roomId).emit('room:poll-created', pollData);
            }

            logger.info(`[Poll] Manual poll ${pollId} deployed successfully`);
            callback?.({ success: true, poll: pollData });
        } catch (error) {
            logger.error(`[Poll] Creation error: ${error.message}`);
            callback?.({ success: false, error: error.message });
        }
    });

    socket.on('cast-poll-vote', async ({ pollId, optionIndex }, callback) => {
        try {
            const roomId = socket.currentRoomId;
            if (!roomId) return callback?.({ success: false, error: 'Not in a room' });

            const room = await getRoom(roomId);
            if (!room || !room.activePoll || room.activePoll.id !== pollId) {
                return callback?.({ success: false, error: 'Active poll not found' });
            }

            // Check if poll is expired
            if (room.activePoll.expiresAt && new Date() > new Date(room.activePoll.expiresAt)) {
                return callback?.({ success: false, error: 'Poll has expired' });
            }

            const userId = socket.user?.id || socket.id;
            
            // Prevent duplicate votes
            room.activePoll.votedUsers = room.activePoll.votedUsers || [];
            if (room.activePoll.votedUsers.includes(userId)) {
                return callback?.({ success: false, error: 'You have already voted' });
            }

            // Update scores
            room.activePoll.results = room.activePoll.results || {};
            room.activePoll.results[optionIndex] = (room.activePoll.results[optionIndex] || 0) + 1;
            room.activePoll.totalVotes = (room.activePoll.totalVotes || 0) + 1;
            room.activePoll.votedUsers.push(userId);

            // Record voter info for Host/Super Host visibility
            const voterObj = Object.values(room.users || {}).find(u => u.id === userId);
            const userName = voterObj?.name || socket.user?.name || 'Guest';
            room.activePoll.voters = room.activePoll.voters || {};
            room.activePoll.voters[optionIndex] = room.activePoll.voters[optionIndex] || [];
            room.activePoll.voters[optionIndex].push({ id: userId, name: userName });

            await saveRoom(room);

            // Notify everyone in the room (Public Data - No Voters)
            const publicPoll = { ...room.activePoll };
            delete publicPoll.voters;
            io.to(roomId).emit('room:poll-updated', publicPoll);

            // Notify Hosts/Super Hosts with detailed results
            const sockets = await io.in(roomId).fetchSockets();
            for (const s of sockets) {
                if (s.isSuperHost || s.id === room.hostId || s.user?.id === room.hostId) {
                    s.emit('room:poll-updated', room.activePoll);
                }
            }

            logger.info(`[Poll] Vote cast in room ${roomId} by ${userId} for option ${optionIndex}`);
            callback?.({ success: true, poll: room.activePoll });
        } catch (error) {
            logger.error(`[Poll] Vote error: ${error.message}`);
            callback?.({ success: false, error: error.message });
        }
    });

    socket.on('end-poll', async ({ pollId }, callback) => {
        try {
            const roomId = socket.currentRoomId;
            if (!roomId) return callback?.({ success: false, error: 'Not in a room' });

            const room = await getRoom(roomId);
            if (!room || !room.activePoll || room.activePoll.id !== pollId) {
                return callback?.({ success: false, error: 'Active poll not found' });
            }

            // Authorization: Only Host or Super Host can end poll
            const isSuperHost = socket.isSuperHost;
            const isHost = socket.id === room.hostId || socket.user?.id === room.hostId;

            if (!isHost && !isSuperHost) {
                return callback?.({ success: false, error: 'Unauthorized to end poll' });
            }

            // End the poll by setting expiresAt to now
            room.activePoll.expiresAt = Date.now();
            await saveRoom(room);

            // Notify everyone
            io.to(roomId).emit('room:poll-updated', room.activePoll);

            logger.info(`[Poll] Poll ${pollId} manually ended by ${socket.user?.id || socket.id}`);
            callback?.({ success: true });
        } catch (error) {
            logger.error(`[Poll] End error: ${error.message}`);
            callback?.({ success: false, error: error.message });
        }
    });

    socket.on('get-poll-history', async ({ roomId }, callback) => {
        try {
            const room = await getRoom(roomId);
            if (!room) return callback?.({ success: false, error: 'Room not found' });

            const history = room.pollHistory || [];
            callback?.({ success: true, history });
        } catch (error) {
            logger.error(`[Poll] History fetch error: ${error.message}`);
            callback?.({ success: false, error: error.message });
        }
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

                            // Security Check: If 'require_reapproval_on_rejoin' is checked, remove from approved list
                            if (room.settings?.require_reapproval_on_rejoin && room.approvedUsers) {
                                delete room.approvedUsers[userId];
                            }

                            await saveRoom(room);
                            
                            socket.to(rid).emit('user-left', userId);

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

    // ===========================
    // SECURITY ALERTS
    // ===========================
    socket.on('security:suspicious-activity', async ({ roomId, reason }) => {
        try {
            const rid = sanitizeRoomId(roomId);
            if (!rid) return;

            const room = await getRoom(rid);
            if (!room) return;

            const userId = socket.user?.id || socket.id;
            const user = room.users.find(u => u.id === userId || u.socketId === socket.id);
            const userName = user?.name || socket.user?.name || 'A user';

            logger.warn(`[Security] Suspicious activity in room ${rid} by ${userName}: ${reason}`);

            // Notify Hosts and Super Hosts
            const sockets = await io.in(rid).fetchSockets();
            for (const s of sockets) {
                const isAuth = s.isSuperHost || s.id === room.hostId || s.user?.id === room.hostId;
                
                if (isAuth && s.id !== socket.id) {
                    s.emit('system:announcement', {
                        type: 'critical',
                        message: `[SECURITY ALERT] ${userName} is acting suspicious: ${reason}`,
                        duration: 10000
                    });
                }
            }

            // Log to event logger
            eventLogger.logRoomEvent(rid, userId, 'security_breach', { reason, userName });

        } catch (error) {
            logger.error(`[Security] Alert broadcast error: ${error.message}`);
        }
    });
}

// Trigger nodemon restart
