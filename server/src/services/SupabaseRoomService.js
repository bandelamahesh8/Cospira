import { supabase } from '../supabase.js';
import logger from '../logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ensure user exists in Supabase users table
 * This prevents foreign key constraint violations
 */
async function ensureUserExists(userId, userName = null) {
  if (!supabase || !userId) return false;

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return true; // User already exists
    }

    // Create user if they don't exist
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: `user_${userId}@cospira.local`, // Placeholder email
        username: userName || `User_${userId.substring(0, 8)}`,
        created_at: new Date(),
      });

    if (error) {
      // Check for specific error code: PGRST205 (relation not found / table missing)
      if (error.code === 'PGRST205') {
          // Log only once per session or debug level if possible, or simple warning
          logger.warn(`Supabase tables missing (e.g. public.users). Run setup_database.sql in Supabase.`);
      } else {
          logger.warn(`Failed to create user ${userId} in Supabase. Error: ${JSON.stringify(error)}`);
      }
      return false;
    }

    logger.info(`Created user ${userId} in Supabase`);
    return true;
  } catch (err) {
    logger.error('Error ensuring user exists:', err);
    return false;
  }
}

/**
 * Sync Room Creation to Supabase
 */
export async function syncCreateRoom(roomData, hostName = null) {
  if (!supabase) return;

  try {
    const { id, name, hostId, accessType } = roomData;
    
    // Ensure the host user exists in Supabase first
    await ensureUserExists(hostId, hostName);
    
    const { error } = await supabase
      .from('rooms')
      .insert({
        id: id,
        name: name,
        room_type: 'meeting',
        owner_id: hostId,
        is_private: accessType !== 'public',
        secure_code: roomData.secure_code || null,
        max_users: roomData.max_users || 50,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

    if (error) {
       // RETRY LOGIC: If column missing (42703), try minimal insert
       if (error.code === '42703') {
           logger.warn('Schema Mismatch: Optional columns missing in "rooms". attempting minimal insert...');
           const { error: retryError } = await supabase.from('rooms').insert({
               id: id,
               name: name,
               created_at: new Date()
           });
           if (retryError) logger.warn('Minimal Sync Error:', retryError.message);
           else logger.info(`Room ${id} synced (minimal)`);
       } else {
           logger.warn('Supabase Room Sync Error:', error.message);
       }
    } else {
       logger.info(`Room ${id} synced to Supabase`);
    }
  } catch (err) {
    logger.error('Supabase Sync Exception:', err);
  }
}

/**
 * Check if User Can Join (Permissions)
 */
export async function checkRoomAccess(roomId, userId) {
    if (!supabase) return true; // Fail open if Supabase not configured

    // Logic: Check room_members or public status
    // For now, simpliest is to check if room exists and is not deleted
    try {
        const { data: room, error } = await supabase
            .from('rooms')
            .select('is_private, owner_id')
            .eq('id', roomId)
            .single();
            
        if (error || !room) return false;

        if (!room.is_private) return true;
        
        // If private, check if user is member
        const { data: member } = await supabase
            .from('room_members')
            .select('id')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .single();
            
        return !!member || room.owner_id === userId;
    } catch (err) {
        logger.error('Supabase Access Check Error:', err);
        return true; // Fail open for resilience
    }
}

/**
 * Sync Member Join
 */
export async function syncJoinRoom(roomId, userId, userName = null, role = 'participant') {
    if (!supabase) return;
    try {
        // Ensure the user exists in Supabase first
        await ensureUserExists(userId, userName);

        const { error } = await supabase
            .from('room_presence')
            .upsert({
                room_id: roomId,
                user_id: userId,
                joined_at: new Date()
            }, { onConflict: 'room_id, user_id' });

        if (error) logger.warn('Supabase Presence Sync Error:', error.message);

        // Also update room_members (history)
        await supabase
            .from('room_members')
            .upsert({
                room_id: roomId,
                user_id: userId,
                role: role,
                joined_at: new Date(),
                left_at: null
            }, { onConflict: 'room_id, user_id' });

        if (error) logger.warn('Supabase Member Sync Error:', error.message);
    } catch (err) {
        logger.error('Supabase Member Sync Exception:', err);
    }
}

/**
 * Sync Member Leave
 */
export async function syncLeaveRoom(roomId, userId) {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('room_members')
            .update({ left_at: new Date() })
            .eq('room_id', roomId)
            .eq('user_id', userId);

        // Remove from room_presence
        await supabase
            .from('room_presence')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userId);
            
        if (error) logger.warn('Supabase Leave Sync Error:', error.message);
    } catch (err) {
        logger.error('Supabase Leave Sync Exception:', err);
    }
}

/**
 * Sync Message
 */
