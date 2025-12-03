# ShareUs Cloud Rooms

A secure, real-time video conferencing application built with React, Node.js, and WebRTC.

## Features

- **Real-Time Video/Audio**: High-quality peer-to-peer calls using WebRTC.
- **Screen Sharing**: Share your screen with other participants.
- **Chat**: Real-time text chat with file sharing support.
- **Recording**: Record your sessions locally.
- **Moderation**: Host controls to mute, kick, or promote participants.
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
    cd shareus-cloud-rooms
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

## License

MIT
