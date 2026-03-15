# ADR 001: Snake & Ladder Source Analysis

## Context
As part of Phase 1 of the Snake & Ladder integration into Cospira, this ADR documents the static analysis of the source repository: https://github.com/shreya9347/Snake-and-Ladder-game.git

## Analysis

### Board Rendering
- **Current Approach**: Uses Python's PIL (Pillow) library to open and display a static PNG image (`board_image.png`) via `img.show()`.
- **Migration Strategy**: Migrate to React with Canvas or SVG for web-based rendering. Rationale: PIL is desktop-only; web requires DOM manipulation. Canvas for dynamic elements (tokens), SVG for static board (snakes/ladders). Choose Canvas for better performance in animations.

### Dice Generation
- **Current Implementation**: `random.randint(1, 6)` from Python's `random` module.
- **Security Issue**: Cryptographically non-secure; flagged as violation of host-authoritative, deterministic requirements.
- **Replacement**: Use `crypto.randomInt(1, 7)` in Node.js (host-side) or `crypto.getRandomValues()` in browser (if needed, but host generates).

### Player Position Model
- **Current Model**: Ordinal positions 1–100, starts at 0 (not entered).
- **Canonical Representation**: Adopt ordinal (1–100) as internal model, with 0 indicating not entered. No coordinate-based (row/col) needed for logic; UI can compute coordinates from ordinal.

### Snake/Ladder Map Validation
- **Extracted Maps**:
  - Ladders: {1: 38, 4: 14, 8: 30, 21: 42, 28: 74, 50: 67, 71: 92, 88: 99}
  - Snakes: {32: 10, 34: 6, 48: 26, 62: 18, 88: 89, 95: 56, 97: 78}
- **Validation Notes**: Maps appear valid (heads > tails for snakes, bases < tops for ladders, within 1–100). No overlaps or invalid cells detected. Cell 1 and 100 not endpoints.

### Turn State Machine
- **Current States**: Simple alternating turns (turn % 2 == 0 for player 1, else player 2). No explicit FSM.
- **Enumerated States**: IDLE (waiting for input), ROLLING (dice rolled), MOVING (position updating), RESOLVING (snake/ladder check), WIN (game end). Missing: WAITING (initial), triple-six penalty, extra turn logic.
- **Unreachable/Missing**: No handling for extra turns (sixes), triple-six cancellation, overshoot no-move, exact win only.

### Win Detection
- **Current Logic**: `point >= 100` wins, with overshoot allowed (set to 100).
- **Issue**: Violates spec; overshoot must be no-move. Win only on exact 100.
- **Fix**: Change to `point == 100` for win, and prevent overshoot moves.

## Recommendations
- Discard console-based UI; rebuild for React/TypeScript.
- Implement proper FSM for turns.
- Enforce exact win condition.
- Use CSPRNG for dice.
- Validate board config at runtime.

## Decision
Proceed to Phase 2: Module Structure, using Canvas for board rendering.