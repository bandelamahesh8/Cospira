import express from 'express';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import multer from 'multer';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
export { app, server, io };
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import client from 'prom-client'; // Prometheus client
import logger from './logger.js'; // Winston logger
import { createRoomSchema, joinRoomSchema, messageSchema } from './validation.js';
import { initRedis, getRoom, saveRoom, deleteRoom, getActiveRooms, hasRoom, getUser, saveUser, deleteUser, getSystemConfig, saveSystemConfig, removeInactiveRooms } from './redis.js';
import SFUHandler from './sfu/SFUHandler.js';
import crypto from 'crypto';
import { cleanupUploads } from './cleanup.js';
import LudoEngine from './game/LudoEngine.js';
import SnakeLadderEngine from './game/SnakeLadderEngine.js';
import registerSocketHandlers from './sockets/index.js';
import { Chess } from 'chess.js';
import connectMongoDB from './mongo.js';
import { supabase } from './supabase.js';
import roomRoutes from './routes/rooms.js';
import authRoutes from './routes/auth.js';
import aiMemoryRoutes from './routes/aiMemory.js';
import aiContextRoutes from './routes/aiContext.js';
import aiReasoningRoutes from './routes/aiReasoning.js';
import aiPersonalityRoutes from './routes/aiPersonality.js';
import aiAgentRoutes from './routes/aiAgents.js';
import aiConflictRoutes from './routes/aiConflicts.js';
import aiTrustRoutes from './routes/aiTrust.js';
import aiEthicsRoutes from './routes/aiEthics.js';
import aiTimelineRoutes from './routes/aiTimeline.js';
import aiTwinRoutes from './routes/aiTwin.js';
import aiSimulationRoutes from './routes/aiSimulation.js';
import aiOptimizeRoutes from './routes/aiOptimize.js';
import aiKernelRoutes from './routes/aiKernel.js';
import aiPlatformRoutes from './routes/aiPlatform.js';
import aiEnterpriseRoutes from './routes/aiEnterprise.js';
import aiPluginsRoutes from './routes/aiPlugins.js';
import aiAutonomousRoutes from './routes/aiAutonomous.js';
import aiOSRoutes from './routes/aiOS.js';
import agentManager from './services/ai/AgentManager.js';
import aios from './services/ai/AIOS.js';
import observerAgent from './services/ai/agents/ObserverAgent.js';
import analyzerAgent from './services/ai/agents/AnalyzerAgent.js';
import predictorAgent from './services/ai/agents/PredictorAgent.js';
import consensusService from './services/ai/ConsensusService.js';
import friendsRoutes from './routes/friends.js';
import tournamentRoutes from './routes/tournaments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (two levels up from server/src)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// connectMongoDB(); // Moved to startServer to ensure connection before listening

const app = express();
app.set('trust proxy', 1); // Enable proxy trust for rate limiting behind load balancers/proxies

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Private-Network", "true");
  next();
});

// Basic request logger
app.use((req, res, next) => {
  logger.info(`[API Request] ${req.method} ${req.url}`);
  next();
});


const isProd = process.env.NODE_ENV === 'production';

let server;
const keyPath = path.resolve(__dirname, '../../localhost+3-key.pem');
const certPath = path.resolve(__dirname, '../../localhost+3.pem');

const forceHttp = process.env.FORCE_HTTP === 'true' || !isProd;

if (!forceHttp && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  try {
    const serverOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    server = https.createServer(serverOptions, app);
    logger.info(`Starting HTTPS server (${isProd ? 'production' : 'development'} mode)`);
  } catch (error) {
    logger.error('Failed to load SSL certificates, falling back to HTTP:', error.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  logger.info(`Starting HTTP server (${isProd ? 'production' : 'development'} mode) - SSL certificates not found at ${certPath}`);
}
const port = process.env.PORT || 3001;

// FFmpeg Check (Prevent silent crashes later)
import { exec } from 'child_process';
exec('ffmpeg -version', (error) => {
    if (error) {
        logger.error('CRITICAL: FFmpeg is not installed or not in system PATH.');
        logger.error('Audio transcription will fail. Please install FFmpeg and RESTART your terminal/VS Code.');
        // We do NOT exit here to allow the server to run sans-AI, but it's a critical warning.
    } else {
        logger.info('✅ FFmpeg is installed and available.');
    }
});


// Prometheus Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const activeConnectionsGauge = new client.Gauge({
  name: 'cospira_active_connections',
  help: 'Number of active Socket.IO connections',
});
register.registerMetric(activeConnectionsGauge);

