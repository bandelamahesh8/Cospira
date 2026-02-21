# PHASE 4 IMPLEMENTATION PLAN: QUALITY & TRUST

**Status**: 🔴 NOT STARTED
**Last Updated**: 2026-01-10

---

## 🎯 OBJECTIVE

Improve the core "call" experience by adding intelligence to media streams and tracking user presence without being invasive.

---

## 🛠️ TASKS

### 1. Presence Tracking (Backend Support)

- [ ] Create socket events for presence state changes (`user:status-update`).
- [ ] Add `presence` logging to `EventLogger`.
- [ ] Update `Room` member schema to track last active state.

### 2. Media Quality Analytics

- [ ] Create `media:quality-report` socket listener.
- [ ] Store WebRTC metrics (packet loss, latency, jitter) in `RoomEvent`.
- [ ] Implement a basic "Quality Warning" broadcast (e.g., "User X is having connection issues").

### 3. Client Guidance (Documentation)

- [ ] Create implementation guide for client-side noise suppression (RNNoise).
- [ ] Create implementation guide for presence detection hooks.

---

## 📝 TASK 1: PRESENCE TRACKING

### Backend Changes:

- **Socket**: `user:status-update` event.
- **Event Type**: `presence_change` (active, idle, away).
- **Service**: Update `RoomService` to track member statuses.

---

## 📝 TASK 2: MEDIA QUALITY ANALYTICS

### Backend Changes:

- **Socket**: `media:quality-report`.
- **Event Type**: `webrtc_metric`.
- **Logic**: If packet loss > 10%, log and potentially notify the room.

---

## ✅ ACCEPTANCE CRITERIA

1. Users can broadcast their status (Active/Idle).
2. Status is logged in MongoDB for future analytics.
3. Media quality reports are stored per session.
4. Clients receive warnings when a participant has poor connection.
