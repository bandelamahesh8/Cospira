# Deployment Guide

This guide covers how to deploy ShareUs Cloud Rooms using Docker Compose.

## Prerequisites

- **Docker Engine** & **Docker Compose** installed on the target server.
- A domain name pointing to your server (optional but recommended for SSL).
- **Supabase Project** for authentication.

## 1. Environment Configuration

Create a `.env` file in the root directory (or use environment variables in your CI/CD pipeline).

```bash
# General
NODE_ENV=production
PORT=3001

# Frontend
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_WS_URL=wss://your-domain.com

# Backend Secrets
JWT_SECRET=generate_a_strong_random_string
TURN_SECRET=generate_another_strong_random_string
METRICS_TOKEN=generate_a_metrics_token

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

## 2. Docker Compose

We use `docker-compose.prod.yml` for production deployments. This configuration includes:

- **Frontend**: Built as a static site and served by Caddy.
- **Backend**: Node.js server.
- **Redis**: For state management.
- **Caddy**: Reverse proxy and automatic SSL termination.

### Update Caddyfile

Edit `Caddyfile` to use your domain name:

```caddyfile
your-domain.com {
    reverse_proxy /api/* backend:3001
    reverse_proxy /socket.io/* backend:3001
    
    # Serve frontend static files
    root * /srv
    file_server
    try_files {path} /index.html
}
```

## 3. Deploy

Run the following command to build and start the services:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## 4. Verification

1.  Visit `https://your-domain.com`.
2.  Login and create a room.
3.  Verify WebSocket connection (check network tab for `socket.io` requests).

## 5. Scaling (Future)

For multi-region scaling or high availability, you will need to:
- Externalize Redis (e.g., AWS ElastiCache).
- Use a load balancer that supports sticky sessions (for Socket.IO).
- Deploy Mediasoup workers on separate instances (mediasoup-worker is CPU intensive).
