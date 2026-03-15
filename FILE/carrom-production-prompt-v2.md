# PRODUCTION PROMPT — Carrom Real-Time Multiplayer Integration into Cospira
## Version 2.0 | Complete Specification

---

## ROLE & CONTEXT

You are a senior full-stack game engineer integrating a **production-grade Carrom board game module** into the **Cospira collaboration platform**.

Your goals:
1. Replicate gameplay mechanics from the reference repository **exactly** — no rule alterations.
2. Build a **deterministic, bit-identical, host-authoritative physics simulation** that prevents desync between clients.
3. Produce a **secure, cheat-resistant multiplayer module** that operates inside Cospira rooms while voice chat and messaging remain active.
4. Deliver code that is testable, observable, and extensible to future games (Ludo, Chess, Connect4).

Reference repository (audit only — do not copy Unity/C# code verbatim):
```
https://github.com/Th0masCat/carrom-game-unity.git
```

---

## TECH STACK CONSTRAINTS

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Frontend | React 18 + TypeScript 5 (strict mode, `noImplicitAny: true`) |
| Styling | TailwindCSS v3 |
| Transport | Cospira WebSocket infrastructure |
| Physics | matter.js 0.19.x (pinned version) |
| State Hash | xxhash (fast non-cryptographic, for desync detection) |
| Auth tokens | Existing Cospira JWT infrastructure |
| Testing | Jest 29, React Testing Library 14, Playwright 1.40 |

**Performance targets (non-negotiable):**
- 60 FPS rendering on mid-range hardware (Chrome, Safari, Firefox latest)
- ≤ 50ms input-to-visual latency (local echo)
- ≤ 2KB per WebSocket event payload (gzipped)
- Physics batch: 1000 fixed-step updates < 100ms on Node.js 20

**TypeScript rules (enforced via ESLint + tsconfig):**
- `strict: true`
- No `any` — use `unknown` + type guards
- No `@ts-ignore` without a tracked justification comment
- All public interfaces documented with JSDoc

---

## PHASE 1 — REPOSITORY AUDIT

Clone the repository and perform full static analysis before writing any implementation code.

### Deliverable

`/docs/adr/001-carrom-source-analysis.md`

### Audit must identify and document

**Game objects:**
- Carrom board (dimensions, pocket positions, wall normals)
- Striker (radius, mass, restitution, initial placement baseline)
- White coins × 8 (radius, mass, restitution)
- Black coins × 8 (radius, mass, restitution)
- Red queen × 1 (radius, mass, restitution, center position)
- Coin formation layout (exact x/y offsets from center)

**Unity systems to port:**
- Rigidbody2D physics parameters (mass, drag, angularDrag, restitution per object)
- Coin collision detection logic
- Pocket detection threshold (distance to pocket center)
- ScoreManager state machine
- Timer countdown logic
- EnemyAI targeting algorithm

**Player input mapping:**
- `OnMouseDown()` → drag start position
- `OnMouseDrag()` → current drag vector (angle + magnitude)
- `OnMouseUp()` → shot release (convert drag to force vector)
- Maximum drag distance (caps shot power)

**Unity dependencies requiring web substitution:**
- `Rigidbody2D` → matter.js `Body`
- `Physics2D.OverlapCircle` → matter.js collision events
- `Time.fixedDeltaTime` → fixed 1/60s timestep loop
- `GameObject.SetActive(false)` → `pocketed: true` flag + renderer removal

Document every substitution decision with rationale in the ADR.

---

## PHASE 2 — DETERMINISTIC PHYSICS CONTRACT

> **This is the most critical section.** Multiplayer carrom will desync if physics is not bit-identical across host and client replays. Every decision here must be deliberate.

### 2.1 Fixed-Point Physics Rule

All physics coordinates and velocities MUST be stored and transmitted as **integer fixed-point** values (multiply by 1000, round, store as integers). Never transmit or compare raw IEEE 754 floats for game state.

```typescript
// Fixed-point helpers — no floating point in game state
const SCALE = 1000

export const toFixed = (n: number): number => Math.round(n * SCALE)
export const fromFixed = (n: number): number => n / SCALE

// All positions in GameState use FixedPoint
type FixedPoint = number // integer, representing value * 1000
```

### 2.2 Fixed Timestep Loop

The physics simulation runs at exactly **60Hz** with a fixed delta of `1/60` seconds regardless of wall-clock drift. The host is the sole runner of the authoritative physics loop.

```typescript
const FIXED_DELTA = 1 / 60        // seconds
const MAX_STEPS_PER_FRAME = 5     // prevents spiral of death

class PhysicsLoop {
  private accumulator = 0
  private lastTime = 0

  tick(now: number, simulate: () => void): void {
    const elapsed = Math.min((now - this.lastTime) / 1000, 0.25)
    this.lastTime = now
    this.accumulator += elapsed
    let steps = 0
    while (this.accumulator >= FIXED_DELTA && steps < MAX_STEPS_PER_FRAME) {
      simulate()
      this.accumulator -= FIXED_DELTA
      steps++
    }
  }
}
```

### 2.3 Determinism Seed

matter.js uses `Math.random()` internally in some paths. Patch it at module load time with a seeded PRNG (xorshift32) initialized from `roomId`:

```typescript
import { createHash } from 'crypto'

export function seedMathRandom(roomId: string): void {
  const seed = parseInt(createHash('sha256').update(roomId).digest('hex').slice(0, 8), 16)
  let state = seed >>> 0
  Math.random = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0xFFFFFFFF
  }
}
```

### 2.4 State Hash for Desync Detection

After every physics step, compute a fast hash of all coin positions + velocities. Host includes this hash in every `SHOT_RESULT` broadcast. Clients verify their locally-interpolated state matches.

```typescript
import xxhash from 'xxhashjs'

export function hashGameState(state: GameState): number {
  const parts: number[] = state.coins.flatMap(c => [
    c.position.x, c.position.y,
    c.velocity.x, c.velocity.y,
    c.pocketed ? 1 : 0
  ])
  const buf = Buffer.from(new Int32Array(parts).buffer)
  return xxhash.h32(buf, 0xABCD).toNumber()
}
```

If a client detects a hash mismatch, it MUST request `STATE_SYNC` immediately and log the discrepancy with the full state snapshot for debugging.

### 2.5 Physics Parameters (from repository audit)

All values below must be confirmed/updated during the Phase 1 audit. These are the authoritative defaults:

```typescript
export const PHYSICS_CONSTANTS = {
  BOARD_WIDTH: 740,           // px (logical units)
  BOARD_HEIGHT: 740,
  POCKET_RADIUS: 28,          // detection threshold
  POCKET_POSITIONS: [         // [x, y] logical units
    [38, 38], [702, 38], [38, 702], [702, 702]
  ],
  WALL_RESTITUTION: 0.6,
  COIN_RADIUS: 16,
  COIN_MASS: 1,
  COIN_RESTITUTION: 0.5,
  COIN_FRICTION: 0.01,
  COIN_FRICTIONAIR: 0.02,
  STRIKER_RADIUS: 22,
  STRIKER_MASS: 2,
  STRIKER_RESTITUTION: 0.5,
  STRIKER_FRICTION: 0.01,
  STRIKER_FRICTIONAIR: 0.015,
  MAX_SHOT_FORCE: 0.08,       // matter.js force units
  MIN_VELOCITY_THRESHOLD: 0.01, // below this = coin at rest
} as const
```

---

## PHASE 3 — CANONICAL DATA MODEL

All types live in `/cospira/modules/games/carrom/types.ts`. No `any`. Every field documented.

```typescript
/** Logical units, fixed-point (integer = real value × 1000) */
type FixedPoint = number

interface Vector2 {
  x: FixedPoint
  y: FixedPoint
}

type PlayerId = string
type RoomId = string
type SequenceId = number

type CoinColor = 'white' | 'black' | 'queen'

interface Coin {
  /** Unique stable ID, e.g. "white-1" through "white-8" */
  id: string
  color: CoinColor
  position: Vector2
  velocity: Vector2
  /** Once pocketed, coin is removed from physics world */
  pocketed: boolean
}

interface Striker {
  position: Vector2
  velocity: Vector2
  /** 0–1 normalised shot power derived from drag distance */
  power: number
  /** Radians, 0 = right */
  angle: number
}

type CoinAssignment = Record<PlayerId, CoinColor>

type QueenStatus =
  | 'on_board'
  | 'pocketed_needs_cover'  // queen pocketed, awaiting cover coin this turn
  | 'covered'               // queen successfully covered, scored

interface PlayerState {
  id: PlayerId
  score: number
  /** Coins remaining on board that belong to this player */
  remainingCoins: number
  isAI: boolean
  /** Wall-clock ms when player joined room (used for host migration) */
  joinTimestamp: number
  /** Whether this player is currently connected */
  connected: boolean
}

interface GameState {
  roomId: RoomId
  players: PlayerState[]
  coins: Coin[]
  striker: Striker
  currentTurn: PlayerId
  /** Countdown in whole seconds */
  timer: number
  gameStatus: 'WAITING' | 'ACTIVE' | 'PAUSED' | 'COMPLETE'
  winnerId: PlayerId | null
  queenStatus: QueenStatus
  /** Which color each player controls (set after first pocket) */
  coinAssignment: CoinAssignment
  /** Who is currently the authoritative host */
  hostId: PlayerId
  /** Monotonically increasing, incremented on every state-changing event */
  sequenceId: SequenceId
  /** xxhash of coin positions+velocities after last physics step */
  stateHash: number
}
```

---

## PHASE 4 — COMPLETE CARROM GAME RULES

These rules are law. The engine must enforce every one of them exactly.

### 4.1 Board Setup

- 8 white coins, 8 black coins, 1 red queen arranged in a specific center formation.
- Formation: queen at dead center; white and black coins in concentric ring pattern (exact pixel offsets from audit).
- Striker placed on the baseline (bottom of board) within the two circles.
- Starting player determined by coin toss (random at game start).

### 4.2 Objective

Pocket all coins of your assigned color, then cover the queen. First player to achieve this wins. If time expires, player with highest score wins.

### 4.3 Coin Assignment

- No color is assigned at game start.
- The color of the **first coin a player pockets** becomes their assigned color.
- If a player pockets the queen as their first coin:
  - Queen returns to center (cannot assign via queen).
  - Player continues their turn.
- Assignment is permanent once set.
- If both players have pocketed only opponent coins so far, assignment flips (opponent gets the color that was pocketed).

### 4.4 Striker Mechanics

- Player drags striker backward within the baseline channel (constrained to horizontal sliding).
- An aimline (ghost line) extends from striker through the drag vector to indicate shot direction.
- `shotForce = dragDistance / maxDragDistance * MAX_SHOT_FORCE`
- On release, striker is given an impulse in the aim direction with the computed force.
- Striker must completely return to rest before next shot is valid.

### 4.5 Physics Rules

- All coins and striker obey rigid-body physics with the constants from Phase 2.5.
- Coins collide with each other, with the striker, and bounce off the four inner walls.
- Coins that cross a pocket threshold (distance to pocket center < `POCKET_RADIUS`) are immediately removed from the physics world and flagged `pocketed: true`.
- The board surface applies friction (`COIN_FRICTIONAIR`) causing all objects to decelerate to rest.

### 4.6 Turn End Conditions

**Turn continues** (same player shoots again) if:
- At least one coin of the player's own color was pocketed this turn AND no foul occurred.

**Turn passes** to opponent if:
- No coin was pocketed.
- A foul was committed (see 4.8).
- Only opponent coins were pocketed (and no own coins were pocketed).

### 4.7 Scoring

| Event | Points awarded |
|---|---|
| Own coin pocketed | +1 to self |
| Opponent coin pocketed | +1 to opponent (their coin, their point) |
| Queen covered | +3 to covering player |
| Striker foul | −1 to fouling player |
| Opponent pockets your queen before cover | −3 penalty |

> Note: Opponent coins accidentally pocketed are scored for the opponent, not against the shooter.

### 4.8 Fouls

A foul is committed if ANY of the following occur in a single shot:

1. **Striker pocketed** — striker falls into any corner pocket.
2. **Last coin pocketed without queen cover** — player pockets their final coin before queen is covered.
3. **Queen pocketed but cover fails** — player pockets queen, then fails to pocket an own coin on the same turn.
4. **Striker leaves board** — striker exits the playable surface.
5. **Shot not crossing baseline** — striker does not cross the baseline before hitting coins.

**Foul penalty:**
- Player forfeits turn.
- Player returns one previously pocketed coin of their color to board center.
- If player has no pocketed coins, no coin returned but turn is still forfeited.

### 4.9 Queen Rule (detailed)

1. Queen can be pocketed by either player at any time.
2. When the queen is pocketed, `queenStatus` = `'pocketed_needs_cover'`.
3. The player who pocketed the queen **must** pocket one of their own coins **on the same turn** (the cover).
4. If the cover succeeds: `queenStatus` = `'covered'`, player earns queen points (+3).
5. If the cover fails (turn ends without pocketing own coin): queen is returned to board center, `queenStatus` = `'on_board'`, no points awarded.
6. A player may not pocket the queen if they have no coins on the board.

### 4.10 AI Turn Rule

The AI replicates the enemy AI from the repository. Implementation steps:

1. Filter coins on board to coins belonging to AI's assigned color.
2. Select target coin = coin with shortest Euclidean distance to nearest pocket.
3. Compute ideal striker position on baseline to create a straight-line path: `striker → target coin → pocket`.
4. Clamp striker position to baseline constraints.
5. Compute required angle and force using inverse kinematics.
6. Apply a small Gaussian noise offset to angle (σ = 0.03 rad) and force (σ = 0.005) to simulate imperfection.
7. Emit a `PLAYER_SHOT` event exactly as a human player would.
8. AI waits until `allCoinsAtRest()` before taking another turn.

### 4.11 Game Timer

- Game clock starts when `gameStatus` transitions to `'ACTIVE'`.
- Duration: **120 seconds**.
- Timer is decremented on the host only; the authoritative value is included in every broadcast.
- On expiry: `gameStatus` = `'COMPLETE'`, `winnerId` = player with higher score. On tie: player who had the most recent successful pocket wins.

### 4.12 Win Condition

A player wins immediately (before timer) if:
- All coins of their assigned color are pocketed.
- The queen has been covered (`queenStatus === 'covered'`).

---

## PHASE 5 — MODULAR ENGINE ARCHITECTURE

### Directory structure

```
/cospira/modules/games/carrom/
  engine/
    CarromEngine.ts          # Orchestrates all engine modules
    PhysicsController.ts     # matter.js wrapper, deterministic loop
    TurnManager.ts           # Turn state machine
    ScoreManager.ts          # Scoring + foul detection
    RuleEngine.ts            # Pure rule validation (no side effects)
    AIController.ts          # Enemy AI targeting logic
    StateHasher.ts           # xxhash of game state
  transport/
    GameEventSerializer.ts   # Serialize/deserialize GameEvent<T>
    EventValidator.ts        # Validate events before processing
  ui/
    CarromBoard.tsx          # Main React component (board + coins + striker)
    StrikerController.tsx    # Drag input handler
    CoinRenderer.tsx         # Individual coin + queen
    ScorePanel.tsx           # Score + timer display
    SpectatorOverlay.tsx     # View-only overlay for spectators
  hooks/
    useCarromEngine.ts       # React hook bridging engine to UI
    useGameSocket.ts         # WebSocket subscription + event queue
  tests/
    physics.spec.ts
    rules.spec.ts
    engine.spec.ts
    ai.spec.ts
    multiplayer.spec.ts
    performance.spec.ts
  index.ts                   # Public API surface
```

### Design rules (enforced via lint)

- `engine/` modules: pure TypeScript, zero React imports, zero I/O.
- `transport/` modules: pure TypeScript, no React, no physics.
- `ui/` modules: React only, no direct physics calls (via hook only).
- No circular dependencies between layers.
- All engine functions must be pure (same input → same output, no hidden state mutation).
- Engine state is immutable: every function returns a new `GameState`, never mutates.

---

## PHASE 6 — GAME ENGINE ADAPTER

The adapter is the contract between Cospira's room system and this carrom module. Future games implement the same interface.

```typescript
interface GameEngineAdapter<TState, TEvent> {
  readonly gameId: string            // 'carrom'
  readonly minPlayers: number        // 2
  readonly maxPlayers: number        // 2
  readonly supportsSpectators: boolean // true

  /** Called once when the game room is created */
  initialize(roomId: RoomId, players: PlayerId[]): TState

  /**
   * Pure reducer: given current state + validated event,
   * returns next state. MUST be deterministic.
   */
  processEvent(state: TState, event: TEvent): TState

  /** Serialize state to a compact JSON string for broadcast */
  serialize(state: TState): string

  /** Deserialize + validate incoming state */
  deserialize(raw: string): TState

  /**
   * Returns list of action type strings the given player
   * may legally perform right now.
   */
  getValidActions(state: TState, playerId: PlayerId): string[]

  /** True if the game is in a terminal state (win or time-up) */
  isTerminal(state: TState): boolean

  /**
   * Returns a hash of the game state for desync detection.
   * Must be fast (< 1ms) and consistent.
   */
  hashState(state: TState): number
}
```

Carrom implements `GameEngineAdapter<GameState, GameEvent<unknown>>`.

---

## PHASE 7 — WEBSOCKET EVENT SCHEMA

### 7.1 Base event envelope

```typescript
interface GameEvent<T> {
  /** Schema version — bump on breaking change */
  version: '1.0'
  type: 'GAME_EVENT'
  game: 'carrom'
  roomId: RoomId
  /** JWT subject claim of the sender */
  senderId: PlayerId
  /** Monotonically increasing per-room counter */
  sequenceId: SequenceId
  /** Unix ms timestamp, set by host on emit */
  timestamp: number
  action: GameAction
  payload: T
}

type GameAction =
  | 'PLAYER_SHOT'
  | 'SHOT_RESULT'
  | 'COIN_POCKETED'
  | 'TURN_SWITCH'
  | 'FOUL'
  | 'QUEEN_POCKETED'
  | 'QUEEN_COVERED'
  | 'QUEEN_RETURNED'
  | 'GAME_OVER'
  | 'HOST_MIGRATED'
  | 'STATE_SYNC'
  | 'DESYNC_DETECTED'
  | 'TIMER_UPDATE'
```

### 7.2 Typed payloads per action

```typescript
interface PlayerShotPayload {
  angle: number          // radians
  power: number          // 0–1 normalised
  strikerPosition: Vector2
}

interface ShotResultPayload {
  /** Full physics snapshot after all coins come to rest */
  coins: Coin[]
  striker: Striker
  pocketedThisTurn: string[]   // coin IDs
  fouled: boolean
  turnContinues: boolean
  stateHash: number            // xxhash for client verification
}

interface StateSyncPayload {
  /** Complete serialized GameState */
  state: GameState
  reason: 'reconnect' | 'host_migration' | 'desync_recovery'
}

interface DesyncDetectedPayload {
  clientId: PlayerId
  clientHash: number
  hostHash: number
  sequenceId: SequenceId
}
```

### 7.3 Sequence ordering and buffering

```typescript
class EventQueue {
  private lastApplied = 0
  private buffer: Map<SequenceId, GameEvent<unknown>> = new Map()

  receive(event: GameEvent<unknown>): 'apply' | 'buffer' | 'drop' | 'request_sync' {
    if (event.sequenceId <= this.lastApplied) return 'drop'
    if (event.sequenceId === this.lastApplied + 1) {
      this.lastApplied++
      this.drainBuffer()
      return 'apply'
    }
    if (event.sequenceId > this.lastApplied + 5) {
      // Gap too large — request full state sync
      return 'request_sync'
    }
    this.buffer.set(event.sequenceId, event)
    return 'buffer'
  }

  private drainBuffer(): void {
    while (this.buffer.has(this.lastApplied + 1)) {
      this.lastApplied++
      this.buffer.delete(this.lastApplied)
    }
  }
}
```

### 7.4 Rollback on desync

When a client detects a hash mismatch after applying `SHOT_RESULT`:

1. Client emits `DESYNC_DETECTED` with both hashes and the sequence ID.
2. Host logs the discrepancy (for debugging).
3. Host immediately broadcasts `STATE_SYNC` with `reason: 'desync_recovery'` and the authoritative `GameState`.
4. All clients discard their local state and replace with the sync payload.
5. Normal sequence ordering resumes from the sync's `sequenceId`.

---

## PHASE 8 — SECURITY MODEL

> **Security is not optional.** The host-authoritative model only works if clients cannot inject fraudulent game state.

### 8.1 Authentication

- Every WebSocket message must carry a valid Cospira JWT in the connection handshake header.
- The server extracts `sub` (PlayerId) from the JWT and uses it as the canonical `senderId`.
- Clients MUST NOT be trusted to self-report their `senderId`.

### 8.2 Action authorization

Before processing any `PLAYER_SHOT` event, the host MUST verify:

```typescript
function validateShot(state: GameState, event: GameEvent<PlayerShotPayload>): ValidationResult {
  // 1. Sender must be authenticated (JWT verified upstream)
  if (!isAuthenticated(event.senderId)) return { valid: false, reason: 'unauthenticated' }

  // 2. It must be the sender's turn
  if (state.currentTurn !== event.senderId) return { valid: false, reason: 'not_your_turn' }

  // 3. Game must be active
  if (state.gameStatus !== 'ACTIVE') return { valid: false, reason: 'game_not_active' }

  // 4. Shot parameters must be in legal range
  const { angle, power } = event.payload
  if (power < 0 || power > 1) return { valid: false, reason: 'invalid_power' }
  if (!isFinite(angle)) return { valid: false, reason: 'invalid_angle' }

  // 5. Rate limit: no more than 1 shot per (all_coins_at_rest + 500ms grace)
  if (!allCoinsAtRest(state)) return { valid: false, reason: 'coins_in_motion' }

  return { valid: true }
}
```

Invalid events are silently dropped with a server-side warning log. Never echo them back to the sender.

### 8.3 Rate limiting

- Max 1 `PLAYER_SHOT` per turn (enforced server-side).
- Max 10 `STATE_SYNC` requests per player per minute (prevent DoS via desync flooding).
- WebSocket message size hard cap: 4KB. Messages exceeding this are dropped and the connection is flagged.

### 8.4 Spectator isolation

- Spectators receive `SHOT_RESULT`, `STATE_SYNC`, `GAME_OVER`, and `TIMER_UPDATE` events only.
- Spectator connections are distinguished by role claim in JWT.
- Host server ignores `PLAYER_SHOT` from spectator connections entirely.

### 8.5 Host trust boundary

- The host runs the physics simulation authoritatively.
- Clients receive final coin positions from `SHOT_RESULT` only — they do not run physics for scoring purposes.
- Clients MAY run a local physics preview (for visual smoothness) but this preview result is NEVER used for game state.

---

## PHASE 9 — RENDERER REQUIREMENTS

### 9.1 CarromBoard.tsx

```typescript
// Performance contract:
// - Static layer (board texture + pocket circles) never re-renders
// - Dynamic layer re-renders only when coin positions change
// - Striker re-renders only during drag or motion
// - Score panel re-renders only on score change or timer tick

interface CarromBoardProps {
  gameState: GameState
  localPlayerId: PlayerId
  isSpectator: boolean
  onShot: (angle: number, power: number) => void
}
```

### 9.2 Rendering layers

```
Layer 1 (static, canvas or SVG, never re-renders):
  - Board wood texture
  - Inner play lines
  - Baseline circles
  - 4 corner pocket circles

Layer 2 (dynamic, re-renders on position change):
  - 17 coin sprites (color-coded circles with labels)
  - Queen coin (red, larger label)

Layer 3 (striker layer, re-renders on drag):
  - Striker circle
  - Aim guide line (ghost projection)
  - Power indicator arc

Layer 4 (UI overlay, React):
  - Score panel
  - Timer countdown
  - Turn indicator
  - Foul notification toast
  - Game over modal
```

Use `React.memo` on Layer 2 and 3 components with custom comparators comparing only position/velocity changes.

Use `useRef` + direct canvas/SVG manipulation for coin motion during physics playback to bypass React reconciliation entirely.

### 9.3 Animation pipeline

| Event | Animation |
|---|---|
| Shot fired | Striker moves forward with physics velocity |
| Coin collision | Coins separate with physics velocity |
| Coin pocketed | Coin shrinks to zero over 200ms, then removed |
| Queen pocketed | Queen flashes amber 3×, then shrinks |
| Foul | Red flash overlay on board for 600ms |
| Turn switch | Subtle arrow indicator slides to new player |
| Game over | Score reveal animation, winner highlight |

All animations use `requestAnimationFrame`. No CSS transitions for game objects (physics drives positions directly).

### 9.4 Local echo (lag compensation)

When the local player fires a shot:

1. Immediately start a local physics preview (non-authoritative).
2. Render coins moving per preview.
3. When `SHOT_RESULT` arrives from host, compare final positions.
4. If positions match within tolerance (±2px): do nothing (seamless).
5. If positions differ: smoothly lerp coins from preview positions to authoritative positions over 150ms.

---

## PHASE 10 — MULTIPLAYER HOST ARCHITECTURE

### 10.1 Host responsibilities

The host player's browser tab runs:
- The authoritative physics simulation loop (60Hz matter.js)
- The game timer countdown
- The event sequencer
- The `STATE_SYNC` broadcaster on reconnect/migration

### 10.2 Host migration

When the host disconnects:

```typescript
function selectNewHost(players: PlayerState[]): PlayerId {
  return players
    .filter(p => p.connected && !p.isAI)
    .sort((a, b) => a.joinTimestamp - b.joinTimestamp)[0].id
}
```

Migration sequence:

1. Server detects host WebSocket close (TCP close or ping timeout after 5s).
2. Server selects new host via `selectNewHost`.
3. Server broadcasts `HOST_MIGRATED` event with new `hostId` and the last known `GameState`.
4. New host client receives `HOST_MIGRATED`, starts physics loop, resumes timer.
5. All clients receive `STATE_SYNC` from new host within 2s of migration.
6. If new host cannot be determined (all players disconnected), game is suspended for up to 60s, then abandoned.

### 10.3 Reconnect recovery

When a player reconnects:

1. Player sends `STATE_SYNC` request with their last known `sequenceId`.
2. Host responds with `STATE_SYNC` payload (full `GameState`).
3. Client replaces local state with sync payload.
4. If reconnect occurs during motion (mid-shot), host waits until `allCoinsAtRest()` then sends sync.

---

## PHASE 11 — COSPIRA ROOM INTEGRATION

### Entry path

Room → Activities → Games → Carrom

### Layout (responsive, min-width 1024px)

```
┌────────────────────────────────────────────┐
│  [Voice panel — left, collapsible]         │
│  ┌──────────────────────────────────────┐  │
│  │          Score + Timer panel         │  │
│  ├──────────────────────────────────────┤  │
│  │                                      │  │
│  │         Carrom Board (square)        │  │
│  │                                      │  │
│  ├──────────────────────────────────────┤  │
│  │       Turn indicator / Action bar    │  │
│  └──────────────────────────────────────┘  │
│  [Chat panel — right, collapsible]         │
└────────────────────────────────────────────┘
```

- Voice and chat panels do not unmount during gameplay.
- Board is a square maintaining aspect ratio; scales down on smaller screens.
- Spectators see the board with a "SPECTATING" badge and the spectator overlay (no drag input).
- Game can be paused by mutual consent (both players click pause); AI games cannot be paused.

---

## PHASE 12 — COMPREHENSIVE TEST SPECIFICATION

All tests must run in CI. Coverage target: **80% line coverage** on `engine/` modules.

### 12.1 Unit tests — PhysicsController (`physics.spec.ts`)

```typescript
describe('PhysicsController', () => {
  describe('collision detection', () => {
    it('detects coin-to-coin collision and transfers momentum correctly', () => {
      // Setup: two coins approaching each other at known velocity
      // Assert: post-collision velocities match elastic collision formula ±0.5%
    })
    it('coin bounces off wall with correct restitution', () => {
      // Setup: coin moving toward left wall at known velocity
      // Assert: coin bounces at angle of incidence, speed * WALL_RESTITUTION
    })
    it('coins decelerate to rest via frictionAir', () => {
      // Setup: coin given initial velocity
      // Assert: after N steps, velocity < MIN_VELOCITY_THRESHOLD
    })
  })
  describe('pocket detection', () => {
    it('detects pocket when coin center is within POCKET_RADIUS', () => {
      // Setup: coin at pocket_x, pocket_y + POCKET_RADIUS - 1
      // Assert: isPocketed === true
    })
    it('does not detect pocket when coin is outside radius', () => {
      // Setup: coin at pocket_x, pocket_y + POCKET_RADIUS + 1
      // Assert: isPocketed === false
    })
    it('detects all four corner pockets', () => {
      // Test each pocket position
    })
  })
  describe('fixed timestep loop', () => {
    it('runs exactly N steps for N/60 seconds elapsed', () => { ... })
    it('does not exceed MAX_STEPS_PER_FRAME in a single tick', () => { ... })
  })
})
```

### 12.2 Unit tests — RuleEngine (`rules.spec.ts`)

```typescript
describe('RuleEngine', () => {
  describe('queen cover rule', () => {
    it('sets queenStatus to covered when own coin pocketed same turn as queen', () => {
      const state = buildState({ queenStatus: 'pocketed_needs_cover' })
      const next = applyPocketOwnCoin(state, 'white-1')
      expect(next.queenStatus).toBe('covered')
    })
    it('returns queen to center when turn ends without cover', () => {
      const state = buildState({ queenStatus: 'pocketed_needs_cover' })
      const next = endTurn(state) // no coin pocketed
      expect(next.queenStatus).toBe('on_board')
      expect(queenIsOnBoard(next)).toBe(true)
    })
    it('awards queen points only when covered', () => {
      const state = buildState({ queenStatus: 'pocketed_needs_cover', currentTurn: 'p1' })
      const next = applyPocketOwnCoin(state, 'white-1')
      expect(next.players.find(p => p.id === 'p1')!.score).toBe(3)
    })
  })
  describe('striker foul', () => {
    it('returns one pocketed coin to board on striker foul', () => {
      const state = buildState({ pocketedCoins: ['white-1'] })
      const next = applyStrikerFoul(state, 'p1')
      expect(coinsOnBoard(next)).toContain('white-1')
    })
    it('applies score penalty on striker foul', () => {
      const state = buildState({ players: [{ id: 'p1', score: 5 }] })
      const next = applyStrikerFoul(state, 'p1')
      expect(next.players.find(p => p.id === 'p1')!.score).toBe(4)
    })
    it('does not return coin if no coins pocketed yet', () => {
      const state = buildState({ pocketedCoins: [] })
      const next = applyStrikerFoul(state, 'p1')
      expect(coinsOnBoard(next).length).toBe(coinsOnBoard(state).length)
    })
  })
  describe('turn continuation', () => {
    it('continues turn when own coin pocketed', () => { ... })
    it('passes turn when no coin pocketed', () => { ... })
    it('passes turn on foul even if coin pocketed', () => { ... })
  })
  describe('coin assignment', () => {
    it('assigns white to player who pockets first white coin', () => { ... })
    it('does not assign via queen pocket', () => { ... })
    it('assigns remaining color to opponent automatically', () => { ... })
  })
  describe('win condition', () => {
    it('triggers win when all own coins pocketed and queen covered', () => { ... })
    it('does not trigger win if queen not covered', () => { ... })
    it('triggers timer win for highest score player', () => { ... })
    it('breaks timer tie by most recent successful pocket', () => { ... })
  })
})
```

### 12.3 Unit tests — AI (`ai.spec.ts`)

```typescript
describe('AIController', () => {
  it('selects the nearest coin to a pocket as target', () => { ... })
  it('computes striker position that aligns striker, target, and pocket', () => {
    // Assert the three points are collinear within 1 degree
  })
  it('applies Gaussian noise to angle and force', () => {
    // Run AI 100 times on same state, assert std deviation matches σ values
  })
  it('emits PLAYER_SHOT event in valid format', () => { ... })
  it('waits for all coins to rest before shooting', () => { ... })
})
```

### 12.4 Integration tests — full game (`multiplayer.spec.ts`)

```typescript
describe('Multiplayer integration', () => {
  it('completes a full 2-player game without desync', async () => {
    // Setup: 2 connected clients + host
    // Play 20 shots via AI
    // Assert: both clients arrive at identical final GameState
    // Assert: all stateHash values matched throughout
  })
  it('host migration preserves game state', async () => {
    // Setup: 2 clients, host = client1
    // Mid-game: disconnect client1
    // Assert: client2 becomes host within 5s
    // Assert: STATE_SYNC broadcast received
    // Assert: reconnected client1 receives STATE_SYNC
    // Assert: game continues to completion
  })
  it('rejects PLAYER_SHOT from wrong player', async () => {
    // Setup: it is p1's turn
    // p2 sends PLAYER_SHOT
    // Assert: event dropped, state unchanged, turn still p1
  })
  it('recovers from desync via STATE_SYNC', async () => {
    // Setup: manually corrupt one client's coin position
    // Trigger shot
    // Assert: client detects hash mismatch, emits DESYNC_DETECTED
    // Assert: host broadcasts STATE_SYNC
    // Assert: client state restored to match host
  })
  it('reconnecting player receives full state within 2s', async () => { ... })
})
```

### 12.5 Performance tests (`performance.spec.ts`)

```typescript
describe('Performance', () => {
  it('runs 1000 physics steps in under 100ms', () => {
    const engine = new PhysicsController()
    const state = engine.createInitialWorld()
    const t0 = performance.now()
    for (let i = 0; i < 1000; i++) engine.step(state)
    expect(performance.now() - t0).toBeLessThan(100)
  })
  it('hashState completes in under 1ms', () => {
    const state = buildFullGameState()
    const t0 = performance.now()
    hashGameState(state)
    expect(performance.now() - t0).toBeLessThan(1)
  })
  it('serialized PLAYER_SHOT payload is under 2KB', () => {
    const event = buildShotEvent()
    expect(Buffer.byteLength(JSON.stringify(event), 'utf8')).toBeLessThan(2048)
  })
  it('serialized SHOT_RESULT payload is under 2KB', () => { ... })
})
```

### 12.6 E2E tests — Playwright (`e2e/carrom.spec.ts`)

```typescript
test('two players can complete a game via browser UI', async ({ browser }) => {
  const p1 = await browser.newPage()
  const p2 = await browser.newPage()
  // Navigate both to same Cospira room
  // p1 drags and releases striker
  // Assert: both pages show coins moving
  // Assert: score updates on pocket
  // Play to completion, assert winner modal appears on both
})

test('spectator cannot interact with board', async ({ browser }) => {
  const spectator = await browser.newPage()
  // Join as spectator
  // Attempt to drag striker
  // Assert: no PLAYER_SHOT event emitted
})
```

---

## PHASE 13 — OBSERVABILITY & DEBUGGING

### Logging

All engine-layer events MUST emit structured logs:

```typescript
interface GameLogEntry {
  timestamp: number
  roomId: RoomId
  sequenceId: SequenceId
  action: GameAction
  playerId: PlayerId
  stateHashBefore: number
  stateHashAfter: number
  durationMs: number
  metadata?: Record<string, unknown>
}
```

Log levels:
- `DEBUG`: every physics step hash (dev only, never in prod)
- `INFO`: every `GameAction` with state hashes
- `WARN`: desync detection, host migration
- `ERROR`: authentication failures, invalid events, unhandled exceptions

### Desync forensics

When `DESYNC_DETECTED` is emitted, the host captures:
- Full `GameState` snapshot at the mismatched `sequenceId`
- The specific `PLAYER_SHOT` payload that triggered the divergence
- Both client and host state hashes

This is stored for 24h in a rolling debug buffer for post-incident analysis.

---

## PHASE 14 — FINAL DELIVERABLE CHECKLIST

Before marking this module production-ready, every item below must be satisfied:

**Correctness**
- [ ] All game rules from Phase 4 are implemented and covered by unit tests
- [ ] Queen cover rule tested with all edge cases (fail, succeed, queen as first coin)
- [ ] All foul types detected and penalized correctly
- [ ] Coin assignment logic handles all orderings of first pockets
- [ ] Win condition triggers correctly in both time-up and completion scenarios

**Determinism**
- [ ] Fixed-point arithmetic used for all transmitted state
- [ ] `Math.random` seeded from `roomId` before physics world creation
- [ ] State hash verified after every `SHOT_RESULT`
- [ ] Desync recovery tested with deliberate corruption

**Security**
- [ ] JWT verified on every event before processing
- [ ] `senderId` extracted from JWT, never from event payload
- [ ] Rate limiting tested: duplicate shots in same turn rejected
- [ ] Spectator isolation tested: UI drag disabled, server ignores shots

**Performance**
- [ ] 1000 physics steps < 100ms benchmark passing
- [ ] Event payloads < 2KB verified in tests
- [ ] React layer uses `React.memo` on coin/striker components
- [ ] No re-render storms confirmed via React DevTools profiler

**Multiplayer**
- [ ] Host migration tested with mid-game disconnect
- [ ] Reconnect recovery tested with varying gap sizes
- [ ] Out-of-order event buffering tested
- [ ] Full 2-player game simulation test (20+ shots, no desync)

**Integration**
- [ ] Voice and chat remain functional during gameplay (no interference)
- [ ] Spectators can watch without affecting game state
- [ ] E2E Playwright tests pass in CI on Chrome, Firefox, Safari

---

## APPENDIX A — KNOWN IMPLEMENTATION RISKS

| Risk | Likelihood | Mitigation |
|---|---|---|
| matter.js non-determinism across browsers | High | Fixed-point state, host-only physics, state hash verification |
| Host tab backgrounded → physics loop throttled | Medium | Use `setInterval` fallback + `document.visibilitychange` handler to warn user |
| Large `SHOT_RESULT` payload (17 coin positions) | Low | Fixed-point integers are compact; compress with msgpack if needed |
| AI too strong / too weak | Low | Configurable noise parameters (σ values) exposed as difficulty settings |
| WebSocket reconnect during mid-shot motion | Medium | Host waits for `allCoinsAtRest()` before responding to `STATE_SYNC` requests |

---

## APPENDIX B — GLOSSARY

| Term | Definition |
|---|---|
| Fixed-point | Integer representation of a decimal: `1234` means `1.234` (÷1000) |
| State hash | xxhash32 of all coin positions + velocities, used for desync detection |
| Cover | Pocketing an own coin on the same turn as the queen to claim queen points |
| Host | The player whose browser runs the authoritative physics simulation |
| Baseline | The horizontal line on the board within which the striker is positioned |
| Foul | An illegal play that forfeits the turn and triggers a penalty |
| At rest | All coins have velocity magnitude < `MIN_VELOCITY_THRESHOLD` |
