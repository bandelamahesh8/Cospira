import '../env.js';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import logger from '../shared/logger.js';
import { initRedis, getRoom, removeInactiveRooms } from '../shared/redis.js';
import { deleteRoomUploads } from '../utils/fileCleanup.js';
import SFUHandler from '../sfu/SFUHandler.js';
import registerSocketHandlers from '../sockets/index.js';

const PORT = process.env.PORT_SOCKET || 4000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const server = http.createServer();
const io = new Server(server, {
  path: '/socket.io',
  maxHttpBufferSize: 1e8, // 100MB
  cors: {
    origin: '*', // In production, restrict this
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Setup Redis Adapter
if (process.env.USE_REDIS !== 'false') {
    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Signaling: Socket.IO Redis Adapter configured');
    }).catch(err => {
        logger.error('Signaling: Failed to connect Redis Adapter:', err);
        if (process.env.NODE_ENV === 'production') process.exit(1);
    });
}

// Rate limiting
const socketConnectionMap = new Map();
io.use((socket, next) => {
    const ip = socket.handshake.address;
    const now = Date.now();
    let record = socketConnectionMap.get(ip) || { count: 0, firstConnectionTime: now };
    
    if (now - record.firstConnectionTime > 60000) {
        record = { count: 1, firstConnectionTime: now };
    } else {
        record.count++;
    }
    
    socketConnectionMap.set(ip, record);
    if (record.count > 60) return next(new Error('Too many connections'));
    next();
});

// Initialize Handlers
const sfuHandler = new SFUHandler(io);

const start = async () => {
    await initRedis();
    await sfuHandler.init();
    
    registerSocketHandlers(io);

    server.listen(PORT, () => {
        logger.info(`🚀 Signaling Server running on port ${PORT}`);
    });

    // Room Cleanup
    setInterval(async () => {
        try {
            const removedIds = await removeInactiveRooms();
            for (const rid of removedIds) await deleteRoomUploads(rid);
            if (removedIds.length > 0) io.emit('admin:stats-update');
        } catch (err) {
            logger.error('Cleanup error:', err);
        }
    }, 10 * 60 * 1000);
};

start().catch(err => {
    logger.error('Signaling Server Failed to start:', err);
    process.exit(1);
});
