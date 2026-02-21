# COSPIRA — NON-AI VALUE EXECUTION PLAN

## OVERALL RULE

These improvements are UX + system discipline, not features. They must be invisible when done right.

---

## PHD 1️⃣ — ENTRY & FIRST IMPRESSION (RETENTION GATE)

### 1. Zero-Friction Entry

**Goal**: User enters before they think.

- [x] **One-click guest join**
- [x] **Auto-generated guest identity** (e.g., "Guest-123", "Neon-Tiger")
- [x] **Delayed auth timer** (Prompt login only after interaction or time limit)

**Implementation Rules**:

- No modal before entry
- Login prompt only after: chat, mic unmute, summary click

---

## PHASE 2️⃣ — ROOM STATE CLARITY (CONTROL FEEL)

### 2. Room Lifecycle System

**Goal**: Eliminate confusion.

- [x] **Explicit room states**: Upcoming, Live, Paused, Ended
- [x] **State banner always visible**
- [x] **Ended → summary pipeline auto-triggers**

**Implementation Rules**:

- State changes are logged
- Only host can change state

---

## PHASE 3️⃣ — TRUST THROUGH TRANSPARENCY

### 3. Latency & Network Feedback

**Goal**: Replace frustration with understanding.

- [x] **Subtle network indicator**
- [x] **Human-readable messages** ("Poor connection" vs "Error 500")
- [x] **Auto quality fallback notices**

**Implementation Rules**:

- No red flashing warnings
- Explanations > errors

---

## PHASE 4️⃣ — POWER USER RESPECT

### 4. Manual Overrides

**Goal**: Never trap users.

- [x] **Toggle for every smart feature**
- [x] **Host override panel**
- [x] **“Undo” for AI actions**

**Implementation Rules**:

- Automation suggests, never forces
- Overrides persist per room

---

## PHASE 5️⃣ — DATA OWNERSHIP & TRUST

### 5. Export & Portability

**Goal**: Build trust, not hostage lock-in.

- [x] **Export formats**: PDF, TXT
- [x] **Calendar sync**

**Implementation Rules**:

- Export always visible
- No paywall for basic export

---

## PHASE 6️⃣ — FAILURE-FIRST DESIGN

### 6. Resilience UX

**Goal**: System never “breaks”.

- [x] **Graceful AI failure states**
- [x] **Raw fallback data access**

**Implementation Rules**:

- Never show stack traces
- Always show next action

---

## PHASE 7️⃣ — PERCEIVED PERFORMANCE

### 7. Speed Psychology

**Goal**: Feel fast even when not.

- [x] **Skeleton screens**
- [x] **Progressive reveal**
- [x] **Priority UI load over media**

**Implementation Rules**:

- Content first, polish later
- Never block UI on backend

---

## PHASE 8️⃣ — LEARNING WITHOUT TEACHING

### 8. Action-Based Onboarding

**Goal**: Teach by use, not docs.

- [x] **First-room guidance**
- [x] **Contextual prompts only once**

**Implementation Rules**:

- No tours
- Prompts disappear after action

---

## PHASE 9️⃣ — LANGUAGE DISCIPLINE

### 9. Terminology Governance

**Goal**: Product maturity.

- [x] **Central terminology list**
- [x] **Enforced across UI, backend, docs**

**Implementation Rules**:

- One concept = one word
- Never rename casually

---

## PHASE 🔟 — FEATURE HYGIENE (LONG-TERM SURVIVAL)

### 10. Feature Kill System

**Goal**: Prevent bloat.

- [x] **Usage tracking per feature**
- [x] **Kill/merge decision rule** (>5% usage)

---

**FINAL CHECKPOINT**: “Did this make rooms easier to enter, clearer to use, or more valuable afterward?”