const activeRoomsGauge = new client.Gauge({
  name: 'cospira_active_rooms',
  help: 'Number of active realtime rooms (Redis active_rooms size)',
});
register.registerMetric(activeRoomsGauge);

const sfuWorkersGauge = new client.Gauge({
  name: 'cospira_sfu_workers',
  help: 'Number of mediasoup workers in this process',
});
register.registerMetric(sfuWorkersGauge);

// Enable CORS for all routes
app.use(cors({
  origin: (origin, callback) => {
    const isProd = process.env.NODE_ENV === 'production';
    const prodDomain = process.env.PROD_DOMAIN;

    // In production, strictly allow only the production domain
    if (isProd) {
        if (!prodDomain) {
            logger.error('PROD_DOMAIN not set in production. Blocking CORS.');
            return callback(new Error('CORS config error'));
        }
        if (origin === prodDomain) {
            return callback(null, true);
        }
        logger.warn(`Blocked by CORS (Express - Prod): ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    }

    // Development/Local logic
    const allowedOrigins = [
        process.env.CLIENT_URL || 'http://localhost:8080', 
        'http://localhost:3000',
        'http://localhost:5173'
    ];
    
    const isLocal = origin && (
        origin.startsWith('http://localhost') || origin.startsWith('https://localhost') ||
        origin.startsWith('http://127.0.0.1') || origin.startsWith('https://127.0.0.1') ||
        origin.startsWith('http://10.') || origin.startsWith('https://10.') ||
        origin.startsWith('http://192.') || origin.startsWith('https://192.') ||
        origin.startsWith('http://172.') || origin.startsWith('https://172.') ||
        origin.includes('.devtunnels.ms') || // Allow VS Code dev tunnels
        origin.includes('.exp.direct') || // Allow Expo tunnels
        origin.includes('.exp.host') ||
        origin.includes('.expo.test')
    );
    
    // Always allow in dev/test mode for valid localhost origins
    if (isLocal || allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      logger.warn(`Blocked by CORS (Express): ${origin}`); 
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));



// Security Headers (CSP allows inline scripts for Vite/React in dev; tighten in prod)
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
      fontSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.youtube.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  } : false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter Rate Limit for Auth/Room Creation
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit 20 room creations per hour
    message: 'Too many rooms created, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', globalLimiter);
app.use('/upload', globalLimiter);
app.use('/api/create-room', authLimiter);
const authRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many auth attempts',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authRouteLimiter);
app.use('/api/auth/register', authRouteLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Session configuration (6 hours)
const SESSION_LIFETIME = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
app.use(session({
  secret: process.env.SESSION_SECRET || (isProd ? (() => { throw new Error('SESSION_SECRET required in production') })() : 'cospira-secret-key'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: SESSION_LIFETIME,
    httpOnly: true,
    secure: isProd || fs.existsSync(certPath),
    sameSite: isProd ? 'strict' : 'lax'
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

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Max 1 file per request
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

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

// Room Cleanup Cron (Issue 3 & 11) - Every 5 minutes
setInterval(async () => {
    try {
        const rooms = await getActiveRooms();
        const now = Date.now();
        for (const room of rooms) {
            const userCount = room.users ? Object.keys(room.users).length : 0;
            const idleTime = now - new Date(room.updatedAt || room.createdAt).getTime();
            
            // Delete if empty for more than 10 mins OR inactive for more than 24h
            if ((userCount === 0 && idleTime > 10 * 60 * 1000) || idleTime > 24 * 60 * 60 * 1000) {
                await deleteRoom(room.id);
                logger.info(`Cron: Deleted stale/empty room ${room.id}`);
            }
        }
    } catch (err) {
        logger.error('Room cleanup cron error:', err);
    }
}, 5 * 60 * 1000);

// Create Socket.IO server
// Socket Connection Rate Limiter (Memory Map)
const socketConnectionMap = new Map(); // IP -> { count, firstConnectionTime }
const SOCKET_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_SOCKET_CONNECTIONS = 60; // 60 handshakes per minute per IP

// Create Socket.IO server
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: (origin, callback) => {
        const isProd = process.env.NODE_ENV === 'production';
        const prodDomain = process.env.PROD_DOMAIN;

        if (isProd) {
            if (!prodDomain || origin !== prodDomain) {
                logger.warn(`Blocked by CORS (Socket.IO - Prod): ${origin}`);
                return callback(new Error('Not allowed by CORS'));
            }
             return callback(null, true);
        }
        
        // Dev/Local logic (lenient)
        const allowedOrigins = [
            process.env.CLIENT_URL,
            'http://localhost:8080',
            'http://localhost:5173',
            'http://localhost:3000'
        ];
        const isLocal = !isProd && origin && (
            origin.startsWith('http://localhost') || origin.startsWith('https://localhost') ||
            origin.startsWith('http://10.') || origin.startsWith('https://10.') ||
            origin.startsWith('http://192.') || origin.startsWith('https://192.') ||
            origin.startsWith('http://172.') || origin.startsWith('https://172.') ||
            origin.includes('.devtunnels.ms') // Allow VS Code dev tunnels
        );

      if (isLocal || allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        logger.warn(`Blocked by CORS (Socket.IO): ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8, // 100MB for file uploads
});

// Redis Adapter for Horizontal Scaling
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

if (process.env.USE_REDIS === 'true') {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.IO Redis Adapter configured');
    }).catch(err => {
        logger.error('Failed to connect Redis Adapter:', err);
    });
}

// Rate limiting middleware for Socket.IO
io.use((socket, next) => {
    const ip = socket.handshake.address;
    const now = Date.now();
    let record = socketConnectionMap.get(ip);
    
    // Reset if window passed
    if (!record || (now - record.firstConnectionTime > SOCKET_LIMIT_WINDOW)) {
        record = { count: 1, firstConnectionTime: now };
    } else {
        record.count++;
    }
    
    socketConnectionMap.set(ip, record);
    
    if (record.count > MAX_SOCKET_CONNECTIONS) {
        logger.warn(`Socket rate limit exceeded for IP: ${ip}`);
        return next(new Error('Too many connections'));
    }
    
    // Periodic Cleanup (simple)
    if (socketConnectionMap.size > 5000) socketConnectionMap.clear();

    next();
});

// Initialize Redis
initRedis();

// Server Cleanup Service: Purge inactive/junk rooms periodically
setInterval(async () => {
    try {
        const removed = await removeInactiveRooms();
        if (removed > 0) {
            logger.info(`[Cleanup] System purged ${removed} inactive/junk rooms to maintain sector integrity.`);
            io.emit('admin:stats-update');
        }
    } catch (err) {
        logger.error('[Cleanup] Error in periodic room purging:', err);
    }
}, 10 * 60 * 1000); // Run every 10 minutes

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

// Register API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai/memory', aiMemoryRoutes);
app.use('/api/ai/context', aiContextRoutes);
app.use('/api/ai/reasoning', aiReasoningRoutes);
app.use('/api/ai/personality', aiPersonalityRoutes);
app.use('/api/ai/agents', aiAgentRoutes);
app.use('/api/ai/conflicts', aiConflictRoutes);
app.use('/api/ai/trust', aiTrustRoutes);
app.use('/api/ai/ethics', aiEthicsRoutes);
app.use('/api/ai/timeline', aiTimelineRoutes);
app.use('/api/ai/twin', aiTwinRoutes);
app.use('/api/ai/simulation', aiSimulationRoutes);
app.use('/api/ai/optimize', aiOptimizeRoutes);
app.use('/api/ai/kernel', aiKernelRoutes);
app.use('/api/ai/platform', aiPlatformRoutes);
app.use('/api/ai/enterprise', aiEnterpriseRoutes);
app.use('/api/ai/plugins', aiPluginsRoutes);
app.use('/api/ai/autonomous', aiAutonomousRoutes);
app.use('/api/ai/os', aiOSRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/tournaments', tournamentRoutes);

// AI System Bootstrap
aios.init().catch(e => logger.error('[AIOS] Boot failed:', e));

// AI Agent Initialization
agentManager.registerAgent(observerAgent);
agentManager.registerAgent(analyzerAgent);
agentManager.registerAgent(predictorAgent);
agentManager.startAll().catch(e => logger.error('[Agents] Start failed:', e));

// REST Endpoints

// Socket.IO health check
app.get('/socket.io-health', (req, res) => {
  res.json({ 
    status: 'ok',
    socketIoPath: '/socket.io',
    transports: ['websocket', 'polling']
  });
});

// Sanitize room id/code: alphanumeric, dash, underscore, 3-80 chars
const sanitizeRoomId = (id) => typeof id === 'string' && /^[a-zA-Z0-9-_]{3,80}$/.test(id) ? id : null;

// Get room info (check if exists and requires password)
app.get('/api/room-info/:code', async (req, res) => {
  const code = sanitizeRoomId(req.params.code);
  if (!code) return res.status(400).json({ error: 'Invalid room code' });
  const room = await getRoom(code);
  if (!room || !room.isActive) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const hasPassword = !!(room.password || room.passwordHash);
  const accessType = room.accessType || (hasPassword ? 'password' : 'public');

  res.json({
    exists: true,
    requiresPassword: hasPassword,
    accessType,
    name: room.name || room.id,
    hasWaitingRoom: !!room.hasWaitingRoom
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

// AI Sync Endpoint (Stub)
app.post('/api/ai/sync', (req, res) => {
    res.json({ summaries: [], analysis: [] });
});

// User Profile Endpoint (Stub/Alias for /me)
app.get('/api/user/profile', (req, res) => {
    // Ideally this would redirect to /api/auth/me or call the same logic
    res.redirect('/api/auth/me');
});

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
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
    const { roomId, roomName, password, userId, accessType = 'public' } = validatedData;

    const existingRoom = await getRoom(roomId);
    if (existingRoom && existingRoom.isActive) {
      return res.status(409).json({ error: 'Room already exists' });
    }

    let inviteToken = null;
    if (accessType === 'invite') {
      inviteToken = uuidv4();
    }

    // Canonical realtime room shape (matches socket-based creation in rooms.socket.js)
    const newRoom = {
      id: roomId,
      name: roomName || roomId,
      hostId: userId,
      coHosts: [],
      password: password || null,
      accessType,
      inviteToken,
      users: [], // always an array of user objects
      messages: [],
      files: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isLocked: false,
      hasWaitingRoom: false,
      waitingUsers: {}, // object keyed by userId for waiting room
      settings: {}
    };
    
    // Sync to Supabase (uses the same room shape)
    await import('./services/SupabaseRoomService.js').then(m => m.syncCreateRoom(newRoom));

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
  const id = sanitizeRoomId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid room id' });
  const room = await getRoom(id);
  if (!room || !room.isActive) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const hasPassword = !!(room.password || room.passwordHash);
  const userCount = Array.isArray(room.users) ? room.users.length : (room.users ? Object.keys(room.users).length : 0);

  res.json({
    id: room.id,
    name: room.name,
    requiresPassword: hasPassword,
    userCount,
    createdAt: room.createdAt
  });
});

// Socket.IO Middleware for JWT Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (token) {
    const jwtSecret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && !jwtSecret) {
         logger.error('JWT_SECRET missing in production');
         return next(new Error('Internal Config Error'));
    }
    jwt.verify(token, jwtSecret || 'cospira-secret-key', { algorithms: ['HS256'] }, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
             logger.info(`Token expired for ${socket.id}. Proceeding as guest.`);
        } else {
             logger.warn(`Auth failed for socket ${socket.id}: ${err.message}`);
        }
        return next();
      }
      socket.user = decoded;
      next();
    });
  } else {
    next();
  }
});

