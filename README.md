# Cospira

> **A full-stack, real-time collaboration and multiplayer gaming platform** built with React 18, Node.js/Express, Socket.IO, WebRTC (MediaSoup SFU), MongoDB, Redis, and Supabase. Supports Web, Desktop (Tauri), and Mobile (React Native/Expo).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack](#3-technology-stack)
4. [Core Features](#4-core-features)
5. [Architecture](#5-architecture)
6. [Frontend (Client)](#6-frontend-client)
7. [Backend (Server)](#7-backend-server)
8. [Database & Storage](#8-database--storage)
9. [Real-time Communication](#9-real-time-communication)
10. [AI Subsystem](#10-ai-subsystem)
11. [Games Module](#11-games-module)
12. [Desktop & Mobile Apps](#12-desktop--mobile-apps)
13. [API Reference](#13-api-reference)
14. [WebSocket Events](#14-websocket-events)
15. [Configuration](#15-configuration)
16. [Development Setup](#16-development-setup)
17. [Production Deployment](#17-production-deployment)
18. [Testing](#18-testing)
19. [Security & Observability](#19-security--observability)

---

## 1. Project Overview

Cospira is a monorepo platform that combines:

| Capability | Description |
|---|---|
| **Collaboration Rooms** | Live video/audio rooms with host controls, breakout rooms, chat, and screen sharing |
| **Multiplayer Games** | Chess, Snake & Ladder, Ludo, Connect 4, Carrom with ELO rating & tournaments |
| **AI Assistant** | Context-aware AI running in rooms with moderation, transcription, and summarization |
| **Organizations** | Multi-tenant org management, admin controls, audit logging, batch operations |
| **Social Graph** | Friends, clans, clan wars, global chat, user profiles, quests, seasons |
| **Economy** | Balance/credits, shop, ELO ranking, creator monetization |
| **Analytics** | Room metrics, WebRTC quality stats, activity tracking, AI-generated meeting summaries |
| **Recording** | Session recording, meeting replay, transcript storage |
| **Cross-platform** | Web app, Tauri desktop shell (Rust), React Native mobile app |

---

## 2. Repository Structure

```
Cospira/
├── src/                          # React + TypeScript frontend
│   ├── pages/                    # 28+ route-level page components
│   ├── components/               # 46+ shared UI components & 30+ feature subdirectories
│   ├── services/                 # 54 client-side service files
│   ├── contexts/                 # React Context providers
│   ├── hooks/                    # 24+ custom React hooks
│   ├── stores/                   # Zustand state stores
│   ├── types/                    # TypeScript type definitions (10 files)
│   ├── utils/                    # Shared utility functions
│   ├── modules/games/            # Client-side game logic
│   ├── game-engine/              # AI & core game engines
│   ├── domains/rooms/            # Room domain model
│   ├── integrations/supabase/    # Supabase client helpers
│   ├── carrom/                   # Carrom physics game (matter.js)
│   ├── styles/                   # CSS modules & design tokens
│   ├── ui/                       # Desktop UI layout wrappers
│   └── test/                     # Vitest setup
│
├── server/                       # Node.js + Express backend
│   └── src/
│       ├── routes/               # 19 REST API route files
│       ├── sockets/              # 19 Socket.IO event handler files
│       ├── services/             # 29 backend service files
│       ├── models/               # 15 Mongoose models
│       ├── middleware/           # Auth, rate-limit, validation middleware
│       ├── game/                 # Snake & Ladder server engine
│       ├── game-servers/         # Chess server
│       ├── sfu/                  # MediaSoup SFU handler
│       ├── browser/              # Puppeteer/Playwright browser automation
│       ├── utils/                # Server utility functions
│       ├── index.js              # Server entry point
│       ├── mongo.js              # MongoDB connection
│       ├── redis.js              # Redis client + in-memory fallback
│       ├── supabase.js           # Supabase client
│       ├── logger.js             # Winston logger
│       ├── validation.js         # Zod schemas
│       └── config.js             # Runtime configuration
│
├── desktop-shell/                # Tauri 2 desktop application (Rust)
│   ├── src/                      # Rust source files
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
│
├── mobile-app/                   # React Native / Expo mobile application
│   ├── android/                  # Android-specific Gradle project
│   ├── app.json                  # Expo config
│   └── package.json
│
├── e2e/                          # Playwright end-to-end tests
│   ├── host-controls.spec.ts
│   └── room-flow.spec.ts
│
├── docs/
│   └── adr/                      # Architecture Decision Records
│
├── load-tests/                   # Load testing scripts
├── supabase/                     # Supabase local config (config.toml)
├── public/                       # Static frontend assets
│
├── docker-compose.yml            # Development container stack
├── docker-compose.prod.yml       # Production container stack
├── Dockerfile                    # Frontend dev container (Node 20 Alpine)
├── Dockerfile.prod               # Frontend production build
├── server/Dockerfile.browser     # Server with browser isolation
├── Caddyfile                     # Caddy reverse proxy config
├── nginx.conf                    # Nginx alternative config
├── vite.config.ts                # Vite bundler config
├── tailwind.config.ts            # Tailwind CSS theme
├── playwright.config.ts          # Playwright E2E config
├── tsconfig.json                 # TypeScript config (strict + path aliases)
├── components.json               # shadcn/ui component config
└── package.json                  # Root (frontend) dependencies & scripts
```

---

## 3. Technology Stack

### Frontend
| Category | Library / Version |
|---|---|
| UI Framework | React 18.3.1 + TypeScript |
| Bundler | Vite 7.3.1 |
| Routing | React Router DOM 6.30.1 |
| State Management | Zustand 5.0.10, React Query 5.83.0 |
| Component Library | shadcn/ui + Radix UI + Tailwind CSS |
| 3D / Graphics | Three.js 0.160.0, React Three Fiber, React Spring Three |
| Real-time | Socket.IO Client 4.8.1 |
| WebRTC | MediaSoup Client 3.18.1 |
| Forms | React Hook Form 7.61.1 + Zod 3.25.76 |
| Animations | Framer Motion 11.18.2, Lottie React 2.4.1 |
| Chess | react-chessboard, chess.js, stockfish.js |
| Charts | Recharts 2.15.4 |
| Audio | Howler 2.2.4, Deepgram SDK 4.11.3, RNNoise WASM |
| Physics (Carrom) | matter.js |
| Drag & Drop | DND Kit |
| Utilities | date-fns, Immer, canvas-confetti, Next Themes, Vaul |

### Backend
| Category | Library / Version |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4.18.2 |
| Real-time | Socket.IO 4.7.2 |
| WebRTC / Media | MediaSoup 3.19.12 |
| Primary DB | MongoDB 9.0.2 (Mongoose ODM) |
| Secondary DB | Supabase (PostgreSQL) via `@supabase/supabase-js` 2.86.0 |
| Caching | Redis 4.6.10 (optional, in-memory fallback) |
| Auth | JWT (jsonwebtoken), express-session, OTP |
| Validation | Zod 3.25.0 |
| Security | Helmet 7.1.0, express-rate-limit 7.1.5, CORS 2.8.5 |
| AI / LLMs | Google Generative AI 0.24.1, OpenAI 6.16.0 |
| Speech | Deepgram SDK 4.11.3 |
| Media Processing | FFmpeg, Multer 1.4.5, Sharp 0.34.5 |
| Browser Automation | Playwright 1.57.0, Puppeteer |
| Logging | Winston 3.18.3 |
| Monitoring | prom-client 15.1.3 (Prometheus) |
| Utilities | uuid, axios, http-proxy |

### Desktop
| Category | Library / Version |
|---|---|
| Framework | Tauri 2.9.1 |
| Language | Rust (Cargo) |

### Mobile
| Category | Library / Version |
|---|---|
| Framework | React Native + Expo |
| Build | Gradle (Android) |

### DevOps / Infrastructure
| Category | Tool |
|---|---|
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Caddy (primary), Nginx |
| WebRTC ICE | Coturn (STUN/TURN) |
| E2E Testing | Playwright 1.57.0 |
| Unit Testing | Vitest 4.0.14 + React Testing Library |
| Linting | ESLint + Prettier + Husky + lint-staged |

---

## 4. Core Features

### Collaboration Rooms
- **Create / Join Rooms** – Code-based room entry; hosts control who can join
- **Host Controls** – Mute/unmute participants, kick, grant co-host, lock room
- **Breakout Rooms** – Sub-rooms with automatic participant assignment and merge-back
- **Room State Machine** – Lifecycle: `waiting → active → ended` with transition guards
- **Auto-close Service** – Closes inactive rooms and cleans up uploads automatically

### Real-time Communication
- **Video / Audio** – WebRTC via MediaSoup SFU for scalable multi-party calls
- **Screen Sharing** – Browser-based screen capture forwarded through SFU
- **Chat** – Room-scoped and global chat channels via Socket.IO
- **Presence** – Live user list with join/leave events, typing indicators

### Voice & Audio Intelligence
- **Transcription** – Deepgram real-time speech-to-text inside rooms
- **Noise Suppression** – RNNoise WASM / Shiguredo integration
- **Audio Visualization** – Waveform rendering for active speakers
- **Meeting Summaries** – AI-generated summaries stored in MongoDB

### AI Subsystem
- **AI Assistant** – Context-aware assistant available within rooms (Google Generative AI / OpenAI)
- **Moderation** – Automated content filtering and sentiment analysis (Emotional Guardian)
- **Policy Engine** – Configurable rules for behavior governance
- **Authority Engine** – Fine-grained permission management
- **Room Intelligence** – Smart suggestions, decision engine, reinforcement learning service
- **AI Agents** – Observer, Analyzer, Predictor agent roles with autonomous actions
- **AIOS** – AI Operating System layer orchestrating all AI subsystems
- **Digital Twin / Simulation** – User digital twins and room scenario simulation

### Games & Entertainment
- **Chess** – Stockfish AI, real-time 2-player, spectators
- **Snake & Ladder** – Server-side engine with multiplayer dice rolls
- **Ludo** – Full multiplayer implementation
- **Connect 4** – Classic board game
- **Carrom** – Physics-based simulation (matter.js)
- **ELO Rating** – Cross-game rating system
- **Matchmaking** – Skill-based pairing service
- **Tournaments** – Bracket management, leaderboards, prize distribution

### Social & Community
- **Friends** – Add/remove friends, friend status
- **Clans** – Group management, clan wars, ranking
- **Global Chat** – Platform-wide chat lobby
- **Profiles** – Public user profiles with stats and activity history
- **Creator Tools** – Monetization and audience engagement features

### Organizations & Administration
- **Multi-tenant Orgs** – Isolated org spaces with member management
- **Batch Operations** – Bulk assign hosts, manage memberships
- **Admin Intelligence** – AI-powered admin suggestions
- **Audit Logging** – Compliance-grade event log
- **Settings Management** – Per-org and per-user configuration

### Economy & Progression
- **Balance / Credits** – Virtual currency with transaction history
- **Shop** – In-game item purchases
- **Quests & Achievements** – Daily/weekly quest system
- **Seasons** – Seasonal progression and rewards
- **Creator Monetization** – Revenue sharing for content creators

### Analytics & Monitoring
- **Activity Tracking** – Per-user and per-room event logs
- **Room Analytics** – Participation stats, session durations
- **WebRTC Metrics** – Jitter, packet loss, bitrate stored in MongoDB
- **AI Analytics Page** – Dashboard powered by AI insights (frontend page)
- **Prometheus Metrics** – `/metrics` endpoint for infrastructure monitoring

### Recording & Playback
- **Session Recording** – Capture room sessions via FFmpeg pipelines
- **Meeting Replay** – Stored recording playback
- **Transcript Archive** – Full searchable transcript history

---

## 5. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Clients                                 │
│  Browser (React/Vite)  Desktop (Tauri)  Mobile (React Native)  │
└───────────────────┬────────────────────────────────────────────┘
                    │ HTTPS / WSS
         ┌──────────▼──────────┐
         │   Caddy / Nginx     │  Reverse Proxy
         │  (TLS termination)  │
         └──────────┬──────────┘
                    │
        ┌───────────▼───────────┐
        │   Express API Server  │  :3001
        │  ┌─────────────────┐  │
        │  │   REST Routes   │  │  /api/*
        │  ├─────────────────┤  │
        │  │  Socket.IO      │  │  /socket.io
        │  ├─────────────────┤  │
        │  │  MediaSoup SFU  │  │  WebRTC media
        │  ├─────────────────┤  │
        │  │  AI Services    │  │  Google AI / OpenAI
        │  └─────────────────┘  │
        └──┬──────┬──────┬──────┘
           │      │      │
    ┌──────▼─┐ ┌──▼──┐ ┌─▼───────────┐
    │MongoDB │ │Redis│ │  Supabase   │
    │(primary│ │cache│ │ (Postgres + │
    │  data) │ │     │ │   Storage)  │
    └────────┘ └─────┘ └─────────────┘
```

---

## 6. Frontend (Client)

### Entry Points

| File | Purpose |
|---|---|
| `src/main.tsx` | React DOM root render, Ngrok bypass setup, logger init |
| `src/App.tsx` | Root component: providers, error boundary, animated router |
| `index.html` | HTML shell loaded by Vite |

### Pages (`src/pages/`)

| Page | Route / Purpose |
|---|---|
| `Auth.tsx` | Login / Register |
| `Dashboard.tsx` | Main user dashboard |
| `Room.tsx` | Live collaboration room |
| `BreakoutRoom.tsx` | Breakout sub-room |
| `Games.tsx` | Game selection lobby |
| `Profile.tsx` | User profile |
| `Organizations.tsx` | Org list / management |
| `OrganizationRoom.tsx` | Org-scoped room |
| `Settings.tsx` | User settings |
| `AIAnalyticsPage.tsx` | AI-powered analytics dashboard |
| `Activity.tsx` | Activity feed |
| `CreateRoom.tsx` | Room creation wizard |
| `Join.tsx` | Join room by code |
| `ModeSelection.tsx` | Mode / feature selector |
| `SocialRoom.tsx` | Social lobby |
| `ProjectDashboard.tsx` | Project management view |
| `UpcomingFeatures.tsx` | Feature roadmap page |
| `NotFound.tsx` | 404 page |
| `admin/` | Admin panel pages |

### Key Contexts (`src/contexts/`)

| Context | Responsibility |
|---|---|
| `AuthContext` | JWT auth state, login/logout, refresh |
| `WebSocketContext` | Socket.IO connection lifecycle |
| `OrganizationContext` | Current org selection and data |
| `BreakoutContext` | Breakout room state |
| `AIAssistantContext` | AI assistant session and messaging |

### State Stores (`src/stores/`)

Zustand stores for global mutable state: room participants, chat messages, media track state, game state slices, etc.

### Client Services (`src/services/`)

54 service files covering:
- `AnalyticsService.ts` – Event emission for analytics
- `ELOService.ts` – Client-side ELO calculations
- `MatchmakingService.ts` – Matchmaking queue management
- `RoomIntelligence.ts` – Client-side room intelligence hooks
- `SFUManager.ts` – MediaSoup transport management
- `StockfishService.ts` – Chess AI integration (WebWorker)
- `MeetingService.ts` – Meeting lifecycle operations
- `BreakoutService.ts` – Breakout room operations
- `SocialService.ts`, `ClanService.ts` – Social features
- `BrainService.ts`, `CospiraBrainLoop.ts` – AI brain loop
- `DecisionEngine.ts` – Client-side decision logic
- ... and 40+ more

---

## 7. Backend (Server)

### Entry Point

`server/src/index.js` — Bootstraps:
1. Express app with CORS, Helmet, rate limiting
2. HTTP / HTTPS server (conditional)
3. Socket.IO server attached to HTTP/HTTPS
4. MongoDB connection (`connectMongoDB`)
5. Redis / in-memory store (`initRedis`)
6. Supabase storage bucket initialization
7. MediaSoup SFU handler (`SFUHandler`)
8. REST route registration
9. Socket event handler registration
10. Auto-close service and upload cleanup
11. Prometheus metrics endpoint (`/metrics`)

### REST Routes (`server/src/routes/`)

| File | Mount Path |
|---|---|
| `auth.js` | `/api/auth` |
| `rooms.js` | `/api/rooms` |
| `game.js` | `/api/game` |
| `friends.js` | `/api/friends` |
| `tournaments.js` | `/api/tournaments` |
| `aiMemory.js` | `/api/aiMemory` |
| `aiContext.js` | `/api/aiContext` |
| `aiReasoning.js` | `/api/aiReasoning` |
| `aiPersonality.js` | `/api/aiPersonality` |
| `aiAgents.js` | `/api/aiAgents` |
| `aiConflicts.js` | `/api/aiConflicts` |
| `aiTrust.js` | `/api/aiTrust` |
| `aiEthics.js` | `/api/aiEthics` |
| `aiTimeline.js` | `/api/aiTimeline` |
| `aiTwin.js` | `/api/aiTwin` |
| `aiSimulation.js` | `/api/aiSimulation` |
| `aiOptimize.js` | `/api/aiOptimize` |
| `aiKernel.js` | `/api/aiKernel` |
| `aiPlatform.js` | `/api/aiPlatform` |
| `aiEnterprise.js` | `/api/aiEnterprise` |
| `aiPlugins.js` | `/api/aiPlugins` |
| `aiAutonomous.js` | `/api/aiAutonomous` |
| `aiOS.js` | `/api/aiOS` |

### Backend Services (`server/src/services/`)

29 services including:
- `AutoCloseService.js` – Polls and closes inactive rooms
- `RoomIntelligenceService.js` – Smart room actions
- `AssistantService.js` – AI assistant response generation
- `ModerationService.js` – Content moderation pipeline
- `TranscriptService.js` – Transcript storage and retrieval
- `AnalyticsService.js` – Room and user metrics
- `AgentManager.js` – AI agent lifecycle management
- `AIOS.js` – AI OS orchestration layer

### Mongoose Models (`server/src/models/`)

| Model | Purpose |
|---|---|
| `Room` | Room documents (state, participants, config) |
| `Session` | User session records |
| `RoomEvent` | Room lifecycle event log |
| `RoomAnalytics` | Aggregated room metrics |
| `Transcript` | Room text transcripts |
| `VoiceTranscript` | Voice-to-text segments |
| `MeetingSummary` | AI-generated meeting summaries |
| `WebRTCMetrics` | Per-session WebRTC quality stats |
| `AIModerationLog` | Moderation decision log |
| `KartSession` | Kart game session |
| `KartResult` | Race results |
| `KartCheckpoint` | Checkpoint data |
| `KartIdentityMap` | Player identity mapping |
| `UserAnalyticsSetting` | Per-user analytics preferences |
| `DailyRoomStats` | Daily aggregated room statistics |

---

## 8. Database & Storage

### MongoDB (Primary)
- **Connection:** `MONGODB_URI` environment variable
- **ODM:** Mongoose 9.0.2
- **Options:** 5 s server selection timeout, 45 s socket timeout
- **Stores:** All operational data — rooms, sessions, transcripts, analytics, game records

### Supabase (PostgreSQL + File Storage)
- **URL:** `SUPABASE_URL` env var
- **Key:** `SUPABASE_SERVICE_ROLE_KEY` env var
- **Auth:** User registration, login, JWT tokens
- **Storage Bucket:** `cospira-media` (public) — uploaded media files
- **Client SDK:** `@supabase/supabase-js` 2.86.0

### Redis (Cache / Session)
- **URL:** `REDIS_URL` (default `redis://localhost:6379`)
- **Enabled by:** `USE_REDIS=true` env var
- **Fallback:** In-memory Map when Redis is unavailable
- **Cached Entities:** Rooms, Users, System Config
- **Adapter:** `@socket.io/redis-adapter` for multi-instance Socket.IO

### File Storage
- **Uploads directory:** `server/uploads/`
- **Persistent storage:** Supabase `cospira-media` bucket
- **Cleanup:** `AutoCloseService` removes uploads for closed rooms

---

## 9. Real-time Communication

### Socket.IO Handlers (`server/src/sockets/`)

| Handler | Events |
|---|---|
| `room.socket.js` | Room join/leave, state changes |
| `chat.socket.js` | Send/receive messages (10+ events) |
| `media.socket.js` | Audio/video track management (14+ events) |
| `admin.socket.js` | Admin commands (11 events) |
| `breakout.socket.js` | Breakout room lifecycle (50+ events) |
| `breakout-ai.socket.js` | AI-powered breakout features |
| `games.socket.js` | General game events (35+ events) |
| `chess.socket.js` | Chess move/state (8 events) |
| `matchmaking.socket.js` | Queue management (12+ events) |
| `ai.socket.js` | AI assistant messages (15+ events) |
| `analytics.socket.js` | Event emission for tracking (25+ events) |
| `quality.socket.js` | WebRTC quality reporting (8 events) |
| `policy.socket.js` | Policy enforcement events (28+ events) |
| `browser.socket.js` | Browser automation control (18+ events) |
| `room-intelligence.socket.js` | Smart room events (15+ events) |
| `assistant.socket.js` | Assistant I/O (8 events) |
| `random.socket.js` | Random number / shuffle (10+ events) |

### WebRTC (MediaSoup SFU)
- **Handler:** `server/src/sfu/SFUHandler.js`
- **Roles:** Router, Producer, Consumer transport management
- **ICE Servers:** Coturn STUN/TURN (configured via `ICE_SERVERS` env var)
- **Client:** `mediasoup-client` 3.18.1

---

## 10. AI Subsystem

The AI subsystem is the most complex part of Cospira, spanning both frontend services and a full suite of backend routes and services.

### Frontend AI Services (`src/services/ai/` and top-level)
- `BrainService.ts` – Core AI processing loop
- `CospiraBrainLoop.ts` – Periodic brain state updates
- `DecisionEngine.ts` – Evaluates room conditions and recommends actions
- `ReinforcementService.ts` – Lightweight RL for behavior improvement
- `MetaService.ts`, `MetaEvolutionService.ts` – Meta-learning layers

### Backend AI Services (`server/src/services/ai/`)
- `AgentManager.js` – Lifecycle management for AI agents (Observer, Analyzer, Predictor)
- `AIOS.js` – AI Operating System: orchestrates all subsystems

### AI REST Routes (all under `/api/`)
| Route | Purpose |
|---|---|
| `aiMemory` | Persistent memory storage and retrieval for AI agents |
| `aiContext` | Context window management |
| `aiReasoning` | Chain-of-thought reasoning API |
| `aiPersonality` | Configurable AI personality traits |
| `aiAgents` | CRUD for AI agent instances |
| `aiConflicts` | Conflict detection and resolution |
| `aiTrust` | Trust score computation |
| `aiEthics` | Ethics rule enforcement |
| `aiTimeline` | Event timeline for temporal reasoning |
| `aiTwin` | Digital twin creation/management |
| `aiSimulation` | Room/user scenario simulation |
| `aiOptimize` | System optimization suggestions |
| `aiKernel` | Core AI runtime kernel |
| `aiPlatform` | Platform-level AI services |
| `aiEnterprise` | Enterprise AI features (compliance, reporting) |
| `aiPlugins` | Plugin system for extending AI capabilities |
| `aiAutonomous` | Fully autonomous AI actions |
| `aiOS` | AI OS layer (cross-subsystem coordination) |

---

## 11. Games Module

### Chess
- **Client:** `react-chessboard` + `chess.js` (move validation)
- **AI:** `stockfish.js` WebWorker (Stockfish engine)
- **Server:** `server/src/game-servers/chess-server.js`
- **Socket Handler:** `chess.socket.js`

### Snake & Ladder
- **Server Engine:** `server/src/game/SnakeLadderEngine.js`
- **Source analysis ADR:** `docs/adr/001-snake-ladder-source-analysis.md`

### Ludo
- **Client:** Full Ludo board implementation in `src/modules/games/`

### Connect 4
- **Client:** Board game implementation in `src/modules/games/`

### Carrom
- **Physics:** matter.js physics engine
- **Location:** `src/carrom/`
- **Source analysis ADR:** `docs/adr/001-carrom-source-analysis.md`
- **Features:** Striker control, coin physics, pocket detection, multiplayer sync

### Cross-Game Infrastructure
- **ELO Service** – Rating calculation after ranked matches
- **Matchmaking Service** – Skill-based opponent pairing
- **Tournament System** – Bracket generation, round management, prize allocation
- **Game Sync Service** – State synchronization across clients

---

## 12. Desktop & Mobile Apps

### Desktop (Tauri)
- **Framework:** Tauri 2.9.1 with Rust backend
- **Configuration:** `desktop-shell/tauri.conf.json`
- **Dev command:** `npm run desktop:dev`
- **Build command:** `npm run desktop:build`
- **Wraps:** The same React frontend (reuses `src/`)
- **Extra config:** `desktop-shell/tauri.connect.conf.json` for connection mode

### Mobile (React Native + Expo)
- **Location:** `mobile-app/`
- **Config:** `mobile-app/app.json`
- **Platforms:** Android (Gradle), iOS (via Expo)
- **Shares:** Core business logic and types from the monorepo

---

## 13. API Reference

### Authentication (`/api/auth`)

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create a new user account |
| POST | `/login` | Authenticate and receive JWT |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update profile fields |
| GET | `/check-username` | Check username availability |
| POST | `/otp/request` | Request one-time password |
| POST | `/otp/verify` | Verify OTP |
| POST | `/password/reset` | Request password reset |
| POST | `/password/change` | Change password |
| POST | `/email/change` | Request email change |
| GET | `/email/confirm` | Confirm email change |

### Rooms (`/api/rooms`)
- CRUD operations for rooms
- Join / leave room
- Participant management
- Room state transitions

### Games (`/api/game`)
- Chess, Snake & Ladder, Ludo game state endpoints
- Tournament management

### Friends (`/api/friends`)
- Friend list CRUD
- Friend request accept/decline

### Tournaments (`/api/tournaments`)
- Tournament creation and management
- Bracket queries

### ICE Servers
- `GET /api/ice-servers` — Returns STUN/TURN server list for WebRTC

### Uploads
- `POST /api/upload` — Upload files to Supabase storage
- `GET /api/uploads/:filename` — Serve uploaded files

### Monitoring
- `GET /metrics` — Prometheus metrics endpoint

---

## 14. WebSocket Events

### Connection Flow
1. Client connects to `/socket.io` with JWT in auth header
2. Server verifies JWT, attaches user data to socket
3. Client emits `join-room` with room code
4. Server validates, adds to room, broadcasts `user-joined`

### Key Event Categories

| Category | Representative Events |
|---|---|
| Room | `join-room`, `leave-room`, `room-state`, `kick-user` |
| Chat | `send-message`, `receive-message`, `typing-start`, `typing-stop` |
| Media | `produce`, `consume`, `close-producer`, `webrtc-quality` |
| Games | `game-start`, `game-move`, `game-end`, `chess-move` |
| Breakout | `create-breakout`, `assign-breakout`, `merge-breakout` |
| AI | `ai-message`, `ai-response`, `ai-moderation`, `ai-summary` |
| Analytics | `track-event`, `session-start`, `session-end` |
| Policy | `policy-violation`, `policy-enforce`, `policy-update` |

---

## 15. Configuration

### Environment Variables

**Frontend** (`.env` loaded from `SECURITY` dir in dev, standard `.env` in production):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_WS_URL` | WebSocket server URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

**Backend** (`.env` in `server/`):

| Variable | Description |
|---|---|
| `PORT` | Express server port (default 3001) |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL |
| `USE_REDIS` | Enable Redis (`true` / `false`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Secret for JWT signing |
| `SESSION_SECRET` | Express session secret |
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_AI_API_KEY` | Google Generative AI key |
| `DEEPGRAM_API_KEY` | Deepgram API key |
| `AGORA_APP_ID` | Agora app ID |
| `AGORA_APP_CERTIFICATE` | Agora app certificate |
| `ICE_SERVERS` | JSON array of STUN/TURN configs |
| `CORS_ORIGIN` | Allowed CORS origins |

### Key Config Files

| File | Purpose |
|---|---|
| `vite.config.ts` | Vite dev server (port 8080), proxy `/api` + `/socket.io` → `:3001`, code splitting |
| `tailwind.config.ts` | Design tokens, custom colors, animations |
| `tsconfig.json` | Strict TypeScript, path alias `@/` → `src/` |
| `components.json` | shadcn/ui style + component path configuration |
| `playwright.config.ts` | E2E test base URL, browser, retries |
| `supabase/config.toml` | Local Supabase development configuration |
| `Caddyfile` | Proxy rules: `/api/*`, `/socket.io/*`, `/uploads/*` → backend |
| `docker-compose.yml` | Dev stack: frontend, server, redis, mongodb, caddy, coturn |

---

## 16. Development Setup

### Prerequisites
- Node.js 20+
- npm 9+
- Docker & Docker Compose (optional but recommended)
- Rust + Cargo (for desktop app only)

### Local Development

```bash
# 1. Install frontend dependencies
npm install

# 2. Install server dependencies
cd server && npm install && cd ..

# 3. Set up environment variables
# Copy and fill in server/.env (see Configuration section above)

# 4. Start both frontend and backend
npm run dev
# This runs:
#   - Vite dev server on :8080 (frontend)
#   - Nodemon Express server on :3001 (backend)
#   - update-ip.js pre-script

# Or start separately:
npm run dev:client   # Frontend only
npm run dev:server   # Backend only
```

### Docker Development

```bash
# Start full stack (includes MongoDB, Redis, Caddy, Coturn)
docker compose up

# With build
docker compose up --build
```

### Desktop App

```bash
npm run desktop:dev        # Development mode
npm run desktop:connect    # Connect to running backend
npm run desktop:build      # Production build
```

### Code Quality

```bash
npm run lint      # ESLint
npm run format    # Prettier
```

---

## 17. Production Deployment

### Docker Production Stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

**Services:**
| Service | Image | Purpose |
|---|---|---|
| `frontend` | `Dockerfile.prod` | Production Vite build |
| `server` | `Dockerfile.browser` | Express + browser automation |
| `redis` | `redis:alpine` | Session cache |
| `mongodb` | `mongo:9` | Primary database |
| `caddy` | `caddy:2` | TLS termination + reverse proxy |
| `coturn` | `coturn/coturn` | STUN/TURN for WebRTC |

**Resource limits (prod):** 4 CPU, 4 GB memory, 2 GB SHM (for browser automation)

### Build

```bash
npm run build          # Production Vite build → dist/
npm run build:dev      # Development mode build
npm run preview        # Preview production build locally
```

### Vite Code Splitting (chunks)
| Chunk | Contents |
|---|---|
| `react-vendor` | react, react-dom, react-router-dom |
| `ui-vendor` | @radix-ui, lucide-react |
| `supabase-vendor` | @supabase |
| `webrtc-vendor` | mediasoup-client, socket.io-client |
| `charts-vendor` | recharts |
| `animation-vendor` | framer-motion, lottie-react |

---

## 18. Testing

### End-to-End Tests (Playwright)

```bash
npx playwright test           # Run all E2E tests
npx playwright test --ui      # Interactive UI mode
```

**Test files:**
- `e2e/room-flow.spec.ts` – Room creation, joining, and basic flow
- `e2e/host-controls.spec.ts` – Host permission and control actions

**Configuration (`playwright.config.ts`):**
- Base URL: `https://localhost:8080` (HTTPS is required because the Vite dev server uses TLS to support WebRTC `getUserMedia`, which browsers only permit in secure contexts; a self-signed certificate is used and SSL errors are intentionally ignored in tests)
- Browser: Chromium with fake media stream devices
- Retries: 0 (dev), 2 (CI)
- SSL errors ignored for local self-signed certificate
- HTML report output

### Unit Tests (Vitest)

```bash
npx vitest            # Run unit tests
npx vitest run        # Single run (CI mode)
npx vitest --ui       # Browser UI
```

**Setup:** `src/test/setup.ts`  
**Environment:** jsdom  
**Library:** React Testing Library 16.3.0

### Load Tests

Located in `load-tests/`. Scripts for stress-testing rooms and WebSocket connections.

---

## 19. Security & Observability

### Security Measures
- **Helmet** – HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **express-rate-limit** – API rate limiting (configurable per route)
- **CORS** – Strict origin whitelisting via `CORS_ORIGIN` env var
- **JWT** – Signed tokens for stateless auth; refresh token rotation
- **Zod Validation** – Input validation on all REST and Socket.IO inputs
- **Session Management** – `express-session` with secure cookies
- **HTTPS** – Enforced in production via Caddy auto-TLS
- **Browser Isolation** – Puppeteer/Playwright runs in a separate Docker container

### Observability
- **Winston Logger** – Structured JSON logging to files (`combined.log`, `error.log`) and console
- **Prometheus** – Metrics exposed at `/metrics` (request counts, latency, active rooms, etc.)
- **WebRTC Quality Metrics** – Jitter, packet loss, bitrate stored per-session in MongoDB

---

## Architecture Decision Records

Located in `docs/adr/`:

| ADR | Title |
|---|---|
| `001-carrom-source-analysis.md` | Carrom game physics port from Unity to matter.js |
| `001-snake-ladder-source-analysis.md` | Snake & Ladder server engine design |

---

*This README was generated as part of a comprehensive repository analysis.*
