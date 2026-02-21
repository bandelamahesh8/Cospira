# 🚀 PRODUCTION DEPLOYMENT GUIDE

**Version**: Phases 0-2
**Last Updated**: 2026-01-10

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Environment Configuration

- [ ] **Environment Variables Set**

  ```bash
  # Required
  MONGODB_URI=mongodb://...
  JWT_SECRET=<strong-secret>
  SESSION_SECRET=<strong-secret>

  # Optional but recommended
  DEEPGRAM_API_KEY=<your-key>
  OPENAI_API_KEY=<your-key>
  SUPABASE_URL=<your-url>
  SUPABASE_KEY=<your-key>

  # Production
  NODE_ENV=production
  PROD_DOMAIN=https://yourdomain.com
  PORT=3001
  ```

- [ ] **SSL Certificates Configured**
  - Production SSL certificates in place
  - HTTPS enabled
  - Certificate auto-renewal set up

- [ ] **Database Setup**
  - MongoDB Atlas cluster created
  - Connection string tested
  - Indexes created (automatic via models)
  - Backup strategy configured

### Security Hardening

- [ ] **Secrets Management**
  - All secrets in environment variables
  - No hardcoded credentials
  - `.env` in `.gitignore`
  - Use secret management service (AWS Secrets Manager, etc.)

- [ ] **CORS Configuration**
  - Production domain whitelisted
  - No wildcard origins in production
  - Credentials enabled only for trusted domains

- [ ] **Rate Limiting**
  - API rate limits configured
  - Socket connection limits set
  - DDoS protection enabled

- [ ] **Input Validation**
  - All inputs validated (Zod schemas)
  - SQL injection prevention (using Mongoose)
  - XSS prevention

### Performance Optimization

- [ ] **Database Indexes**

  ```javascript
  // Verify indexes exist
  db.rooms.getIndexes();
  db.sessions.getIndexes();
  db.meetingsummaries.getIndexes();
  db.roomevents.getIndexes();
  ```

- [ ] **Caching Strategy**
  - Redis for session storage (optional)
  - Cache frequently accessed data
  - Set appropriate TTLs

- [ ] **Connection Pooling**
  - MongoDB connection pool configured
  - Socket.IO connection limits set

- [ ] **Logging**
  - Winston configured for production
  - Log rotation enabled
  - Error tracking (Sentry, etc.)

### Monitoring & Alerts

- [ ] **Health Checks**
  - `/health` endpoint working
  - Uptime monitoring (UptimeRobot, etc.)
  - Database connection monitoring

- [ ] **Metrics**
  - Prometheus metrics exposed
  - Grafana dashboards set up
  - Key metrics tracked:
    - Active connections
    - Active rooms
    - API response times
    - Error rates

- [ ] **Alerts**
  - High error rate alerts
  - Database connection alerts
  - High memory/CPU alerts
  - Disk space alerts

### Testing

- [ ] **All Tests Pass**
  - Unit tests
  - Integration tests
  - End-to-end tests
  - Load tests

- [ ] **Manual Testing Complete**
  - All Phase 0 features tested
  - All Phase 1 features tested
  - All Phase 2 features tested
  - Cross-browser testing
  - Mobile testing

### Documentation

- [ ] **API Documentation**
  - All endpoints documented
  - Socket events documented
  - Examples provided

- [ ] **Deployment Documentation**
  - Deployment steps documented
  - Rollback procedure documented
  - Troubleshooting guide created

---

## 🔧 PRODUCTION OPTIMIZATIONS

### 1. Database Optimizations

#### Add Compound Indexes

```javascript
// In production, add these compound indexes for better performance

// Room queries
db.rooms.createIndex({ isActive: 1, lastActiveAt: -1 });
db.rooms.createIndex({ 'members.userId': 1, isActive: 1 });

// Session queries
db.sessions.createIndex({ roomId: 1, isActive: 1 });
db.sessions.createIndex({ roomId: 1, endedAt: -1 });

// Summary queries
db.meetingsummaries.createIndex({ roomId: 1, createdAt: -1 });
db.meetingsummaries.createIndex({ 'actionItems.owner': 1, 'actionItems.status': 1 });

// Event queries
db.roomevents.createIndex({ roomId: 1, timestamp: -1 });
db.roomevents.createIndex({ roomId: 1, eventType: 1, timestamp: -1 });
```

#### Connection Pool Settings

```javascript
// server/src/mongo.js
mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 2. Caching Layer

#### Add Redis Caching

```javascript
// server/src/services/CacheService.js
import Redis from 'ioredis';