// Initialize Modular Socket Handlers
registerSocketHandlers(io, sfuHandler);

// Initialize Matchmaking Service
import { matchmakingService } from './services/MatchmakingService.js';
// Note: Matchmaking is handled via socket events in matchmaking.socket.js
// The service doesn't have a start() method - it's a singleton that manages the queue
/*
matchmakingService.start((match) => {
  // When match is found, emit to both players
  io.to(match.player1.socketId).emit('match-found', {
    roomId: match.roomId,
    opponent: {
      id: match.player2.playerId,
      name: match.player2.playerName,
      elo: match.player2.elo,
    },
    gameType: match.gameType,
    mode: match.mode,
  });

  io.to(match.player2.socketId).emit('match-found', {
    roomId: match.roomId,
    opponent: {
      id: match.player1.playerId,
      name: match.player1.playerName,
      elo: match.player1.elo,
    },
    gameType: match.gameType,
    mode: match.mode,
  });

  logger.info(`🎮 Match created: ${match.player1.playerName} vs ${match.player2.playerName}`);
});
*/


/* 
   Modular socket handlers are registered via registerSocketHandlers.
   The following function is retained for any potential future REST-based waiting room logic.
*/
async function getWaitingUsers(room) {
    return room.waitingUsers ? Object.values(room.waitingUsers) : [];
}





