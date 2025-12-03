import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import multer from 'multer';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import client from 'prom-client'; // Prometheus client
import logger from './logger.js'; // Winston logger
import { createRoomSchema, joinRoomSchema, messageSchema } from './validation.js';
import { initRedis, getRoom, saveRoom, deleteRoom, getActiveRooms, hasRoom, getUser, saveUser, deleteUser, removeInactiveRooms } from './redis.js';
import SFUHandler from './sfu/SFUHandler.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient as createRedisClient } from 'redis';
import crypto from 'crypto';
import { cleanupUploads } from './cleanup.js';

dotenv.config();

// Required Environment Variables Check
const requiredEnvVars = [
  'JWT_SECRET',
  'TURN_SECRET',
  'SESSION_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

if (process.env.NODE_ENV === 'production') {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('FATAL: Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3001;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Prometheus Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const activeConnectionsGauge = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active socket connections',
});
register.registerMetric(activeConnectionsGauge);

const activeRoomsGauge = new client.Gauge({
  name: 'active_rooms',
  help: 'Number of active rooms',
});
register.registerMetric(activeRoomsGauge);

// Enable CORS for all routes
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:8080'];
    if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));



// Security Headers
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);
app.use('/upload', limiter);

app.use(express.json());

// Session configuration (6 hours)
const SESSION_LIFETIME = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: SESSION_LIFETIME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Cleanup configuration
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const MAX_FILE_AGE = 12 * 60 * 60 * 1000; // 12 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Run cleanup on startup
cleanupUploads(UPLOAD_DIR, MAX_FILE_AGE);

// Schedule periodic cleanup
setInterval(() => {
  cleanupUploads(UPLOAD_DIR, MAX_FILE_AGE);
}, CLEANUP_INTERVAL);

// Schedule periodic room cleanup (every 1 hour)
setInterval(async () => {
  try {
    const removed = await removeInactiveRooms();
    if (removed > 0) {
      logger.info(`Cleaned up ${removed} inactive rooms`);
    }
  } catch (err) {
    logger.error('Error cleaning up inactive rooms:', err);
  }
}, 60 * 60 * 1000);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:8080'];
      if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:'))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// Initialize Redis
initRedis();

// Configure Redis Adapter for Socket.io (for multi-instance scaling)
if (process.env.USE_REDIS === 'true') {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const pubClient = createRedisClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.io Redis Adapter configured for scaling');
    })
    .catch((err) => {
      logger.error('Failed to configure Redis Adapter:', err);
      logger.warn('Running without Redis Adapter - single instance mode only');
    });
}

// Initialize SFU Handler
const sfuHandler = new SFUHandler(io);
sfuHandler.init().then(() => {
  logger.info('SFU Handler initialized');
}).catch(err => {
  logger.error('Failed to initialize SFU Handler', err);
});

// Helper function to get room by ID (async now)
async function getRoomById(roomId) {
  return await getRoom(roomId);
}

// REST Endpoints

// Get room info (check if exists and requires password)
// Get room info (check if exists and requires password)
app.get('/api/room-info/:code', async (req, res) => {
  const room = await getRoom(req.params.code);
  if (!room || !room.isActive) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    exists: true,
    requiresPassword: !!room.passwordHash,
    accessType: room.accessType || (room.passwordHash ? 'password' : 'public'),
    name: room.name || room.id
  });
});

