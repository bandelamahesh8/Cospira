# Cospira × Unity Multiplayer Kart — Full Integration Specification

**Document version**: 1.0  
**Status**: Production-ready  
**Audience**: Senior Unity engineer + Backend engineer + Frontend engineer  
**Source repository**: https://github.com/adammyhre/Unity-Multiplayer-Kart  

---

## ROLE

You are a senior Unity multiplayer engineer and WebGL deployment specialist.  
Your task is to integrate the Unity Multiplayer Kart game as a fully functional  
mini-game module inside the Cospira social platform.

The source repository is the **single source of truth** for all gameplay logic.  
You are building a shell around it — not rebuilding it.

---

## PART 1 — ABSOLUTE CONSTRAINTS

These rules override every other instruction in this document.  
Breaking any of these is a blocking defect.

### 1.1 Gameplay systems — do not touch

The following systems must remain exactly as authored in the repository:

| System | Files (do not modify) |
|---|---|
| Kart physics | `KartController.cs`, `KartMovement.cs` |
| Vehicle movement | `KartInput.cs`, `VehicleMovement.cs` |
| Powerup mechanics | `Powerup.cs`, `PowerupSpawner.cs` |
| Checkpoint detection | `CheckpointSystem.cs`, `Checkpoint.cs` |
| Lap counting | `LapCounter.cs`, `RaceManager.cs` |
| Collision handling | Unity physics layer config |
| Camera system | `KartCamera.cs`, `CameraController.cs` |
| Track logic | All scene geometry and trigger volumes |

**Forbidden**:
- Rewriting physics constants
- Altering speed, acceleration, or boost values
- Modifying powerup durations or effects
- Changing checkpoint or lap trigger logic

**Allowed**:
- Adding `MonoBehaviour` wrapper scripts that listen to existing events
- Injecting player metadata into existing `NetworkPlayer` objects
- Hooking into `RaceManager` events (`OnRaceStart`, `OnRaceEnd`, `OnLapComplete`)

---

### 1.2 Networking architecture — do not replace

The repository uses **Unity Netcode for GameObjects (NGO)** with the following architecture:

```
Host (server-authoritative)
  └─ NetworkManager
       ├─ NetworkObject spawning
       ├─ NetworkTransform synchronization
       └─ ClientRpc / ServerRpc message flow
```

**Forbidden**:
- Replacing NGO with Photon, Mirror, Fishnet, or any other networking library
- Rewriting synchronization logic
- Moving authority from server to client for any physics object

**Allowed**:
- Adding a relay connection via **Unity Gaming Services (UGS) Relay**
- Adding the Cospira session bridge as a thin wrapper over `NetworkManager`
- Injecting `CospiraPlayerData` as a custom `NetworkVariable` on `NetworkPlayer`

---

## PART 2 — NETWORKING ARCHITECTURE (PRODUCTION-GRADE)

> This section is the most critical in the document.  
> The original prompt specification skips it. Do not skip it.

### 2.1 The problem: WebGL + NAT

Unity WebGL builds cannot open raw UDP sockets. Netcode for GameObjects  
normally relies on Unity Transport (UDP). In a WebGL context behind a NAT  
router (which applies to almost all consumer players), direct peer connections  
will fail silently.

**Required solution**: Unity Gaming Services Relay

### 2.2 Required UGS services