// Get active rooms for dashboard
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await getActiveRooms();
    const publicRooms = rooms
      .filter(r => r.accessType !== 'invite') // Hide invite-only rooms
      .map(r => {
        const hasPassword = !!(r.password || r.passwordHash);
        const userCount = Array.isArray(r.users) ? r.users.length : (r.users ? Object.keys(r.users).length : 0);
        const accessType = r.accessType || (hasPassword ? 'password' : 'public');

        return {
          id: r.id,
          name: r.name,
          createdAt: r.createdAt,
          userCount,
          requiresPassword: hasPassword,
          accessType,
          hostId: r.hostId,
          hasWaitingRoom: !!r.hasWaitingRoom
        };
      });
    
    res.json(publicRooms);
  } catch (error) {
    logger.error('Error fetching active rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Health check (detailed) - single /health route; simple one is above for load balancers
app.get('/health', async (req, res) => {
  try {
    const activeRooms = await getActiveRooms();
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      rooms: activeRooms?.length ?? 0,
      users: 0,
    });
  } catch (e) {
    res.status(503).json({ status: 'degraded', error: 'Redis unavailable' });
  }
});

// Generate TURN credentials
const getTurnCredentials = () => {
  const secret = process.env.TURN_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
       throw new Error('TURN_SECRET required in production');
  }
  // Fallback only for dev
  const turnSecret = secret || 'cospira-secret-key-change-me';
  const username = `user:${Math.floor(Date.now() / 1000)}`;
  const ttl = 24 * 3600; // 24 hours
  const hmac = crypto.createHmac('sha1', turnSecret);
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