// Get ICE Servers
app.get('/api/ice-servers', (req, res) => {
  // In production, you might fetch these from Twilio or another provider
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];
  res.json({ iceServers });
});

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
  const token = req.headers['x-metrics-token'];
  if (process.env.METRICS_TOKEN && token !== process.env.METRICS_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `${process.env.SERVER_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      file: {
        id: uuidv4(),
        name: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        type: req.file.mimetype,
        timestamp: new Date(),
      }
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Create Room Endpoint
app.post('/api/create-room', async (req, res) => {
  try {
    const validatedData = createRoomSchema.parse(req.body);
    const { roomId, roomName, password, userId, accessType = 'public', orgId } = validatedData;

    if (accessType === 'organization') {
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required for organization rooms' });
      }
      // Verify user is member of org
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .single();

      if (membershipError || !membership) {
        return res.status(403).json({ error: 'User is not a member of this organization' });
      }
    }

    const existingRoom = await getRoom(roomId);
    if (existingRoom && existingRoom.isActive) {
      return res.status(409).json({ error: 'Room already exists' });
    }

    let inviteToken = null;
    if (accessType === 'invite') {
      inviteToken = uuidv4();
    }

    const newRoom = {
      id: roomId,
      name: roomName || roomId,
      hostId: userId,
      coHosts: [],
      passwordHash: password || null,
      accessType,
      orgId: orgId || null,
      inviteToken,
      users: {}, // Redis stores as JSON, so use Object instead of Map
      messages: [],
      files: [],
      createdAt: new Date(),
      isActive: true,
      isLocked: false,
      hasWaitingRoom: false,
      waitingUsers: {}, // Object for Redis
      youtubeVideoId: null,
      youtubeStatus: 'closed',
      youtubeCurrentTime: 0,
      youtubeLastActionTime: null,
      youtubePresenterName: null,
    };

    await saveRoom(newRoom);
    io.emit('room-created', {
      id: roomId,
      name: roomName || roomId,
      requiresPassword: !!password,
      accessType
    });

    res.json({ success: true, roomId });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Room Info (Alias/Update)
app.get('/api/room/:id', async (req, res) => {
  const room = await getRoom(req.params.id);
  if (!room || !room.isActive) {
    return res.status(404).json({ error: 'Room not found' });
  }
  // Users is an object in Redis JSON, need to count keys
  const userCount = room.users ? Object.keys(room.users).length : 0;
  res.json({
    id: room.id,
    name: room.name,
    requiresPassword: !!room.passwordHash,
    userCount: userCount,
    createdAt: room.createdAt
  });
});

// Socket.IO Middleware for JWT Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error'));
      }
      socket.user = decoded; // Attach user info to socket
      next();
    });
  } else {
    if (process.env.NODE_ENV === 'production') {
      return next(new Error('Authentication required'));
    }
    // In development, allow anonymous but log warning
    logger.warn(`Anonymous connection allowed in dev mode: ${socket.id}`);
    next();
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  activeConnectionsGauge.inc();

  // Setup SFU events
  sfuHandler.setupSocketEvents(socket);

  // Get recent rooms
  socket.on('get-recent-rooms', async () => {
    const activeRooms = await getActiveRooms();
    const recent = activeRooms
      .map(r => ({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
        userCount: r.users ? Object.keys(r.users).length : 0,
        requiresPassword: !!r.passwordHash
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    socket.emit('recent-rooms', recent);
  });

  // Create room
  socket.on('create-room', async (payload) => {
    try {
      // Basic validation via REST usually, but good to check here too
      const { roomId, password, roomName, user, accessType = 'public', orgId } = payload;

      if (accessType === 'organization') {
        if (!orgId) {
          socket.emit('error', 'Organization ID is required');
          return;
        }
        // Verify user is member of org
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgId)
          .eq('user_id', user.id)
          .single();

        if (membershipError || !membership) {
          socket.emit('error', 'User is not a member of this organization');
          return;
        }
      }

      const existingRoom = await getRoom(roomId);
      if (existingRoom && existingRoom.isActive) {
        // Room exists
      }

      let inviteToken = null;
      if (accessType === 'invite') {
        inviteToken = uuidv4();
      }

      const newRoom = {
        id: roomId,
        name: roomName || roomId,
        hostId: user.id,
        coHosts: [],
        passwordHash: password || null,
        accessType,
        orgId: orgId || null,
        inviteToken,
        users: {}, // Object for Redis
        messages: [],
        files: [],
        createdAt: new Date(),
        isActive: true,
        isLocked: false,
        hasWaitingRoom: false,
        waitingUsers: {},
        youtubeVideoId: null,
        youtubeStatus: 'closed',
        youtubeCurrentTime: 0,
        youtubeLastActionTime: null,
        youtubePresenterName: null,
      };

      await saveRoom(newRoom);
      io.emit('room-created', {
        id: roomId,
        name: roomName || roomId,
        requiresPassword: !!password,
        accessType
      });

      socket.emit('create-success', { roomId });
    } catch (error) {
      logger.error('Socket create-room error:', error);
      socket.emit('error', 'Invalid room data');
    }
  });

  // Join room handler
  socket.on('join-room', async (payload, callback) => {
    try {
      const validatedData = joinRoomSchema.parse(payload);
      const { roomId, password, inviteToken, user } = validatedData;

      const room = await getRoom(roomId);

      if (!room || !room.isActive) {
        return callback({ success: false, error: 'Room not found or inactive' });
      }

      // Check if room is locked
      if (room.isLocked) {
        return callback({ success: false, error: 'Room is locked' });
      }

      // Check access type
      if (room.accessType === 'password') {
        if (room.passwordHash && room.passwordHash !== password) {
          return callback({ success: false, error: 'Incorrect password' });
        }
      } else if (room.accessType === 'invite') {
        if (room.inviteToken && room.inviteToken !== inviteToken) {
          // Allow host to rejoin without token if they are the host (checked later, but hard to check here without auth)
          // For now, strict check. Host should have the link too.
          return callback({ success: false, error: 'Invalid invite link' });
        }
      } else if (room.accessType === 'organization') {
        if (!room.orgId) {
          return callback({ success: false, error: 'Invalid room configuration' });
        }
        // Verify user is member of org
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', room.orgId)
          .eq('user_id', user.id)
          .single();

        if (membershipError || !membership) {
          return callback({ success: false, error: 'User is not a member of the organization' });
        }
      }

      // Check if room has waiting room enabled and user is not host/co-host
      // Note: Co-hosts are usually defined *in* the room, so initially only host is known by ID.
      // But if re-joining, might be co-host.
      const isHost = room.hostId === user.id;
      // We can't easily check co-host status before they join if it's based on socket ID, 
      // but if based on user ID we can.
      const isCoHost = room.coHosts && room.coHosts.includes(user.id);

      if (room.hasWaitingRoom && !isHost && !isCoHost) {
        // Add to waiting users
        const waitingUser = {
          id: user.id || socket.id,
          name: user.name || `User-${socket.id.substring(0, 6)}`,
          socketId: socket.id,
          joinedAt: new Date(),
        };

        if (!room.waitingUsers) room.waitingUsers = {};
        room.waitingUsers[socket.id] = waitingUser;
        await saveRoom(room);

        // Notify host(s)
        const hostSocketId = Object.keys(room.users).find(sid => room.users[sid].id === room.hostId);
        if (hostSocketId) {
          io.to(hostSocketId).emit('waiting-user-joined', waitingUser);
        }
        // Notify co-hosts
        // (Iterate users to find co-hosts)
        Object.entries(room.users).forEach(([sid, u]) => {
          if (room.coHosts.includes(u.id)) {
            io.to(sid).emit('waiting-user-joined', waitingUser);
          }
        });

        return callback({ success: false, error: 'waiting' });
      }

      // Add user to room
      const userWithId = {
        id: user.id || socket.id,
        name: user.name || `User-${socket.id.substring(0, 6)}`,
        socketId: socket.id,
        joinedAt: new Date(),
      };

      // Store user in room (using object for Redis compatibility)
      if (!room.users) room.users = {};
      room.users[socket.id] = userWithId;
      await saveRoom(room);

      // Store user in global users map
      await saveUser(socket.id, {
        ...userWithId,
        currentRoom: roomId,
      });

      // Join the room
      socket.join(roomId);

      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        ...userWithId,
        isHost: userWithId.id === room.hostId || socket.id === room.hostId,
        isCoHost: room.coHosts.includes(userWithId.id) || room.coHosts.includes(socket.id)
      });

      // Send room data to the user
      const usersList = Object.values(room.users);
      const usersWithHostFlag = usersList.map(u => ({
        ...u,
        isHost: u.id === room.hostId || u.socketId === room.hostId,
        isCoHost: room.coHosts.includes(u.id) || room.coHosts.includes(u.socketId)
      }));

      // Get waiting users list if host/co-host
      let waitingUsersList = [];
      if (isHost || isCoHost) {
        waitingUsersList = room.waitingUsers ? Object.values(room.waitingUsers) : [];
      }

      callback({
        success: true,
        room: {
          id: room.id,
          name: room.name || room.id,
          users: usersWithHostFlag,
          messages: room.messages.slice(-100),
          files: room.files.slice(-50),
          hasPassword: !!room.passwordHash,
          createdAt: room.createdAt,
          isHost: room.hostId === user.id,
          isLocked: room.isLocked,
          hasWaitingRoom: room.hasWaitingRoom,
          waitingUsers: waitingUsersList,
          youtubeVideoId: room.youtubeVideoId,
          youtubeStatus: room.youtubeStatus,
          youtubeCurrentTime: room.youtubeCurrentTime,
          youtubeLastActionTime: room.youtubeLastActionTime,
          youtubePresenterName: room.youtubePresenterName,
        },
      });

      logger.info(`User ${userWithId.name} joined room ${roomId}`);
    } catch (error) {
      if (error.name === 'ZodError') {
        return callback({ success: false, error: 'Invalid join data' });
      }
      logger.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  // Admit User (Host/Co-Host only)
  socket.on('admit-user', async ({ roomId, userId }) => {
    const room = await getRoom(roomId);
    const requester = await getUser(socket.id);

    if (!room || !requester) return;

    const isHostOrCoHost = room.hostId === requester.id || room.coHosts.includes(requester.id);
    if (!isHostOrCoHost) {
      socket.emit('error', 'Only host or co-hosts can admit users');
      return;
    }

    // Find user in waiting list
    let targetSocketId = null;
    let waitingUser = null;
    if (room.waitingUsers) {
      for (const [sid, u] of Object.entries(room.waitingUsers)) {
        if (u.id === userId) {
          targetSocketId = sid;
          waitingUser = u;
          break;
        }
      }
    }

    if (targetSocketId && waitingUser) {
      // Remove from waiting
      delete room.waitingUsers[targetSocketId];

      // Add to active users
      if (!room.users) room.users = {};
      room.users[targetSocketId] = waitingUser;

      await saveRoom(room);

      // Update global user map
      await saveUser(targetSocketId, {
        ...waitingUser,
        currentRoom: roomId,
      });

      // Make socket join room
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.join(roomId);

        // Send room data to admitted user
        const usersList = Object.values(room.users);
        const usersWithHostFlag = usersList.map(u => ({
          ...u,
          isHost: u.id === room.hostId || u.socketId === room.hostId,
          isCoHost: room.coHosts.includes(u.id) || room.coHosts.includes(u.socketId)
        }));

        targetSocket.emit('room-joined', {
          roomId: room.id,
          name: room.name || room.id,
          users: usersWithHostFlag,
          messages: room.messages.slice(-100),
          files: room.files.slice(-50),
          isHost: false, // Newly admitted user is never host initially
          hasWaitingRoom: room.hasWaitingRoom
        });
      }

      // Notify others
      socket.to(roomId).emit('user-joined', {
        ...waitingUser,
        isHost: false,
        isCoHost: false
      });

      // Notify host(s) that waiting list changed (optional, or they just see user join)
      // We can emit a specific event to remove from waiting list UI
      socket.emit('waiting-user-removed', userId);
      // Also notify other co-hosts
      Object.entries(room.users).forEach(([sid, u]) => {
        if (room.coHosts.includes(u.id) && sid !== socket.id) {
          io.to(sid).emit('waiting-user-removed', userId);
        }
        if (room.hostId === u.id && sid !== socket.id) {
          io.to(sid).emit('waiting-user-removed', userId);
        }
      });

      logger.info(`User ${userId} admitted to room ${roomId}`);
    }
  });

  // Deny User (Host/Co-Host only)
  socket.on('deny-user', async ({ roomId, userId }) => {
    const room = await getRoom(roomId);
    const requester = await getUser(socket.id);

    if (!room || !requester) return;

    const isHostOrCoHost = room.hostId === requester.id || room.coHosts.includes(requester.id);
    if (!isHostOrCoHost) return;

    // Find user in waiting list
    let targetSocketId = null;
    if (room.waitingUsers) {
      for (const [sid, u] of Object.entries(room.waitingUsers)) {
        if (u.id === userId) {
          targetSocketId = sid;
          break;
        }
      }
    }

    if (targetSocketId) {
      // Remove from waiting
      delete room.waitingUsers[targetSocketId];
      await saveRoom(room);

      // Notify user
      io.to(targetSocketId).emit('join-denied');

      // Notify hosts/co-hosts to update UI
      socket.emit('waiting-user-removed', userId);
      Object.entries(room.users).forEach(([sid, u]) => {
        if (room.coHosts.includes(u.id) && sid !== socket.id) {
          io.to(sid).emit('waiting-user-removed', userId);
        }
        if (room.hostId === u.id && sid !== socket.id) {
          io.to(sid).emit('waiting-user-removed', userId);
        }
      });

      logger.info(`User ${userId} denied from room ${roomId}`);
    }
  });

  // Handle new messages
  socket.on('send-message', async (payload, callback) => {
    try {
      const validatedData = messageSchema.parse(payload);
      const { roomId, message } = validatedData;

      const room = await getRoom(roomId);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const user = await getUser(socket.id);
      if (!user) return callback({ success: false, error: 'User not found' });

      const messageData = {
        id: uuidv4(),
        userId: user.id,
        userName: user.name,
        content: message.content,
        timestamp: new Date(),
      };

      room.messages.push(messageData);
      await saveRoom(room);

      io.to(roomId).emit('new-message', messageData);
      callback({ success: true });
    } catch (error) {
      if (error.name === 'ZodError') {
        return callback({ success: false, error: 'Invalid message data' });
      }
      logger.error('Error sending message:', error);
      callback({ success: false, error: 'Failed to send message' });
    }
  });

  // Handle file upload notification (after REST upload)
  socket.on('upload-file', async ({ roomId, file }) => {
    const room = await getRoom(roomId);
    if (!room) {
      logger.warn(`File upload attempted for non-existent room: ${roomId}`);
      return;
    }

    if (!file) {
      logger.warn(`File upload attempted without file data in room: ${roomId}`);
      return;
    }

    const user = await getUser(socket.id);
    if (user) {
      file.userName = user.name;
    }

    room.files.push(file);
    await saveRoom(room);
    io.to(roomId).emit('new-file', file);
  });

  // Disband room (Host only)
  socket.on('disband-room', async ({ roomId }) => {
    const room = await getRoom(roomId);
    const user = await getUser(socket.id);

    if (room && user && room.hostId === user.id) {
      room.isActive = false;
      await saveRoom(room);

      io.to(roomId).emit('room-disbanded');
      io.emit('room-removed', { roomId }); // Notify dashboard

      // Cleanup
      io.in(roomId).socketsLeave(roomId);

      // Clean up SFU resources
      sfuHandler.cleanUpRoom(roomId);

      // Remove from Redis immediately
      await deleteRoom(roomId);

      logger.info(`Room ${roomId} disbanded by host`);
    }
  });

  // Promote user to co-host (Host or Co-Host only)
  socket.on('promote-to-cohost', async ({ userId }) => {
    const user = await getUser(socket.id);
    if (!user || !user.currentRoom) return;

    const room = await getRoom(user.currentRoom);
    if (!room) return;

    // Check if the requester is host or co-host
    const isHostOrCoHost = room.hostId === user.id || room.coHosts.includes(user.id);
    if (!isHostOrCoHost) {
      socket.emit('error', 'Only host or co-hosts can promote users');
      return;
    }

    // Add to co-hosts if not already
    if (!room.coHosts.includes(userId)) {
      room.coHosts.push(userId);
      await saveRoom(room);
      // Notify all users in the room
      io.to(user.currentRoom).emit('user-promoted', userId);
      logger.info(`User ${userId} promoted to co-host in room ${user.currentRoom}`);
    }
  });

  // Demote user from co-host (Host or Co-Host only)
  socket.on('demote-from-cohost', async ({ userId }) => {
    const user = await getUser(socket.id);
    if (!user || !user.currentRoom) return;

    const room = await getRoom(user.currentRoom);
    if (!room) return;

    // Check if the requester is host or co-host
    const isHostOrCoHost = room.hostId === user.id || room.coHosts.includes(user.id);
    if (!isHostOrCoHost) {
      socket.emit('error', 'Only host or co-hosts can demote users');
      return;
    }

    // Remove from co-hosts
    const index = room.coHosts.indexOf(userId);
    if (index > -1) {
      room.coHosts.splice(index, 1);
      await saveRoom(room);
      // Notify all users in the room
      io.to(user.currentRoom).emit('user-demoted', userId);
      logger.info(`User ${userId} demoted from co-host in room ${user.currentRoom}`);
    }
  });

  // Handle user disconnection
  socket.on('disconnect', async () => {
    logger.info(`User disconnected: ${socket.id}`);
    activeConnectionsGauge.dec();

    const user = await getUser(socket.id);
    if (user && user.currentRoom) {
      const room = await getRoom(user.currentRoom);
      if (room) {
        if (room.users && room.users[socket.id]) {
          delete room.users[socket.id];
          await saveRoom(room);
        }

        socket.to(user.currentRoom).emit('user-left', user.id);

        // Remove peer from SFU
        sfuHandler.removePeer(user.currentRoom, socket.id);

        // If room empty and not active (or just empty?), maybe cleanup?
        if (room.users && Object.keys(room.users).length === 0) {
          if (!room.isActive) {
            await deleteRoom(user.currentRoom);
          }
          // SFU cleanup is handled inside sfuHandler.removePeer when room is empty
        }
      }
    }
    await deleteUser(socket.id);
  });

  // Handle leaving a room explicitly
  socket.on('leave-room', async ({ roomId }) => {
    const user = await getUser(socket.id);
    if (user) {
      const room = await getRoom(roomId);
      if (room) {
        if (room.users && room.users[socket.id]) {
          delete room.users[socket.id];
          await saveRoom(room);
        }
        socket.to(roomId).emit('user-left', user.id);
        // Remove peer from SFU
        sfuHandler.removePeer(roomId, socket.id);
      }
      user.currentRoom = null;
      await saveUser(socket.id, user);
      socket.leave(roomId);
      logger.info(`User ${user.id} left room ${roomId}`);
    }
  });

  // Update room settings (Host only)
  socket.on('update-room-settings', async ({ roomId, roomName, password, hasWaitingRoom, accessType }) => {
    const room = await getRoom(roomId);
    const user = await getUser(socket.id);

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

    // Update access type if provided
    if (accessType) {
      room.accessType = accessType;

      // Generate invite token if needed and not present
      if (accessType === 'invite' && !room.inviteToken) {
        room.inviteToken = uuidv4();
      }
    }

    // Update password if provided (empty string removes password)
    if (password !== undefined) {
      room.passwordHash = password.trim() || null;
    }

    // Update waiting room setting
    if (hasWaitingRoom !== undefined) {
      room.hasWaitingRoom = hasWaitingRoom;
    }

    await saveRoom(room);

    // Notify all users in the room
    io.to(roomId).emit('room-settings-updated', {
      roomId,
      roomName: room.name,
      hasPassword: !!room.passwordHash,
      hasWaitingRoom: room.hasWaitingRoom,
      accessType: room.accessType,
      inviteToken: room.accessType === 'invite' ? room.inviteToken : null
    });

    // Update dashboard
    io.emit('room-updated', {
      id: roomId,
      name: room.name,
      requiresPassword: !!room.passwordHash,
      accessType: room.accessType
    });

    socket.emit('room-settings-update-success');
    logger.info(`Room ${roomId} settings updated by host ${socket.id}`);
  });

  // File presentation handlers
  socket.on('present-file', ({ roomId, fileData, presenterName }) => {
    // Broadcast to all other participants in the room
    socket.to(roomId).emit('file-presented', { fileData, presenterName });
    logger.info(`File presented in room ${roomId} by ${presenterName}`);
  });

  socket.on('close-presentation', ({ roomId }) => {
    // Broadcast to all other participants in the room
    socket.to(roomId).emit('presentation-closed');
    logger.info(`Presentation closed in room ${roomId}`);
  });

  // YouTube Sync Handlers
  socket.on('start-youtube', async ({ roomId, videoId, presenterName }) => {
    const room = await getRoom(roomId);
    if (room) {
      room.youtubeVideoId = videoId;
      room.youtubeStatus = 'playing';
      room.youtubeCurrentTime = 0;
      room.youtubeLastActionTime = Date.now();
      room.youtubePresenterName = presenterName;
      await saveRoom(room);
      socket.to(roomId).emit('youtube-started', { videoId, presenterName });
      logger.info(`YouTube video ${videoId} started in room ${roomId} by ${presenterName}`);
    }
  });

  socket.on('play-youtube', async ({ roomId, time }) => {
    const room = await getRoom(roomId);
    if (room) {
      room.youtubeStatus = 'playing';
      room.youtubeCurrentTime = time;
      room.youtubeLastActionTime = Date.now();
      await saveRoom(room);
      socket.to(roomId).emit('youtube-played', { time });
    }
  });

  socket.on('pause-youtube', async ({ roomId, time }) => {
    const room = await getRoom(roomId);
    if (room) {
      room.youtubeStatus = 'paused';
      room.youtubeCurrentTime = time;
      room.youtubeLastActionTime = Date.now();
      await saveRoom(room);
      socket.to(roomId).emit('youtube-paused', { time });
    }
  });

  socket.on('seek-youtube', async ({ roomId, time }) => {
    const room = await getRoom(roomId);
    if (room) {
      room.youtubeCurrentTime = time;
      room.youtubeLastActionTime = Date.now();
      await saveRoom(room);
      socket.to(roomId).emit('youtube-seeked', { time });
    }
  });

  socket.on('close-youtube', async ({ roomId }) => {
    const room = await getRoom(roomId);
    if (room) {
      room.youtubeVideoId = null;
      room.youtubeStatus = 'closed';
      room.youtubeCurrentTime = 0;
      room.youtubeLastActionTime = null;
      room.youtubePresenterName = null;
      await saveRoom(room);
      socket.to(roomId).emit('youtube-closed');
      logger.info(`YouTube closed in room ${roomId}`);
    }
  });

  // Kick User (Host/Co-Host only)
  socket.on('kick-user', async ({ roomId, userId }) => {
    const room = await getRoom(roomId);
    const requester = await getUser(socket.id);

    if (!room || !requester) return;

    const isHostOrCoHost = room.hostId === requester.id || room.coHosts.includes(requester.id);
    if (!isHostOrCoHost) {
      socket.emit('error', 'Only host or co-hosts can kick users');
      return;
    }

    // Find the socket ID of the user to kick
    let targetSocketId = null;
    if (room.users) {
      for (const [sid, u] of Object.entries(room.users)) {
        if (u.id === userId) {
          targetSocketId = sid;
          break;
        }
      }
    }

    if (targetSocketId) {
      // Notify the kicked user
      io.to(targetSocketId).emit('kicked');
      // Make them leave
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(roomId);
      }

      // Remove from data structures
      if (room.users) delete room.users[targetSocketId];
      await saveRoom(room);

      // Notify others
      io.to(roomId).emit('user-left', userId);
      logger.info(`User ${userId} kicked from room ${roomId}`);
    }
  });

  // Mute User (Host/Co-Host only)
  socket.on('mute-user', async ({ roomId, userId }) => {
    const room = await getRoom(roomId);
    const requester = await getUser(socket.id);

    if (!room || !requester) return;

    const isHostOrCoHost = room.hostId === requester.id || room.coHosts.includes(requester.id);
    if (!isHostOrCoHost) return;

    // Find target socket
    let targetSocketId = null;
    if (room.users) {
      for (const [sid, u] of Object.entries(room.users)) {
        if (u.id === userId) {
          targetSocketId = sid;
          break;
        }
      }
    }

    if (targetSocketId) {
      io.to(targetSocketId).emit('muted-by-host');
      logger.info(`User ${userId} muted by host in room ${roomId}`);
    }
  });

  // Toggle Room Lock (Host only)
  socket.on('toggle-room-lock', async ({ roomId }) => {
    const room = await getRoom(roomId);
    const requester = await getUser(socket.id);

    if (!room || !requester) return;

    if (room.hostId !== requester.id) {
      socket.emit('error', 'Only host can lock/unlock room');
      return;
    }

    room.isLocked = !room.isLocked;
    await saveRoom(room);
    io.to(roomId).emit('room-lock-toggled', { isLocked: room.isLocked });
    logger.info(`Room ${roomId} lock status: ${room.isLocked}`);
  });

  // Video Playback Sync
  socket.on('play-video', ({ roomId, time }) => {
    socket.to(roomId).emit('video-played', { time });
  });

  socket.on('pause-video', ({ roomId, time }) => {
    socket.to(roomId).emit('video-paused', { time });
  });

  socket.on('seek-video', ({ roomId, time }) => {
    socket.to(roomId).emit('video-seeked', { time });
  });

  // Screen Share Signaling
  socket.on('start-screen-share', async ({ roomId, streamId }) => {
    const user = await getUser(socket.id);
    if (user) {
      socket.to(roomId).emit('user-started-screen-share', { userId: user.id, streamId });
      logger.info(`User ${user.id} (${user.name}) started screen share with stream ${streamId} in room ${roomId}`);
    }
  });

  socket.on('stop-screen-share', async ({ roomId }) => {
    const user = await getUser(socket.id);
    if (user) {
      socket.to(roomId).emit('user-stopped-screen-share', { userId: user.id });
      logger.info(`User ${user.id} (${user.name}) stopped screen share in room ${roomId}`);
    }
  });

  // WebRTC Signaling
  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', payload);
  });

  // WebRTC Signaling (legacy, not used with SFU but kept for compatibility)
  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (incoming) => {
    io.to(incoming.target).emit('ice-candidate', incoming);
  });
});

// Health check
app.get('/health', async (req, res) => {
  const activeRooms = await getActiveRooms();
  res.status(200).json({
    status: 'ok',
    rooms: activeRooms.length,
    users: 0,
  });
});

// Generate TURN credentials
const getTurnCredentials = () => {
  const secret = process.env.TURN_SECRET;
  const username = `user:${Math.floor(Date.now() / 1000)}`;
  const ttl = 24 * 3600; // 24 hours
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(`${username}:${Math.floor(Date.now() / 1000) + ttl}`);
  const password = hmac.digest('base64');

  return {
    username,
    credential: password,
    urls: [
      'stun:stun.l.google.com:19302',
      `turn:${process.env.TURN_URL || 'localhost'}:3478`
    ]
  };
};

app.get('/api/turn-credentials', (req, res) => {
  try {
    const credentials = getTurnCredentials();
    res.json(credentials);
  } catch (error) {
    logger.error('Error generating TURN credentials:', error);
    res.status(500).json({ error: 'Failed to generate credentials' });
  }
});

server.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

export { server, io };
