import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let client = null;
let isRedisConnected = false;

// In-memory fallback
const localRooms = new Map();
const localUsers = new Map();

const initRedis = async () => {
    if (process.env.USE_REDIS === 'true') {
        try {
            client = createClient({ url: redisUrl });
            client.on('error', (err) => console.error('Redis Client Error', err));
            client.on('connect', () => console.log('Connected to Redis'));
            await client.connect();
            isRedisConnected = true;
        } catch (error) {
            console.warn('Failed to connect to Redis, falling back to in-memory storage:', error.message);
            isRedisConnected = false;
        }
    } else {
        console.log('Redis disabled (USE_REDIS!=true), using in-memory storage');
    }
};

// Helper to parse/stringify
const parse = (str) => {
    try { return JSON.parse(str); } catch (e) { return null; }
};

// Room Operations
export const getRoom = async (roomId) => {
    if (isRedisConnected) {
        const data = await client.get(`room:${roomId}`);
        return parse(data);
    }
    return localRooms.get(roomId);
};

export const saveRoom = async (room) => {
    if (isRedisConnected) {
        // Expire in 24 hours if inactive? For now just save.
        await client.set(`room:${room.id}`, JSON.stringify(room));
        // Also add to a set of active rooms for listing
        if (room.isActive) {
            await client.sAdd('active_rooms', room.id);
        } else {
            await client.sRem('active_rooms', room.id);
        }
    } else {
        localRooms.set(room.id, room);
    }
};

export const deleteRoom = async (roomId) => {
    if (isRedisConnected) {
        await client.del(`room:${roomId}`);
        await client.sRem('active_rooms', roomId);
    } else {
        localRooms.delete(roomId);
    }
};

export const getActiveRooms = async () => {
    if (isRedisConnected) {
        const roomIds = await client.sMembers('active_rooms');
        const rooms = [];
        for (const id of roomIds) {
            const room = await getRoom(id);
            if (room) rooms.push(room);
        }
        return rooms;
    }
    return Array.from(localRooms.values()).filter(r => r.isActive);
};

export const hasRoom = async (roomId) => {
    if (isRedisConnected) {
        return (await client.exists(`room:${roomId}`)) > 0;
    }
    return localRooms.has(roomId);
};

// User Operations
export const getUser = async (socketId) => {
    if (isRedisConnected) {
        const data = await client.get(`user:${socketId}`);
        return parse(data);
    }
    return localUsers.get(socketId);
};

export const saveUser = async (socketId, user) => {
    if (isRedisConnected) {
        await client.set(`user:${socketId}`, JSON.stringify(user));
    } else {
        localUsers.set(socketId, user);
    }
};

export const deleteUser = async (socketId) => {
    if (isRedisConnected) {
        await client.del(`user:${socketId}`);
    } else {
        localUsers.delete(socketId);
    }
};

export const removeInactiveRooms = async (maxAgeMs = 24 * 60 * 60 * 1000) => {
    const now = Date.now();
    let removedCount = 0;

    if (isRedisConnected) {
        const roomIds = await client.sMembers('active_rooms');
        for (const id of roomIds) {
            const room = await getRoom(id);
            if (!room) {
                await client.sRem('active_rooms', id);
                continue;
            }

            // Check if room is empty and old
            const isEmpty = !room.users || Object.keys(room.users).length === 0;
            const createdAt = new Date(room.createdAt).getTime();
            const isOld = (now - createdAt) > maxAgeMs;

            if (isEmpty && isOld) {
                await deleteRoom(id);
                removedCount++;
            }
        }
    } else {
        for (const [id, room] of localRooms.entries()) {
            const isEmpty = !room.users || Object.keys(room.users).length === 0;
            const createdAt = new Date(room.createdAt).getTime();
            const isOld = (now - createdAt) > maxAgeMs;

            if (isEmpty && isOld) {
                localRooms.delete(id);
                removedCount++;
            }
        }
    }
    return removedCount;
};

export { initRedis };
