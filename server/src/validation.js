import { z } from 'zod';

export const createRoomSchema = z.object({
    roomId: z.string().min(3).max(50).regex(/^[a-zA-Z0-9-_]+$/, 'Room ID must be alphanumeric'),
    roomName: z.string().max(100).optional(),
    password: z.string().max(100).optional(),
    userId: z.string().optional(),
    orgId: z.string().optional(),
    accessType: z.enum(['public', 'password', 'invite', 'organization']).optional(),
});

export const joinRoomSchema = z.object({
    roomId: z.string(),
    password: z.string().optional(),
    inviteToken: z.string().optional(),
    user: z.object({
        id: z.string().optional(),
        name: z.string().max(50).optional(),
    }),
});

export const messageSchema = z.object({
    roomId: z.string(),
    message: z.object({
        content: z.string().min(1).max(1000),
    }),
});
