# Cospira Vision: 10/10 State

## The North Star

**Cospira is not meetings. Cospira is presence.**

We are building a system where:

- **Presence > Calls**: It's not about calling someone; it's about being in the same space.
- **Rooms > Links**: Rooms are persistent, living entities, not transient URLs.
- **Control > Chaos**: The server is authoritative. The experience is curated.
- **Calm > Noise**: Design is premium, alive, but never overwhelming.
- **System > App**: A portable core that powers Web, Desktop, and Mobile.

## Core Pillars

### 1. Code Quality (Boring & Predictable)

- STRICT TypeScript. No `any`. No warnings.
- Logic separated from UI (`/domains` vs `/ui`).
- enforced by CI/CD gates.

### 2. Architecture (Event-Driven & Domain-Centric)

- `src/domains/` isolates business logic (Auth, Rooms, Media).
- `src/core/` contains pure logic.
- `src/adapters/` handles platform specifics.

### 3. Security (Server is Law)

- Zero trust on client inputs.
- Zod schemas for every contract.
- Rate limiting and abuse prevention at the edge.

### 4. Scalability (Horizontal & Resilient)

- Stateless Backends.
- Redis for everything specific state.
- Mediasoup SFU for massive scaling.

### 5. UX Polish (Alive & Premium)

- "Idle ≠ Dead". The interface breathes.
- Micro-interactions for every action.
- Glassmorphism, smooth gradients, perfect typography.

## Implementation Strategy

One Core. Multiple Shells.

- **Web**: Vital, accessible.
- **Desktop**: Tauri-based, native power.
- **Mobile**: Native feel, battery aware.

---

_Created by Antigravity Agent - 2026_