Enable the following in your Unity Dashboard (https://cloud.unity.com):

| Service | Purpose |
|---|---|
| Unity Relay | TURN-style relay for WebGL-safe UDP tunnelling |
| Unity Lobby | Used only for internal session discovery (not exposed to Cospira UI) |
| Unity Authentication | Anonymous sign-in to obtain a UGS Player ID |

### 2.3 Connection flow

```
Cospira Room Host clicks "Start Race"
        │
        ▼
POST /api/game/start  ──► Game Launcher Service
        │                        │
        │                        ▼
        │               UGS Lobby.CreateLobbyAsync()
        │               UGS Relay.CreateAllocationAsync(maxConnections: N)
        │               UGS Relay.GetJoinCodeAsync(allocationId)
        │                        │
        │                 { joinCode, lobbyId }
        │                        │
        ▼                        ▼
Cospira Room broadcasts joinCode to all players via WebSocket
        │
        ▼
Each player's Unity WebGL client:
  1. UnityServices.InitializeAsync()
  2. AuthenticationService.SignInAnonymouslyAsync()
     → maps UGS playerId to Cospira userId (see Part 4)
  3. Relay.JoinAllocationAsync(joinCode)
  4. NetworkManager.StartClient()
        │
        ▼
Host receives all ClientConnectedCallbacks
        │
        ▼
RaceManager.StartRace() is called by host when all players ready
        │
        ▼
Race runs — all state synchronized via NGO
```

### 2.4 Required packages (Unity Package Manager)

Add to `Packages/manifest.json`:

```json
{
  "com.unity.services.core": "1.12.5",
  "com.unity.services.authentication": "3.3.3",
  "com.unity.services.relay": "1.1.1",
  "com.unity.services.lobby": "1.2.2",
  "com.unity.netcode.gameobjects": "1.8.1",
  "com.unity.transport": "2.2.1"
}
```

Pin these versions exactly. Do not let Unity auto-upgrade them.

### 2.5 WebGL transport configuration

In `NetworkManager` inspector, set Transport to `UnityTransport`.  
In code, configure relay before starting host:

```csharp
// CospiraRelayBridge.cs (new wrapper script — do not modify existing files)
using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using Unity.Services.Relay;
using Unity.Services.Relay.Models;

public class CospiraRelayBridge : MonoBehaviour
{
    public static async Task<string> StartHostWithRelay(int maxPlayers)
    {
        Allocation allocation = await RelayService.Instance
            .CreateAllocationAsync(maxPlayers);

        string joinCode = await RelayService.Instance
            .GetJoinCodeAsync(allocation.AllocationId);

        var transport = NetworkManager.Singleton
            .GetComponent<UnityTransport>();

        transport.SetRelayServerData(
            allocation.RelayServer.IpV4,
            (ushort)allocation.RelayServer.Port,
            allocation.AllocationIdBytes,
            allocation.Key,
            allocation.ConnectionData
        );

        NetworkManager.Singleton.StartHost();
        return joinCode; // send to Cospira backend
    }

    public static async Task JoinWithRelay(string joinCode)
    {
        JoinAllocation join = await RelayService.Instance
            .JoinAllocationAsync(joinCode);

        var transport = NetworkManager.Singleton
            .GetComponent<UnityTransport>();

        transport.SetRelayServerData(
            join.RelayServer.IpV4,
            (ushort)join.RelayServer.Port,
            join.AllocationIdBytes,
            join.Key,
            join.ConnectionData,
            join.HostConnectionData
        );

        NetworkManager.Singleton.StartClient();
    }
}
```

---

## PART 3 — COSPIRA PLATFORM ARCHITECTURE

### 3.1 System map

```
Cospira Web App (React)
  │
  ├─ Room System (WebSocket — existing)
  │     └─ CospiraRoomClient.ts
  │
  ├─ Game Launcher UI (new React component)
  │     └─ KartLauncherPanel.tsx
  │
  └─ Game Frame (new React component)
        └─ <iframe src="/games/kart-racing/index.html" />
              │
              └─ postMessage API (bidirectional)
                    ├─ COSPIRA_LAUNCH  →  Unity receives join code
                    ├─ COSPIRA_READY   ←  Unity signals load complete
                    ├─ COSPIRA_RESULT  ←  Unity sends race results
                    └─ COSPIRA_EXIT    ←  Unity signals return to room
```

### 3.2 postMessage contract

All messages cross the iframe boundary using `window.postMessage`.  
Both sides must validate `event.origin` before processing.

#### Messages from Cospira → Unity

```typescript
// Sent after Unity signals COSPIRA_READY
interface LaunchPayload {
  type: "COSPIRA_LAUNCH";
  joinCode: string;       // UGS Relay join code
  isHost: boolean;        // true for room host only
  player: {
    userId: string;       // Cospira user ID
    username: string;
    avatarUrl: string;
    cosmetics?: {
      kartSkin?: string;
      trailEffect?: string;
    };
  };
}
```

#### Messages from Unity → Cospira

```typescript
// Unity WebGL build is loaded and UGS auth is complete
interface ReadyPayload {
  type: "COSPIRA_READY";
  ugsPlayerId: string;    // UGS anonymous player ID for mapping
}

// Sent at race end (position 1 = winner)
interface ResultPayload {
  type: "COSPIRA_RESULT";
  playerId: string;
  position: number;
  bestLapMs: number;
  totalTimeMs: number;
  checkpointsHit: number; // used for server-side anti-cheat
}

// User pressed "Return to Room" button in Unity overlay
interface ExitPayload {
  type: "COSPIRA_EXIT";
}
```

#### Unity-side listener (C# → JavaScript bridge)

```csharp
// CospiraJsBridge.cs (new wrapper — do not modify existing files)
using System.Runtime.InteropServices;

public class CospiraJsBridge : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void PostMessageToParent(string json);

    public static void SendReady(string ugsPlayerId)
    {
        var payload = JsonUtility.ToJson(new ReadyMsg {
            type = "COSPIRA_READY",
            ugsPlayerId = ugsPlayerId
        });
        PostMessageToParent(payload);
    }

    public static void SendResult(RaceResultData result)
    {
        PostMessageToParent(JsonUtility.ToJson(result));
    }

    public static void SendExit()
    {
        PostMessageToParent("{\"type\":\"COSPIRA_EXIT\"}");
    }
}
```

Add to `Assets/Plugins/WebGL/CospiradBridge.jslib`:

```javascript
mergeInto(LibraryManager.library, {
  PostMessageToParent: function(jsonPtr) {
    var json = UTF8ToString(jsonPtr);
    window.parent.postMessage(JSON.parse(json), "*");
  }
});
```

---

## PART 4 — PLAYER IDENTITY INTEGRATION

### 4.1 Identity mapping table

Store in your backend database. Created when `COSPIRA_READY` fires.

```sql
CREATE TABLE kart_identity_map (
  ugs_player_id   VARCHAR(64)  PRIMARY KEY,
  cospira_user_id VARCHAR(64)  NOT NULL,
  username        VARCHAR(64)  NOT NULL,
  avatar_url      TEXT,
  kart_skin       VARCHAR(64),
  trail_effect    VARCHAR(64),
  created_at      TIMESTAMP    DEFAULT NOW(),
  UNIQUE(cospira_user_id)
);
```

### 4.2 Identity injection into Unity

When Unity receives `COSPIRA_LAUNCH`, it must:

1. Store `LaunchPayload.player` in a singleton `CospiraSessionData`
2. On `NetworkManager.OnClientConnectedCallback`, inject metadata into the  
   spawned `NetworkPlayer` object via `ServerRpc`

```csharp
// CospiraPlayerInjector.cs (new wrapper — do not modify NetworkPlayer.cs)
public class CospiraPlayerInjector : MonoBehaviour
{
    void Start()
    {
        NetworkManager.Singleton.OnClientConnectedCallback += OnClientConnected;
    }

    private void OnClientConnected(ulong clientId)
    {
        if (!NetworkManager.Singleton.IsHost) return;

        // Host assigns Cospira metadata to this client's NetworkPlayer
        // NetworkPlayer already exists — we extend it, not replace it
        var player = GetNetworkPlayerForClient(clientId);
        if (player != null)
        {
            player.SetCospiraMetadataServerRpc(
                CospiraSessionData.Instance.GetPlayerData(clientId)
            );
        }
    }
}
```

---

## PART 5 — GAME LAUNCHER SERVICE (BACKEND)

### 5.1 Start race endpoint

```
POST /api/game/start
Authorization: Bearer <cospira_jwt>
Content-Type: application/json
```

Request body:
```json
{
  "roomId": "abc123",
  "game": "kart-race",
  "trackId": "track_01",
  "maxPlayers": 6,
  "players": [
    { "userId": "u_001", "username": "Mahesh", "avatarUrl": "https://..." },
    { "userId": "u_002", "username": "Priya",  "avatarUrl": "https://..." }
  ]
}
```

Response:
```json
{
  "gameSessionId": "kart_90821",
  "joinCode": "ABC12",
  "hostUserId": "u_001",
  "expiresAt": "2025-09-01T12:05:00Z"
}
```

**Backend responsibilities**:
1. Validate JWT. Confirm requesting user is room host.
2. Call UGS Relay API to create allocation + generate join code.
3. Store session in `kart_sessions` table (see below).
4. Broadcast `joinCode` to all players via existing room WebSocket channel.
5. Return response to host client only.

### 5.2 Session table

```sql
CREATE TABLE kart_sessions (
  session_id      VARCHAR(64)  PRIMARY KEY,
  room_id         VARCHAR(64)  NOT NULL,
  join_code       VARCHAR(16)  NOT NULL,
  host_user_id    VARCHAR(64)  NOT NULL,
  track_id        VARCHAR(64)  NOT NULL,
  max_players     INT          NOT NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'waiting',
    -- waiting | in_progress | completed | abandoned
  started_at      TIMESTAMP,
  ended_at        TIMESTAMP,
  created_at      TIMESTAMP    DEFAULT NOW()
);
```

### 5.3 Results endpoint

```
POST /api/game/results
Authorization: Bearer <cospira_jwt>
Content-Type: application/json
```

Request body:
```json
{
  "sessionId": "kart_90821",
  "results": [
    {
      "userId": "u_001",
      "position": 1,
      "bestLapMs": 92400,
      "totalTimeMs": 292000,
      "checkpointsHit": 24
    }
  ]
}
```

The backend must:
1. Validate that `checkpointsHit` equals the expected checkpoint count for the track.
2. Validate that `totalTimeMs` ≥ `(lapCount × minimumLapTime[trackId])`.
3. Reject any result where position ordering is inconsistent with total times.
4. Write validated results to `kart_results`.
5. Trigger XP/leaderboard update pipeline.

---

## PART 6 — ANTI-CHEAT VALIDATION

### 6.1 Server-side checkpoint ledger

The host (Unity) must emit a signed checkpoint event to the backend for each  
player each time they cross a checkpoint. This is separate from race results.

```
POST /api/game/checkpoint
{
  "sessionId": "kart_90821",
  "userId": "u_001",
  "checkpointIndex": 3,
  "timestampMs": 14320,
  "sequenceHash": "<HMAC of previous checkpoint + current index + sessionId>"
}
```

The `sequenceHash` is computed in the **host** (not clients) to prevent  
client-side tampering. Use a session-scoped secret exchanged at session start.

### 6.2 Validation rules at result submission

| Rule | Check |
|---|---|
| Checkpoint order | `checkpointIndex` must be monotonically increasing per player |
| Lap completion | Each lap requires all `N` checkpoints before incrementing lap count |
| Minimum lap time | `lapTimeMs >= minLapTime[trackId]` — stored server-side, never client |
| Position consistency | Final positions must sort by ascending `totalTimeMs` |
| Checkpoint count | `checkpointsHit` in result must equal `checkpointEvents` received for that player |

### 6.3 What this prevents

| Attack | Mitigation |
|---|---|
| Position spoofing | Server derives position from times, never trusts client-reported position |
| Lap skipping | Lap only completes when all checkpoint events are received in order |
| Speed hack | Minimum lap time check catches impossibly fast times |
| Packet injection | `sequenceHash` chain invalidates injected or replayed checkpoint events |

---

## PART 7 — REACT INTEGRATION (FRONTEND)

### 7.1 Component structure

```
src/
  components/
    game/
      KartLauncherPanel.tsx     ← "Start Race" button + player ready list
      KartGameFrame.tsx         ← iframe wrapper + postMessage handler
      KartResultsOverlay.tsx    ← post-race leaderboard shown over room
  hooks/
    useKartSession.ts           ← session state machine
  types/
    kart.ts                     ← shared TypeScript interfaces
```

### 7.2 KartGameFrame component

```tsx
// KartGameFrame.tsx
import { useEffect, useRef } from "react";
import type { LaunchPayload, ResultPayload } from "@/types/kart";

interface Props {
  joinCode: string;
  isHost: boolean;
  player: LaunchPayload["player"];
  onResult: (result: ResultPayload) => void;
  onExit: () => void;
}

export function KartGameFrame({
  joinCode, isHost, player, onResult, onExit
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const GAME_ORIGIN = process.env.NEXT_PUBLIC_GAME_ORIGIN ?? "";

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== GAME_ORIGIN) return; // strict origin check

      const msg = event.data;
      if (msg.type === "COSPIRA_READY") {
        // Unity is loaded — send the join payload
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "COSPIRA_LAUNCH",
            joinCode,
            isHost,
            player,
          } satisfies LaunchPayload,
          GAME_ORIGIN
        );
      }
      if (msg.type === "COSPIRA_RESULT") onResult(msg);
      if (msg.type === "COSPIRA_EXIT") onExit();
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [joinCode, isHost, player, onResult, onExit]);

  return (
    <iframe
      ref={iframeRef}
      src="/games/kart-racing/index.html"
      style={{ width: "100%", height: "100%", border: "none" }}
      allow="autoplay; fullscreen"
      sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      title="Kart Racing"
    />
  );
}
```

### 7.3 Session state machine

```
idle
  │  host clicks Start Race
  ▼
creating_session  (POST /api/game/start)
  │  joinCode received
  ▼
waiting_for_players  (all players shown "Ready" toggle)
  │  all ready OR host force-starts
  ▼
launching  (iframe mounts, COSPIRA_READY received)
  │
  ▼
in_race  (COSPIRA_LAUNCH sent)
  │  COSPIRA_RESULT received
  ▼
results  (KartResultsOverlay shown)
  │  user dismisses / COSPIRA_EXIT received
  ▼
idle
```

---

## PART 8 — UNITY WEBGL BUILD CONFIGURATION

### 8.1 Build settings

| Setting | Value | Reason |
|---|---|---|
| Compression | Brotli | Smallest build size for HTTP/2 servers |
| Linker target | IL2CPP | Required for WebGL |
| Exception support | Explicitly Thrown Only | Reduces build size |
| Strip engine code | Enabled | Remove unused Unity modules |
| WebGL memory size | 512 MB initial | Adequate for NGO + physics |
| Run in background | Enabled | Keep networking alive when tab unfocused |
| Multithreading | Disabled | WebGL does not support threads |

### 8.2 Required texture compression

Apply to all non-UI textures:
- **Format**: ASTC 6×6 (best size/quality for WebGL)
- **Mip maps**: Enabled
- **Max size**: 1024px for track textures, 512px for kart textures

### 8.3 Build size budget

| Asset category | Budget |
|---|---|
| Unity runtime (WASM) | ≤ 25 MB |
| Game code (IL2CPP) | ≤ 15 MB |
| Track + environment | ≤ 40 MB |
| Kart models + textures | ≤ 20 MB |
| Audio | ≤ 20 MB |
| UGS SDK overhead | ≤ 10 MB |
| **Total** | **≤ 130 MB** |

Stay under 130 MB to leave headroom for future content.

### 8.4 Output structure

```
/games/kart-racing/
  ├── index.html
  ├── Build/
  │     ├── kart-racing.wasm.br
  │     ├── kart-racing.framework.js.br
  │     ├── kart-racing.data.br
  │     └── kart-racing.loader.js
  └── TemplateData/
        └── style.css  (minimal — Cospira controls the outer UI)
```

Serve with the following response headers (required for Brotli + SharedArrayBuffer):

```
Content-Encoding: br
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## PART 9 — SESSION LIFECYCLE & DISCONNECTION HANDLING

### 9.1 Normal flow

```
Host ends race → RaceManager.OnRaceEnd fires
     │
     ├─ Unity: CospiraJsBridge.SendResult() for each player
     ├─ Backend: /api/game/results validates and stores results
     └─ Unity: CospiraJsBridge.SendExit() after results confirmed
           │
           └─ React: unmount iframe, show KartResultsOverlay
```

### 9.2 Host disconnection

If the host drops during a race:

1. NGO fires `OnClientDisconnectCallback` on all clients.
2. `CospiraDisconnectHandler.cs` (new wrapper) detects host loss.
3. Unity sends `{ type: "COSPIRA_EXIT", reason: "host_disconnected" }` via postMessage.
4. React unmounts iframe and shows "Race ended — host disconnected" in the room.
5. Backend sets `kart_sessions.status = 'abandoned'`.

**Do not attempt mid-race host migration** in v1. It requires transferring  
NGO authority and is out of scope. Mark the session abandoned.

### 9.3 Client disconnection

If a non-host client drops:

1. `NetworkManager.OnClientDisconnectCallback` fires on host.
2. Host broadcasts `PlayerDisconnected(clientId)` via `ClientRpc`.
3. Remaining clients hide that player's kart (already handled by NGO object  
   despawn, no additional code needed).
4. Race continues for remaining players.
5. Disconnected client's result is recorded as DNF (`position: 0`).

### 9.4 Session timeout

If `COSPIRA_RESULT` is not received within 10 minutes of `started_at`,  
the backend marks the session `abandoned` and the join code expires.

---

## PART 10 — PERFORMANCE REQUIREMENTS

### 10.1 Runtime targets

| Metric | Target | Hard limit |
|---|---|---|
| Frame rate | 60 FPS | ≥ 30 FPS (degrade gracefully) |
| Initial load time | ≤ 8 s on 20 Mbps | ≤ 15 s |
| Multiplayer latency tolerance | ≤ 150 ms RTT | ≤ 250 ms (warn user above) |
| Memory usage (WASM heap) | ≤ 512 MB | ≤ 768 MB |
| NGO send rate | 20 Hz position updates | Configurable per `NetworkTransform` |

### 10.2 NGO optimization

Reduce packet volume without touching gameplay:

```csharp
// In NetworkTransform components on kart prefabs:
// Do not modify KartController.cs — configure in inspector

Interpolate: true
UseUnreliableDeltas: true  // position updates via unreliable channel
SyncPositionX/Y/Z: true
SyncRotationX: false        // karts don't roll
SyncRotationY: true
SyncRotationZ: false        // karts don't roll
SyncScaleX/Y/Z: false       // scale never changes
```

---

## PART 11 — ENVIRONMENT & TOOLING

### 11.1 Unity version

**Unity 2022.3 LTS** — required for:
- NGO 1.8.x compatibility
- WebGL IL2CPP stability
- UGS SDK support

Do not use Unity 6 in v1. WebGL WASM threading support is still maturing.

### 11.2 Required environment variables

**Unity build** (`Assets/Resources/CospiraConfig.json`):

```json
{
  "ugsProjectId": "<from Unity Dashboard>",
  "ugsEnvironment": "production",
  "cospiraApiBase": "https://api.cospira.io",
  "gameOrigin": "https://cospira.io"
}
```

**Cospira backend** (`.env`):

```
UGS_SERVICE_ACCOUNT_KEY_ID=<from Unity Dashboard>
UGS_SERVICE_ACCOUNT_SECRET_KEY=<from Unity Dashboard>
UGS_PROJECT_ID=<from Unity Dashboard>
UGS_ENVIRONMENT=production
KART_MIN_LAP_TIME_MS_TRACK_01=45000
KART_CHECKPOINT_COUNT_TRACK_01=12
KART_JOIN_CODE_EXPIRY_SECONDS=600
ALLOWED_GAME_ORIGIN=https://cospira.io
```

---

## PART 12 — TESTING CHECKLIST

Do not ship until every item below passes.

### Functional
- [ ] Host can start a race from room; all players receive join code automatically
- [ ] All players connect to the relay and appear in the Unity session
- [ ] Race starts when all players are ready OR host force-starts
- [ ] Kart physics, powerups, checkpoints, and laps work identically to standalone build
- [ ] Race results are sent, validated, and stored correctly
- [ ] Unity overlay shows correct Cospira usernames and avatars
- [ ] All players return to room after race ends
- [ ] "Return to Room" button works at any time during the race

### Resilience
- [ ] Host disconnect abandons session cleanly; players return to room
- [ ] Client disconnect during race: race continues for others, DNF recorded
- [ ] Player who closes tab and reopens sees "Race in progress" in the room (no crash)
- [ ] Join code expiry: player attempting to join after expiry sees a clear error

### Anti-cheat
- [ ] Submitting a result with incorrect checkpoint count is rejected (HTTP 400)
- [ ] Submitting an impossibly fast lap time is rejected (HTTP 400)
- [ ] Submitting out-of-order positions is rejected (HTTP 400)

### Performance
- [ ] Build size ≤ 130 MB (verify with `du -sh /games/kart-racing/Build/`)
- [ ] 60 FPS stable on Chrome 120+ (Windows, Mac) with 6 players connected
- [ ] Initial load ≤ 8 s on simulated 20 Mbps (Chrome DevTools throttle)
- [ ] Memory usage stays below 512 MB after 3 consecutive races

### Security
- [ ] `event.origin` check in `KartGameFrame.tsx` blocks messages from wrong origins
- [ ] `postMessage` payloads are schema-validated before use
- [ ] `/api/game/start` rejects requests from non-host users
- [ ] `/api/game/results` rejects results for sessions not owned by the submitting user

---

## PART 13 — SUCCESS CRITERIA

The integration is complete and shippable when:

1. A user in a Cospira room can click **Start Race**, and all room members  
   automatically join the race without manual lobby steps.
2. The race runs with full multiplayer synchronization via Unity Relay.
3. Kart physics, powerups, and lap logic are byte-for-byte identical to the  
   source repository's standalone build.
4. Race results are validated server-side and stored. XP/leaderboard hooks fire.
5. All players return to the Cospira room after the race via `COSPIRA_EXIT`.
6. All items in the Part 12 testing checklist pass.
7. WebGL build is ≤ 130 MB and loads in ≤ 8 seconds on a 20 Mbps connection.

---

*End of specification.*
