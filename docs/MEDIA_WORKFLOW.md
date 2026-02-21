## COSPIRA Media & Signaling Workflow (v1)

This document specifies the **unified protocol and flows** for audio/video and screen sharing
between COSPIRA clients (web and mobile) and the backend (API gateway + SFU service).

It is the single source of truth for:
- Socket.IO events and payloads
- Room and media lifecycle
- SFU (mediasoup) interactions

---

## 1. Architecture Overview

High-level components:

- **API Gateway**
  - Exposes HTTP APIs (e.g. `/api/create-room`, `/api/ice-servers`, `/api/turn-credentials`).
  - Hosts the Socket.IO server for signaling (namespace `/v1`).
  - Stateless aside from short-lived socket metadata.

- **Room Service**
  - Backed by Redis (or Redis Cluster).
  - Single source of truth for rooms and participants:
    - Room metadata (id, name, owner, locks, passwords).
    - Participant presence and media flags (audio/video/screen).

- **SFU Service (mediasoup)**
  - Manages mediasoup workers, routers, transports, producers, and consumers.
  - One router per room.
  - Receives normalized SFU commands from the gateway and returns SFU-specific data
    (rtpCapabilities, transport params, etc.).

- **Clients (Web & Mobile)**
  - Use the same **versioned Socket.IO protocol**.
  - Share a client core that handles signaling and SFU, with platform-specific media adapters:
    - Web: `navigator.mediaDevices`, HTMLMediaElement.
    - Mobile: `react-native-webrtc`, `RTCView`.

---

## 2. Common Data Models

These shapes are language-agnostic; concrete types should be defined in shared TypeScript
interfaces on both client and server.

### 2.1 Room

```ts
type RoomId = string;

interface Room {
  roomId: RoomId;
  name: string;
  createdBy: string; // userId
  isLocked: boolean;
  password?: string;
  maxParticipants?: number;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}
```

### 2.2 Participant

```ts
type UserId = string;

interface Participant {
  userId: UserId;
  socketId: string;
  displayName: string;
  role: "host" | "cohost" | "guest";
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  joinedAt: string; // ISO date
  metadata?: Record<string, unknown>;
}
```

### 2.3 Media state

```ts
interface MediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}
```

---

## 3. Socket.IO Namespacing & Connection

- Namespace: `/v1`
- Transports: `["websocket", "polling"]`
- Auth: JWT or session token passed via `auth.token`.

### 3.1 Client connection

**Client → Server**

```ts
io("/v1", {
  auth: {
    token: "JWT_OR_SESSION_TOKEN",
  },
});
```

**Server-side expectations**

- Validate token and associate `socket.id` with `userId`.
- Optionally load basic user profile for convenience (name, avatar).

---

## 4. Room Lifecycle Events

All events below are emitted on the `/v1` namespace.

### 4.1 Create room

**Client → Server**: `room:create`

```ts
interface RoomCreatePayload {
  name: string;
  password?: string;
  maxParticipants?: number;
}
```

**Server → Client (ack)**: `room:created`

```ts
interface RoomCreatedPayload {
  room: Room;
}
```

### 4.2 Join room

**Client → Server**: `room:join`

```ts
interface RoomJoinPayload {
  roomId: string;
  password?: string;
}
```

**Server → Client (ack)**: `room:joined`

```ts
interface RoomJoinedPayload {
  room: Room;
  participants: Participant[];
  self: Participant;
}
```

On success, the server:
- Validates room exists and password (if any).
- Adds participant to Redis room state.
- Joins Socket.IO room `room:{roomId}`.

### 4.3 Leave room

**Client → Server**: `room:leave`

```ts
interface RoomLeavePayload {
  roomId: string;
}
```

**Server → Client (ack)**: `room:left`

```ts
interface RoomLeftPayload {
  roomId: string;
}
```

**Broadcast to others**: `room:participant-left`

```ts
interface ParticipantLeftPayload {
  roomId: string;
  userId: string;
}
```

### 4.4 Participant join/updates broadcast

When a user joins:

**Broadcast**: `room:participant-joined`

```ts
interface ParticipantJoinedPayload {
  roomId: string;
  participant: Participant;
}
```

When room-level settings change (e.g. lock, title):

**Broadcast**: `room:updated`

```ts
interface RoomUpdatedPayload {
  room: Room;
}
```

---

## 5. Media State Events

Media flags (audio/video/screen) are tracked in Room Service and broadcast to all participants.

### 5.1 Join media

**Client → Server**: `media:join`

```ts
interface MediaJoinPayload {
  roomId: string;
}
```

**Server → Client (ack)**: `media:joined`

```ts
interface MediaJoinedPayload {
  roomId: string;
  initialState: MediaState;
}
```

### 5.2 Update media state

**Client → Server**: `media:state`

```ts
interface MediaStatePayload {
  roomId: string;
  state: MediaState;
}
```

**Broadcast**: `media:state-updated`

```ts
interface MediaStateUpdatedPayload {
  roomId: string;
  userId: string;
  state: MediaState;
}
```