export async function syncMessage(roomId, userId, content, type = 'text') {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                room_id: roomId,
                sender_id: userId,
                message_type: type,
                content: content,
                created_at: new Date()
            });

        if (error) logger.warn('Supabase Message Sync Error:', error.message);
    } catch (err) {
        logger.error('Supabase Message Sync Exception:', err);
    }
}

/**
 * Sync Room Update (Settings)
 */
export async function syncUpdateRoom(roomId, updates) {
    if (!supabase) return;
    try {
        const updatePayload = {};
        if (updates.name) updatePayload.name = updates.name;
        if (updates.accessType) updatePayload.is_private = updates.accessType !== 'public';
        
        if (Object.keys(updatePayload).length === 0) return;

        const { error } = await supabase
            .from('rooms')
            .update(updatePayload)
            .eq('id', roomId);

        if (error) logger.warn('Supabase Room Update Error:', error.message);
        else logger.info(`Room ${roomId} updated in Supabase`);
    } catch (err) {
        logger.error('Supabase Update Exception:', err);
    }
}

/**
 * Sync Room Deletion (Disband)
 */
export async function syncDeleteRoom(roomId) {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('rooms')
            .delete()
            .eq('id', roomId);

        if (error) logger.warn('Supabase Room Delete Error:', error.message);
        else logger.info(`Room ${roomId} deleted from Supabase`);
    } catch (err) {
        logger.error('Supabase Delete Exception:', err);
    }
}

/**
 * Sync Session (Time Spent)
 */
export async function syncSession(roomId, userId, durationSeconds, mode = 'standard') {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('room_sessions')
            .insert({
                room_id: roomId,
                user_id: userId,
                duration_seconds: durationSeconds,
                room_mode: mode,
                created_at: new Date()
            });

        if (error) {
             logger.warn('Supabase Session Sync Error:', error.message);
        } else {
             logger.info(`Session synced for user ${userId} in room ${roomId} (${durationSeconds}s)`);
        }
    } catch (err) {
        logger.error('Supabase Session Sync Exception:', err);
    }
}

let globalStatsSyncEnabled = true;

/**
 * Sync Global Stats
 */
export async function syncGlobalStats(stats) {
    if (!supabase || !globalStatsSyncEnabled) return;
    try {
        const { error } = await supabase
            .from('global_stats')
            .upsert({
                id: 1,
                active_users: stats.users,
                active_rooms: stats.rooms,
                avg_ping: stats.avg_ping || 0,
                updated_at: new Date()
            });

        if (error) {
            logger.warn('Supabase Global Stats Sync Error:', { message: error.message, code: error.code, details: error.details });
            // If table doesn't exist or network is failing, disable subsequent syncs to avoid spam
            if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('fetch failed')) {
                logger.warn('Disabling Supabase Global Stats sync due to persistent issues (Table missing or Network error).');
                globalStatsSyncEnabled = false;
            }
        }
    } catch (err) {
        logger.error('Supabase Global Stats Sync Exception:', err);
    }
}

/**
 * Get User History
 * Retrieves joined rooms from Supabase for AI Analytics
 */
export async function getUserHistory(userId) {
    if (!supabase) return [];
    try {
        // 1. Fetch room members (history)
        const { data: members, error: memberError } = await supabase
            .from('room_members')
            .select('room_id, role, joined_at')
            .eq('user_id', userId)
            .order('joined_at', { ascending: false })
            .limit(20);

        if (memberError) {
            // Check if table is missing (common in local dev)
            const isTableMissing = memberError.code === 'PGRST205' || memberError.code === '42P01';
            
            if (isTableMissing) {
                logger.warn('Supabase Get History: Tables missing (room_members). Skipping history fetch.');
            } else {
                logger.error(`Supabase Get History (Members) Error: ${JSON.stringify(memberError)}`);
            }
            return [];
        }

        if (!members || members.length === 0) return [];

        // 2. Fetch details for those rooms explicitly (Manual Join)
        // This avoids "Could not find relationship" errors if FKs are missing/cached poorly
        const roomIds = [...new Set(members.map(m => m.room_id))];
        
        const { data: rooms, error: roomError } = await supabase
            .from('rooms')
            .select('id, name') // Removing is_private as it is unstable in user schema
            .in('id', roomIds);

        if (roomError) {
             logger.warn('Supabase Get History (Rooms) Error:', roomError.message);
             // Proceed with partial data if possible
        }

        const roomMap = new Map((rooms || []).map(r => [r.id, r]));

        // 3. Merge Data
        return members.map(item => {
            const room = roomMap.get(item.room_id);
            return {
                id: item.room_id,
                name: room?.name || 'Unknown Sector',
                role: item.role,
                joinedAt: item.joined_at,
                // Assume active if in history list for now
                isActive: true, 
                participantCount: 1 
            };
        });
            
    } catch (err) {
        logger.error('Supabase Get History Exception:', err);
        return [];
    }
}
