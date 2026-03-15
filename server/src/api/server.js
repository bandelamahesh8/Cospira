import '../env.js';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../shared/logger.js';
import { initRedis } from '../shared/redis.js';

// Routes
import roomRoutes from './routes/rooms.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import aiKernelRoutes from './routes/aiKernel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT_API || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet());
app.use(cors({
    origin: '*', // Restrict in production
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'cospira-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: isProd }
}));

// API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ai/kernel', aiKernelRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api' }));

const start = async () => {
    await initRedis();
    app.listen(PORT, () => {
        logger.info(`🚀 API Server running on port ${PORT}`);
    });
};

start().catch(err => {
    logger.error('API Server Failed to start:', err);
    process.exit(1);
});
