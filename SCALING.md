# Scaling ShareUs Cloud Rooms

This document explains how ShareUs Cloud Rooms can be scaled to handle more users and rooms.

## Architecture Overview

ShareUs uses a hybrid architecture with two main components:

1. **Signaling Server** (Socket.io + Express)
   - Handles WebSocket connections
   - Manages room state (via Redis)
   - Coordinates SFU media routing

2. **Media Server** (Mediasoup SFU)
   - Handles WebRTC media streams
   - Runs on the same process as the signaling server

## Scaling Strategies

### Signaling Layer Scaling (Horizontal)

The signaling layer can be scaled horizontally using the **Redis Adapter** for Socket.io.

#### How it Works
- Multiple server instances connect to the same Redis instance
- Socket.io uses Redis pub/sub to broadcast events across all instances
- Room state is stored in Redis, accessible by all instances

#### Configuration
Set `USE_REDIS=true` in your environment variables:

```bash
USE_REDIS=true
REDIS_URL=redis://your-redis-host:6379
```

#### Deployment Example (Docker Compose)
```yaml
services:
  server:
    # ... other config
    environment:
      - USE_REDIS=true
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 3  # Run 3 instances
  
  redis:
    image: redis:alpine
```

#### Load Balancing
Use a load balancer (e.g., Nginx, HAProxy, AWS ALB) with:
- **Sticky sessions** (recommended for simplicity)
- OR **No sticky sessions** (Redis Adapter handles cross-instance communication)

### Media Layer Scaling (Vertical + "Sticky Rooms")

The media layer (Mediasoup) **cannot be easily horizontally scaled** due to WebRTC's peer-to-peer nature.

#### Current Approach: Vertical Scaling
- Increase CPU/RAM of server instances
- Mediasoup is highly optimized and can handle many streams per instance

#### Future Approach: "Sticky Rooms" (Advanced)
For true horizontal media scaling, you would need:
1. **Room-based routing**: Route all users in the same room to the same server instance
2. **Mediasoup Piping**: Use Mediasoup's piping feature to connect media across instances (complex)

**This is NOT implemented yet** and is only needed for very large deployments (hundreds of concurrent rooms).

## Current Limitations

1. **Single Media Instance per Room**: All participants in a room must connect to the same Mediasoup instance
2. **No Cross-Instance Media**: Media streams cannot span multiple server instances (without piping)

## Recommended Deployment

### Small-Medium Scale (< 100 concurrent rooms)
- **Single server instance** with vertical scaling (more CPU/RAM)
- Redis optional (can use in-memory storage)

### Medium-Large Scale (100-1000 concurrent rooms)
- **Multiple signaling instances** (3-5) with Redis Adapter
- **Sticky sessions** at load balancer (route users to same instance per room)
- Vertical scaling for each instance

### Enterprise Scale (> 1000 concurrent rooms)
- **Custom room routing** to distribute rooms across instances
- **Mediasoup piping** for cross-instance media (requires significant development)
- **Dedicated Redis cluster** for state management

## Monitoring

Key metrics to monitor:
- Active connections per instance
- Active rooms per instance
- CPU/Memory usage per instance
- Redis connection pool health

See `/metrics` endpoint for Prometheus metrics.

## See Also
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [Socket.io Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Mediasoup Documentation](https://mediasoup.org/documentation/)
