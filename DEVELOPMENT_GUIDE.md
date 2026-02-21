# Cospira Development & Contribution Guide

**Version:** 1.0
**Context:** Local Development for Windows/Linux (Node.js Environment)

---

## 1. Prerequisites (The Toolbelt)

Before attempting to run this infrastructure, ensure your environment meets these standards:

1.  **Node.js:** v18.x or higher (LTS recommended).
2.  **Package Manager:** `npm` (v9+) or `yarn`.
3.  **Docker Desktop:** Required for the Virtual Browser service (Chromium containerization).
    - _Note for Windows:_ Ensure WSL2 backend is enabled.
4.  **FFmpeg:** Must be installed and added to your system PATH (for media processing).
5.  **Supabase:** You need a Supabase project for Auth/DB (or local mock).

---

## 2. Initial Setup (First Run)

### A. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-repo/cospira-platform.git
cd cospira-platform

# Install Root/Client Dependencies
npm install

# Install Server Dependencies
cd server
npm install
cd ..
```

### B. Environment Configuration (.env)

You must create a `.env` file in the root directory. Use the following template:

```ini
# --- CLIENT CONFIG ---
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8080

# --- SERVER CONFIG ---
PORT=8080
CLIENT_URL=http://localhost:5173
# (Or your local IP, e.g., http://192.168.1.15:5173 for mobile testing)

# --- VIRTUAL BROWSER CONFIG ---
# If using Docker for browser:
DOCKER_BROWSER_IMAGE=browserless/chrome
```

---

## 3. Running the Stack

We use a concurrent runner to spin up both the Frontend (Vite) and Backend (Express/Socket.io) simultaneously.

### The Magic Command

```bash
npm run dev
```

- **What this does:**
  1.  Starts the React Vite Server on port `5173`.
  2.  Starts the Node Express Server on port `8080`.
  3.  Links them via the configured proxy/CORS settings.

- **Access:**
  - Open `http://localhost:5173` in your browser.
  - **Admin Panel:** `http://localhost:5173/COSPERA_ADMIN88/login`

---

## 4. Key Development Zones (Where to Edit)

### Zone A: Frontend UI & Logic (`/src`)

- **Pages:** `src/pages/` (Room.tsx, Dashboard.tsx, AdminDashboard.tsx)
- **Components:** `src/components/` (Reusable UI elements)
  - `VirtualBrowser.tsx`: The canvas handling the stream and inputs.
  - `VideoGrid.tsx`: The WebRTC matrix of user faces.
- **State:** `src/contexts/` (WebSocketContext is the brain here).

### Zone B: Backend & Signaling (`/server`)

- **Main Entry:** `server/src/index.js`
- **Socket Logic:** `server/src/sockets/`
  - `rooms.socket.js`: Handles Join, Leave, Kick, Lock events.
  - `browser.socket.js`: Handles virtual browser input processing.
- **Media Server:** `server/src/mediasoup/` (SFU logic configuration).

---

## 5. Common Development Scenarios

### Scenario 1: Styling Changes

- **Tech:** Tailwind CSS + Shadcn UI.
- **Action:** Edit any `.tsx` file. Tailwind classes are inline.
  - _Tip:_ We use a "luxury" dark theme. Avoid pure white backgrounds; use `bg-black/40` or `zinc` scales.

### Scenario 2: Modifying Room Logic

- **Context:** You want to add a feature like "Raise Hand".
- **Step 1 (Client):** Add `socket.emit('raise-hand')` in `Room.tsx`.
- **Step 2 (Server):** Add listener `socket.on('raise-hand', ...)` in `rooms.socket.js`.
- **Step 3 (Broadcast):** Server emits `io.to(roomId).emit('user-raised-hand', userId)`.
- **Step 4 (Client):** `useSocketEvents` hook listens and updates UI toast/icon.

### Scenario 3: Admin Panel Upgrades

- **Context:** You want to add a new "System Alert".
- **Action:** Edit `src/pages/admin/AdminDashboard.tsx`.
- **Auth:** The admin key is currently hardcoded for dev simplicity (`Mahesh@7648`). For production, move this to `.env`.

---

## 6. Troubleshooting & Gotchas

**Issue: "WebSocket connection failed"**

- **Fix:** Check if your IP changed. The `CLIENT_URL` in `.env` might need your specific LAN IP (e.g., `192.168.x.x`) not `localhost` if testing on other devices.
- **Script:** Run `node update-ip.js` (if available) to auto-update config.

**Issue: "Virtual Browser is blank/black"**

- **Fix:** This usually means the stream isn't reaching the client. Check:
  1.  Is Docker running?
  2.  Is the backend logging "Browser started"?
  3.  Check Console for "MediaStream" errors.

**Issue: "Duplicate Users"**

- **Fix:** Ensure your `useEffect` hooks in React aren't double-firing (React Strict Mode does this in dev). We have logic to handle strict mode re-mounting, but be careful adding new listeners.

---

## 7. Production Build

When ready to deploy:

```bash
# 1. Build Frontend
npm run build

# 2. Serve
# You typically upload the 'dist' folder to Vercel/Netlify
# AND deploy the 'server' folder to a VPS/Heroku/Render.
```

_Note:_ For production video/audio, you **MUST** serve the application over **HTTPS**, or modern browsers will block WebRTC and Microphone access.
