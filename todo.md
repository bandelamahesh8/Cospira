📌 ShareUs Cloud Rooms — TODO Roadmap

A complete, prioritized execution plan for upgrading and hardening the platform.

PHASE 0 — SECURITY & SECRETS (CRITICAL BEFORE PUBLIC DEPLOYMENT)
0.1 Env & Supabase Cleanup

 Remove all hardcoded Supabase URL + anon key fallback from supabase/client.ts.

 Make VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY mandatory; crash if missing.

 Delete all .env files committed to repo (keep only .env.example).

 Add clear env instructions to .env.example.

0.2 JWT & TURN Secret Hardening

 Remove default secrets ('shareus-secret-key', 'shareus-secret-key-change-me').

 Require JWT_SECRET and TURN_SECRET in production; fail fast if missing.

 Add strong random secrets in deployment environments.

0.3 WebSocket Auth Enforcement

 Dev mode: allow anonymous if NODE_ENV=development.

 Prod mode: reject sockets without valid JWT.

 Ensure all room actions rely on authenticated userId.

0.4 Protect Metrics Endpoint

 Restrict /metrics using:

Basic auth, OR

IP allowlist in Caddy

 Confirm metrics are not publicly reachable.

PHASE 1 — SFU STABILITY & RESOURCE HEALTH
1.1 Mediasoup Cleanup & Lifecycle

 Add cleanup on last user leaving a room:

Close transports.

Close producers/consumers.

Destroy router.

 Add logs to track router creation/destruction.

 Add /metrics counters for:

Active routers

Active transports

1.2 Room Lifecycle (Redis Hygiene)

 Mark room inactive when:

Host disbands

Last user disconnects

 Add a periodic cleaner:

Remove rooms idle for X minutes/hours.

 Ensure getActiveRooms only returns real active rooms.

1.3 TURN Server Integration

 Deploy a real TURN server (coturn).

 Configure /api/turn-credentials to issue short-lived credentials.

 Include TURN URLs in ICE server config.

 Test behind strict NAT/hotspot situations.

PHASE 2 — FRONTEND ARCHITECTURE & UX OVERHAUL
2.1 Refactor Room.tsx

 Extract hooks:

useRoomCore()

useMediaStreams()

useChatAndFiles()

 Extract UI components:

<ParticipantsPanel />

<ChatPanel />

<MediaToolbar />

<PresentationArea />

 Keep Room.tsx as a thin container that orchestrates subcomponents.

2.2 WebSocket Context Split

 Split into:

ConnectionContext

RoomContext

MediaContext

 Optionally move heavy state to Zustand for faster updates.

2.3 Device & Network UX Improvements

 Implement camera/mic/speaker selection UI.

 Persist selections to localStorage.

 Add network quality indicator (good/medium/poor).

 Add “Connection unstable” warnings on packet loss / ICE failures.

2.4 Waiting Room & Host Controls UX

 Show clear “X users waiting” indicator.

 Approve / Reject all users.

 Provide per-user control actions.

 Improve waiting room UI with status feedback (“Waiting for host…”).

PHASE 3 — TESTING, CLEANUP & DOCUMENTATION
3.1 Repo Cleanup

 Remove backup/broken files:

Room.tsx.backup, .broken

index.js.backup

sfu_lint.txt, sfu_warning.txt

 Add to .gitignore:

dist/

playwright-report/

test-results/

 Remove any existing committed build artifacts.

3.2 Expand E2E Tests

 Test joining an existing room.

 Test waiting room approve/reject.

 Test host mute/kick flows.

 Test basic screen-sharing flow.

 Add CI integration for automated tests.

3.3 Documentation Upgrade

 Add DEVELOPMENT.md:

Required env variables (frontend + backend + Supabase + TURN + Redis).

How to run dev environment with/without Docker.

 Add DEPLOYMENT.md:

Production steps with Docker + Caddy.

Setting up custom Supabase + TURN.

 Add a simple architecture diagram (ASCII or image) to README.

PHASE 4 — FUTURE SCALE-UP & PRODUCT GROWTH
4.1 Org / Team System

 Add organizations table in Supabase.

 Add memberships (user ↔ org ↔ role).

 Add org-scoped rooms.

 Add admin dashboard for activity/usage.

4.2 Multi-Region Scaling

 Add region-based SFU workers.

 Implement room-to-worker mapping.

 Implement sticky sessions.

 Create autoscaling policies.