### 5.3 Media errors

**Server → Client**: `media:error`

```ts
interface MediaErrorPayload {
  roomId?: string;
  code: string;
  message: string;
}
```

---

## 6. SFU (mediasoup) Events

These events handle WebRTC negotiation and track publication/consumption through the SFU.

### 6.1 Get router RTP capabilities

**Client → Server**: `sfu:getRouterRtpCapabilities`

```ts
interface GetRouterRtpCapabilitiesPayload {
  roomId: string;
}
```

**Server → Client (ack)**:

```ts
interface RouterRtpCapabilitiesPayload {
  roomId: string;
  rtpCapabilities: unknown; // mediasoup types on implementation side
}
```

### 6.2 Create WebRTC transport

**Client → Server**: `sfu:createTransport`

```ts
type TransportDirection = "send" | "recv";

interface CreateTransportPayload {
  roomId: string;
  direction: TransportDirection;
}
```

**Server → Client (ack)**:

```ts
interface TransportCreatedPayload {
  roomId: string;
  direction: TransportDirection;
  transportId: string;
  iceParameters: unknown;
  iceCandidates: unknown[];
  dtlsParameters: unknown;
}
```

### 6.3 Connect WebRTC transport

**Client → Server**: `sfu:connectTransport`

```ts
interface ConnectTransportPayload {
  roomId: string;
  transportId: string;
  dtlsParameters: unknown;
}
```

**Server → Client (ack)**:

```ts
interface ConnectTransportAckPayload {
  roomId: string;
  transportId: string;
}
```

### 6.4 Produce track

**Client → Server**: `sfu:produce`

```ts
type ProducerKind = "audio" | "video";

interface ProducePayload {
  roomId: string;
  transportId: string;
  kind: ProducerKind;
  rtpParameters: unknown;
  appData?: {
    source?: "mic" | "webcam" | "screen";
  };
}
```

**Server → Client (ack)**:

```ts
interface ProduceAckPayload {
  roomId: string;
  producerId: string;
}
```

**Broadcast**: `sfu:newProducer`

```ts
interface NewProducerPayload {
  roomId: string;
  producerId: string;
  userId: string;
  kind: ProducerKind;
  appData?: {
    source?: "mic" | "webcam" | "screen";
  };
}
```

### 6.5 Consume track

**Client → Server**: `sfu:consume`

```ts
interface ConsumePayload {
  roomId: string;
  producerId: string;
  transportId: string;
  rtpCapabilities: unknown;
}
```

**Server → Client (ack)**:

```ts
interface ConsumeAckPayload {
  roomId: string;
  producerId: string;
  consumerId: string;
  kind: ProducerKind;
  rtpParameters: unknown;
  appData?: {
    source?: "mic" | "webcam" | "screen";
  };
}
```

### 6.6 Resume consumer

**Client → Server**: `sfu:resumeConsumer`

```ts
interface ResumeConsumerPayload {
  roomId: string;
  consumerId: string;
}
```

**Server → Client (ack)**:

```ts
interface ResumeConsumerAckPayload {
  roomId: string;
  consumerId: string;
}
```

---

## 7. System & Reliability Events

### 7.1 Force disconnect

**Server → Client**: `system:force-disconnect`

```ts
interface ForceDisconnectPayload {
  reason: string;
  roomId?: string;
}
```

Typical reasons:
- Room deleted.
- User kicked or banned.
- Policy enforcement.

### 7.2 Reconnect flow

Clients rely on Socket.IO’s built-in reconnect but also implement:

- On reconnect:
  - If previously in a room, re-emit `room:join` with the last `roomId`.
  - Re-run SFU setup (`sfu:getRouterRtpCapabilities`, transports, `produce`, `consume`).
  - Restore media state via `media:state`.

---

## 8. End-to-End Call Flow (Summary)

1. **Connect**
   - Client connects to `/v1` with auth token.
2. **Join room**
   - `room:join` → `room:joined` (room info + participants).
3. **Join media**
   - `media:join` → `media:joined` (initial media state).
4. **SFU setup**
   - `sfu:getRouterRtpCapabilities` → router caps.
   - `sfu:createTransport` (send, then recv) → transport params.
   - `sfu:connectTransport` for each transport.
5. **Publish local tracks**
   - Acquire local tracks via platform media adapter (web or mobile).
   - `sfu:produce` for audio/video (and screen if any).
   - Backend creates producers and broadcasts `sfu:newProducer`.
6. **Consume remote tracks**
   - For each `sfu:newProducer`, client sends `sfu:consume` → receives consumer params.
   - Client resumes consumer and attaches track to UI (video/audio elements or RTCView).
7. **Update media state**
   - User toggles mic/camera/screen → client updates local tracks and emits `media:state`.
   - Backend broadcasts `media:state-updated` so others update UI.
8. **Leave room**
   - `room:leave` → `room:left` and `room:participant-left` broadcast.
   - SFU cleans up transports, producers, and consumers for that participant.

This protocol is designed to be **identical for web and mobile clients**, with only
media capture/rendering differing between platforms.