// --- DEEPGRAM STT (DISABLED - Using Gemini instead) ---
// import deepgramService from './services/DeepgramService.js';

// Deepgram endpoint disabled - using Gemini for transcription
app.get('/api/deepgram/token', async (req, res) => {
    res.status(501).json({ 
        error: 'Deepgram is not configured. Using Gemini for transcription.' 
    });
});

// --- ADMIN ENVIRONMENT CONTROL ---
const ENV_PATH = path.resolve(__dirname, '../../.env');
// Security Hardening: Use Environment Variable for Admin Key
const ADMIN_KEY_VALUE = process.env.ADMIN_KEY || 'Mahesh@7648';

if (!process.env.ADMIN_KEY) {
    logger.warn('[SECURITY] Admin Key is using default/hardcoded value. Please set ADMIN_KEY in .env');
}

const adminAuth = (req, res, next) => {
    const key = req.headers['x-admin-key'];
    if (!key || typeof key !== 'string') {
        logger.warn(`[SECURITY] Failed admin login attempt from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized Access' });
    }
    const keyBuf = Buffer.from(key, 'utf8');
    const expectedBuf = Buffer.from(ADMIN_KEY_VALUE, 'utf8');
    if (keyBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(keyBuf, expectedBuf)) {
        logger.warn(`[SECURITY] Failed admin login attempt from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized Access' });
    }
    next();
};

/* 
   JWT Hardening is applied in the specific Socket.IO middleware block above.
*/

app.get('/api/admin/env', adminAuth, (req, res) => {
    try {
        if (!fs.existsSync(ENV_PATH)) {
            return res.json({ content: '' }); 
        }
        const content = fs.readFileSync(ENV_PATH, 'utf8');
        res.json({ content });
    } catch (error) {
        logger.error('Failed to read .env:', error);
        res.status(500).json({ error: 'Failed to read environment file' });
    }
});

app.get('/api/admin/status', adminAuth, async (req, res) => {
    try {
        const config = await getSystemConfig();
        res.json(config);
    } catch (error) {
        logger.error('Failed to get system config:', error);
        res.status(500).json({ error: 'Failed to get system status' });
    }
});

app.get('/api/admin/data', adminAuth, async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase integration disabled' });
        }

        // Fetch profiles, feedback, and active rooms
        const [usersResult, feedbackResult, rooms] = await Promise.all([
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
            supabase.from('feedback').select('*').order('created_at', { ascending: false }),
            getActiveRooms()
        ]);

        if (usersResult.error) throw usersResult.error;
        if (feedbackResult.error) throw feedbackResult.error;

        // Fetch Auth Users (for email)
        const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
             page: 1,
             perPage: 1000
        });
        
        if (authError) {
             logger.error('Failed to fetch auth users:', authError);
             // Verify we don't crash, just continue without emails
        }

        // Merge email into profiles
        const combinedUsers = usersResult.data.map(profile => {
             const authUser = authUsers?.find(u => u.id === profile.id);
             return {
                 ...profile,
                 email: authUser?.email || 'No Email'
             };
        });

        res.json({
            users: combinedUsers,
            feedbacks: feedbackResult.data,
            activeRooms: rooms
        });
    } catch (error) {
        logger.error('Failed to fetch admin data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

app.post('/api/admin/env', adminAuth, (req, res) => {
    try {
        const { content } = req.body;
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Invalid content format' });
        }
        // Create backup
        if (fs.existsSync(ENV_PATH)) {
            fs.copyFileSync(ENV_PATH, `${ENV_PATH}.backup`);
        }
        fs.writeFileSync(ENV_PATH, content, 'utf8');
        logger.warn('[ADMIN] .env file updated via Dashboard');
        res.json({ success: true, message: 'Environment updated. Restart required.' });
    } catch (error) {
        logger.error('Failed to write .env:', error);
        res.status(500).json({ error: 'Failed to write environment file' });
    }
});

const startServer = async () => {
  await connectMongoDB();
  
  server.listen(port, () => {
    const protocol = server instanceof https.Server ? 'HTTPS' : 'HTTP';
    logger.info(`Server running on port ${port} (${protocol})`);
  });
};

startServer();

// Global Error Handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection: ${reason.message || reason}`);
  if (reason.stack) logger.debug(reason.stack);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message || error}`);
  if (error.stack) logger.debug(error.stack);
  // Give time for logging before exiting
  setTimeout(() => process.exit(1), 1000);
});


