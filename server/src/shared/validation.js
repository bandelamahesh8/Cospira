import { z } from 'zod';

export const createRoomSchema = z.object({
    roomId: z.string().min(3).max(50).regex(/^[a-zA-Z0-9-_]+$/, 'Room ID must be alphanumeric'),
    roomName: z.string().max(100).optional(),
    password: z.string().max(100).optional(),
    userId: z.string().optional(),
    orgId: z.string().optional(),
    accessType: z.enum(['public', 'password', 'invite', 'organization']).optional(),
    roomMode: z.string().optional(),
    roomType: z.string().optional(),
    room_type: z.string().optional(),
    securityLevel: z.string().optional(),
    security_level: z.string().optional(),
    user: z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        isGuest: z.boolean().optional(),
    }).optional(),
    settings: z.object({
        micAllowed: z.boolean().optional(),
        cameraAllowed: z.boolean().optional(),
        fileUpload: z.boolean().optional(),
        chat: z.boolean().optional(),
        externalLinks: z.boolean().optional(),
        drmSafe: z.boolean().optional(),
        ghostProtocol: z.boolean().optional(),
        complianceMode: z.boolean().optional(),
        mode: z.string().optional(),
        securityLevel: z.string().optional(),
        security_level: z.string().optional(),
        roomType: z.string().optional(),
        room_type: z.string().optional(),
        interests: z.array(z.string()).optional(),
        commType: z.string().optional(),
        invite_only: z.boolean().optional(),
        join_by_link: z.boolean().optional(),
        join_by_code: z.boolean().optional(),
        host_only_code_visibility: z.boolean().optional(),
        waiting_lobby: z.boolean().optional(),
        organization_only: z.boolean().optional(),
        host_controlled_speaking: z.boolean().optional(),
        chat_permission: z.enum(['everyone', 'host_only', 'none']).optional(),
        encryption_enabled: z.boolean().optional(),
        ai_moderation_level: z.enum(['off', 'passive', 'active']).optional(),
        auto_close_minutes: z.number().int().min(0).optional(),
        hidden_room: z.boolean().optional(),
    }).passthrough().optional(),
}).passthrough();

export const joinRoomSchema = z.object({
    roomId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9-_]+$/, 'Invalid room id'),
    password: z.string().max(200).optional(),
    inviteToken: z.string().max(200).optional(),
    user: z.object({
        id: z.string().max(128).optional(),
        name: z.string().max(50).optional(),
    }).optional(),
});

export const messageSchema = z.object({
    roomId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9-_]+$/, 'Invalid room id'),
    message: z.object({
        content: z.string().min(1).max(1000),
    }),
});

export const gameStateSchema = z.object({
    isActive: z.boolean(),
    type: z.enum(['snakeladder', 'chess', 'xoxo']).nullable(),
    players: z.array(z.object({
        id: z.string(),
        name: z.string(),
        color: z.string().optional(),
        role: z.string().optional(),
        pos: z.number().optional(),
    })),
    turn: z.string().nullable(),
    dice: z.number().nullable().optional(),
    phase: z.enum(['ROLL', 'MOVE', 'END']).optional(),
    winner: z.string().nullable().optional(),
    board: z.any().optional(),
    turnStartTime: z.number().optional(),
    lastAction: z.object({
        type: z.string(),
        playerId: z.string(),
        data: z.any().optional()
    }).optional().nullable(),
});

export const roomSchema = z.object({
    id: z.string(),
    name: z.string(),
    hostId: z.string(),
    coHosts: z.array(z.string()),
    users: z.record(z.any()), // Map of socketId -> user
    messages: z.array(z.any()),
    files: z.array(z.any()),
    createdAt: z.date(),
    isActive: z.boolean(),
    isLocked: z.boolean(),
    hasWaitingRoom: z.boolean(),
    waitingUsers: z.record(z.any()).optional(),
    gameState: gameStateSchema.optional().nullable(),
});