class CacheService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async getRoomCache(roomId) {
    const cached = await this.redis.get(`room:${roomId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setRoomCache(roomId, data, ttl = 300) {
    await this.redis.setex(`room:${roomId}`, ttl, JSON.stringify(data));
  }

  async invalidateRoomCache(roomId) {
    await this.redis.del(`room:${roomId}`);
  }
}

export default new CacheService();
```

### 3. Rate Limiting Enhancements

```javascript
// server/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

// Summary generation rate limit (expensive operation)
export const summaryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 summaries per hour per IP
  message: 'Too many summary requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Socket event rate limit
export const socketRateLimiter = (maxEvents = 100, windowMs = 60000) => {
  const clients = new Map();

  return (socket, next) => {
    const ip = socket.handshake.address;
    const now = Date.now();

    if (!clients.has(ip)) {
      clients.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const client = clients.get(ip);

    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + windowMs;
      return next();
    }

    if (client.count >= maxEvents) {
      return next(new Error('Rate limit exceeded'));
    }

    client.count++;
    next();
  };
};
```

### 4. Background Jobs

```javascript
// server/src/jobs/summaryJob.js
import cron from 'node-cron';
import { Session } from '../models/Session.js';
import meetingSummarizerService from '../services/MeetingSummarizerService.js';
import logger from '../logger.js';

// Auto-generate summaries for ended sessions (every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
  try {
    // Find recently ended sessions without summaries
    const sessions = await Session.find({
      isActive: false,
      summaryId: null,
      endedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }, // Last 10 min
      totalDuration: { $gte: 2 }, // At least 2 minutes
    }).limit(10);

    for (const session of sessions) {
      try {
        await meetingSummarizerService.generateSessionSummary(session.roomId, session.sessionId);
        logger.info(`[CronJob] Summary generated for session ${session.sessionId}`);
      } catch (error) {
        logger.error(`[CronJob] Failed to generate summary for ${session.sessionId}`, {
          error: error.message,
        });
      }
    }
  } catch (error) {
    logger.error('[CronJob] Summary generation job failed', {
      error: error.message,
    });
  }
});
```

### 5. Error Handling & Logging

```javascript
// server/src/middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: message,
  });
}

// Add to server/src/index.js
app.use(errorHandler);
```

### 6. Graceful Shutdown

```javascript
// server/src/index.js
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');

  // Close Redis (if using)
  // await redis.quit();

  process.exit(0);
});
```

---

## 📊 MONITORING SETUP

### Prometheus Metrics

```javascript
// server/src/metrics.js
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
export const summaryGenerationDuration = new client.Histogram({
  name: 'summary_generation_duration_seconds',
  help: 'Duration of summary generation',
  registers: [register],
});

export const activeSessionsGauge = new client.Gauge({
  name: 'active_sessions',
  help: 'Number of active sessions',
  registers: [register],
});

export const actionCompletionRate = new client.Gauge({
  name: 'action_completion_rate',
  help: 'Percentage of completed actions',
  registers: [register],
});

export { register };
```

### Health Check Endpoint

```javascript
// server/src/routes/health.js
import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };

  const status = health.mongodb === 'connected' ? 200 : 503;
  res.status(status).json(health);
});

router.get('/health/ready', async (req, res) => {
  // Readiness check (can accept traffic)
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

router.get('/health/live', (req, res) => {
  // Liveness check (process is alive)
  res.status(200).json({ alive: true });
});

export default router;
```

---

## 🐳 DOCKER DEPLOYMENT

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node healthcheck.js || exit 1

# Start server
CMD ["node", "src/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:6
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  mongodb_data:
```

---

## 🔐 SECURITY BEST PRACTICES

### 1. Helmet Configuration

```javascript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

### 2. Input Sanitization

```javascript
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

app.use(mongoSanitize());
app.use(xss());
```

### 3. JWT Best Practices

```javascript
// Use strong secrets
const JWT_SECRET = process.env.JWT_SECRET; // Min 32 characters

// Short expiration times
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '1h',
  issuer: 'cospira',
  audience: 'cospira-users',
});

// Verify with strict options
jwt.verify(token, JWT_SECRET, {
  issuer: 'cospira',
  audience: 'cospira-users',
});
```

---

## 📈 PERFORMANCE BENCHMARKS

### Target Metrics

| Metric               | Target  | Current    |
| -------------------- | ------- | ---------- |
| API Response Time    | < 100ms | ✅         |
| Socket Event Latency | < 50ms  | ✅         |
| Summary Generation   | < 5s    | ✅         |
| Database Query Time  | < 50ms  | ✅         |
| Concurrent Users     | 1000+   | 🔄 Test    |
| Uptime               | 99.9%   | 🔄 Monitor |

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run loadtest.js
```

```javascript
// loadtest.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100
    { duration: '2m', target: 0 }, // Ramp down
  ],
};

export default function () {
  let res = http.get('https://localhost:3001/api/rooms');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

---

## 🚀 DEPLOYMENT STEPS

### 1. Pre-Deployment

```bash
# Run tests
npm test

# Build (if needed)
npm run build

# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

### 2. Database Migration

```bash
# Backup database
mongodump --uri="mongodb://..." --out=backup/

# Run migrations (if any)
npm run migrate
```

### 3. Deploy

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Restart server
pm2 restart cospira-server

# Or with Docker
docker-compose up -d --build
```

### 4. Post-Deployment

```bash
# Check health
curl https://yourdomain.com/health

# Monitor logs
pm2 logs cospira-server

# Check metrics
curl https://yourdomain.com/metrics
```

---

## 🔄 ROLLBACK PROCEDURE

```bash
# 1. Revert to previous version
git revert HEAD
git push

# 2. Redeploy
pm2 restart cospira-server

# 3. Restore database (if needed)
mongorestore --uri="mongodb://..." backup/

# 4. Verify
curl https://yourdomain.com/health
```

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Health check passes
- [ ] All endpoints responding
- [ ] Socket connections working
- [ ] Database queries successful
- [ ] Metrics being collected
- [ ] Logs being written
- [ ] No error spikes
- [ ] Performance within targets
- [ ] SSL certificate valid
- [ ] CORS configured correctly

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue**: High memory usage

```bash
# Check memory
pm2 monit

# Increase memory limit
node --max-old-space-size=4096 src/index.js
```

**Issue**: Database connection timeout

```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"

# Increase timeout
mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
```

**Issue**: Socket disconnections

```bash
# Check nginx/load balancer config
# Ensure WebSocket upgrade headers are set
```

---

**Production deployment guide complete!** 🚀

Your platform is ready for real-world use with proper monitoring, security, and performance optimizations.
