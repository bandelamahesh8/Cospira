# Cospira — Connect Beyond Meetings

A secure, real-time video conferencing application built with React, Node.js, and WebRTC.

## Features

- **Real-Time Video/Audio**: High-quality peer-to-peer calls using WebRTC.
- **Screen Sharing**: Share your screen with other participants.
- **🌐 Cloud Browser**: Stream a real headless Chromium browser with full audio/video support
  - Works with YouTube, Spotify, any website
  - No iframe limitations or CSP issues
  - Real-time input forwarding (mouse, keyboard)
  - Multi-user synchronized viewing
- **Interactive Games**: Play Tic-Tac-Toe, Chess, Ludo, Snake & Ladder together
- **Chat**: Real-time text chat with file sharing support.
- **Recording**: Record your sessions locally.
- **Moderation**: Host controls to mute, kick, or promote participants.
- **Admin System (God Mode)**:
  - Real-time "Command Zone" for global sync, lockdown, and emergency kill switches.
  - Live user tracking and banishment capabilities.
  - Built-in Environment Variable editor.
- **Scalable Video Grid**:
  - Smart pagination for large meetings.
  - Drag-and-drop participant management.
- **Security**:
  - JWT-based authentication.
  - Rate limiting.
  - Secure headers (Helmet).
  - Input validation (Zod).

## Architecture

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui.
- **Backend**: Node.js, Express, Socket.IO.
- **Database**: Redis (for room/user state).
- **Infrastructure**: Docker, Caddy (Reverse Proxy).

## Getting Started

For detailed development instructions, please refer to [DEVELOPMENT.md](./DEVELOPMENT.md).

### Quick Start (Docker)

1.  **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd cospira-cloud-rooms
    ```

2.  **Setup Environment**:

    ```bash
    cp .env.example .env
    cp server/.env.example server/.env
    # Update server/.env with your secrets!
    ```

3.  **Run with Docker**:

    ```bash
    docker-compose up --build
    ```

4.  **Access the App**:
    Open [http://localhost](http://localhost) in your browser.

## 🌐 Cloud Browser

The cloud browser feature streams a real headless Chromium browser to all participants. See detailed documentation:

- **[CLOUD_BROWSER_SUMMARY.md](./CLOUD_BROWSER_SUMMARY.md)** - Quick overview and setup
- **[CLOUD_BROWSER_GUIDE.md](./CLOUD_BROWSER_GUIDE.md)** - Complete architecture guide
- **[CLOUD_BROWSER_TESTING.md](./CLOUD_BROWSER_TESTING.md)** - Testing and deployment

### Quick Test

```bash
# Run health check
bash check-browser-health.sh

# Start with Docker
docker-compose up -d

# Or start manually (Linux/WSL2)
export DISPLAY=:99
Xvfb :99 -screen 0 1280x720x24 &
pulseaudio --start
cd server && npm run dev
```

## 📚 Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) - **NEW** Admin Dashboard Manual
- [CLOUD_BROWSER_GUIDE.md](./CLOUD_BROWSER_GUIDE.md) - Cloud browser architecture
- [SCALING.md](./SCALING.md) - Scaling guide

## License

MIT
