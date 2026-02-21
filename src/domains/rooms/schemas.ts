import { z } from 'zod';

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  photoUrl: z.string().nullable().optional(),
  isHost: z.boolean().default(false),
  isGuest: z.boolean().default(false),
  gender: z.string().optional(),
  isCoHost: z.boolean().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Room Schema
export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  users: z.array(UserSchema),
  isLocked: z.boolean().default(false),
  hasWaitingRoom: z.boolean().default(false),
  password: z.string().optional(),
  accessType: z.enum(['public', 'password', 'invite', 'organization']).default('public'),
});

export type Room = z.infer<typeof RoomSchema>;

// API Schemas
export const JoinRoomRequestSchema = z.object({
  roomId: z.string(),
  password: z.string().optional(),
  inviteToken: z.string().optional(),
  user: UserSchema.omit({ isHost: true, isCoHost: true }).extend({
    // Override strict UUID check for user if needed, or keep it strict
    id: z.string(), // Allow non-uuid for guest IDs if they are generated differently? Usually guests are UUIDs too.
  }),
});

export const CreateRoomRequestSchema = z.object({
  roomId: z.string(),
  roomName: z.string(),
  password: z.string().optional(),
  accessType: z.enum(['public', 'password', 'invite', 'organization']),
  user: UserSchema.pick({ id: true, name: true, isGuest: true }),
  orgId: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  roomMode: z.string().optional(),
});

export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>;
export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;
