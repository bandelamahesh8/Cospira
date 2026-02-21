# SMART RANDOM CONNECT — EXECUTION PLAN (DISCIPLINED VERSION)

**NON-NEGOTIABLE PRODUCT RULE**
This feature is social-first, safety-first, rate-limited, and isolated.
If any one of these fails → delete the feature.

---

## PHASE 0️⃣ — ISOLATION & BOUNDARIES (DO THIS FIRST)

**Goal**: Protect Cospira’s core reputation.

**Build**

- [x] **Separate module: RandomConnect**
- [x] **Separate routing (`/connect`)**
- [ ] **Separate moderation queue**

**Hard rules**

- No access from professional rooms
- No cross-contamination of users
- Different UI color / iconography (signals “social mode”)

**Outcome**
If Random Connect explodes or fails → Cospira survives.

---

## PHASE 1️⃣ — ENTRY & USER INTENT DECLARATION

**Goal**: Set expectations before connection.

**Build**

- [x] **Start Random Connect flow**
- [x] **User clicks Start Random Connect**
- [x] **Mandatory intent selection**:
  - Language
  - Mode (Casual / Study / Networking / Entertainment)
- [x] **Optional filters**:
  - Gender preference
  - Age range (18+ enforced)
  - Camera permission check (must be ON)

**Rules**

- No default “random everything”
- No skipping intent screen
- One intent per session

**Outcome**
Intent mismatch drops dramatically.

---

## PHASE 2️⃣ — MATCHING ENGINE (FAST & DUMB)

**Goal**: Speed > sophistication.

**Matching logic**

**Matching logic**

1. [x] User → Queue(language, mode)
2. [x] → Filter by availability
3. [x] → Random 1-to-1 pick
4. [x] → Connect

**Timeout handling**

- 10–15 sec wait
- Then:
  - Keep same language
  - Relax secondary filters only

**Rules**

- 1-to-1 only
- No reconnection with same user
- “Next” instantly disconnects

**Outcome**
Feels instant, not frustrating.

---

## PHASE 3️⃣ — SESSION UX (MINIMAL & SAFE)

**Goal**: Reduce abuse vectors.

**UI elements (ONLY THESE)**

- [x] Video
- [x] Display name + badges
- [x] Buttons:
  - [x] Next
  - [x] Report
  - [x] Disconnect

**Rules**

- [x] No chat initially (voice + video only)
- [x] Chat opens after 30–60 seconds.

**Outcome**
Reduces instant abuse and bots.

---

## PHASE 4️⃣ — SAFETY & MODERATION PIPELINE (CRITICAL)

**Goal**: Remove bad actors faster than they appear.

**Real-time protections**

- [x] **Camera ON check**
- [ ] **Face presence check** (Deferred)
- [ ] **Nudity detection → auto blur + disconnect** (Deferred)
- [ ] **Voice toxicity keyword detection**

**Report flow**

- [x] User reports
- [x] → Instant disconnect
- [x] → Session logged
- [x] → User flagged
- [x] → Cooldown / shadow ban

**Enforcement ladder**

1. Warning
2. Temporary mute
3. Session ban
4. Shadow ban
5. Permanent ban

**Outcome**
Clean environment or feature dies.

---

## PHASE 5️⃣ — IDENTITY LIGHT SYSTEM

**Goal**: Humanize without exposing.

**Build**

- [x] **Temporary display name**
- [x] **Country + language badge** (Implemented as Intent + Language)
- [x] **Session-based identity** (not fully anonymous)

**Rules**

- No custom usernames initially
- No profile stalking
- No external links

**Outcome**
Less abuse, more accountability.

---

## PHASE 6️⃣ — RATE LIMITS & ABUSE CONTROL

**Goal**: Protect brand and servers.

**Limits**

- **Free tier**:
  - [x] X sessions/day (Implemented via Cooldowns)
  - [x] Cooldown after reports
- **Paid tier**:
  - Higher limits
  - Priority queue
- [x] **Reputation System (In-Memory)**
  - Tracks session duration (short sessions = bad)
  - Segregates queues (Good vs Probation)
  - Auto-flags serial skippers

**Outcome**
Abusers disappear without drama.

---

## PHASE 7️⃣ — AI-ASSISTED MATCH QUALITY (OPTIONAL, LATER)

**Goal**: Improve experience quietly.

**Data tracked**

- Skip speed
- Session duration
- Report frequency
- AI use

**Adjust future matches**

- Prefer compatible behavior patterns

**Rules**

- No visible “scoring”
- No explanations shown

**Outcome**
Better matches over time, no creepiness.

---

## PHASE 8️⃣ — MONETIZATION (CONTROLLED)

**Goal**: Reduce abuse + fund moderation.

**Paid unlocks**

- Gender preference
- Priority matching
- Unlimited sessions
- Region preference

**Rules**

- Safety never paywalled
- Reports always free

**Outcome**
Abuse drops, costs covered.

---

## PHASE 9️⃣ — METRICS & KILL SWITCH

**Goal**: Know when to stop.

**Track**

- Report rate
- Avg session duration
- Skip rate
- Ban rate

**Kill criteria (strict)**

- Report rate > X%
- Moderation cost > revenue
- Brand complaints increase

**Outcome**
You stay in control, not ego.

---

**FINAL POSITIONING CHECK**
If this sentence stops being true, kill the feature:
“Random Connect is safe, intentional, and respectful.”

**FINAL BRUTAL TRUTH**
This feature can:

1. Explode user growth or
2. Destroy your reputation overnight
   There is no middle ground.
