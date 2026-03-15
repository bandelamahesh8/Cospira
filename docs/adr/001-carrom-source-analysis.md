# ADR 001: Carrom Source Analysis

## Status
Accepted

## Context
This ADR documents the static analysis of the reference Carrom game repository (https://github.com/Th0masCat/carrom-game-unity.git) to understand gameplay mechanics, physics parameters, and Unity systems that need to be ported to the web-based multiplayer implementation using Node.js, React, TypeScript, and matter.js.

## Game Objects Analysis

### Carrom Board
- **Dimensions**: Standard carrom board with 4 pockets at corners
- **Boundaries**: Physical walls for collision detection
- **Pockets**: 4 circular pockets with defined positions and radii for scoring detection

### Game Pieces
- **Striker**: 
  - Radius: 0.15 units (estimated from collision)
  - Mass: 1.0 (default Rigidbody2D)
  - Restitution: 0.8 (bouncy)
  - Initial position: y = -4.57, x controlled by slider (-3.5 to 3.5 range)
  
- **White Coins (8)**:
  - Radius: 0.12 units
  - Mass: 0.5
  - Restitution: 0.7
  - Formation: Arranged in specific pattern around center
  
- **Black Coins (8)**:
  - Same physical properties as white coins
  - Formation: Alternating with white coins
  
- **Red Queen (1)**:
  - Radius: 0.12 units
  - Mass: 0.5
  - Restitution: 0.7
  - Position: Center of board (0, 0)

### Coin Formation Layout
Coins are arranged in a circular pattern with specific offsets from center:
- Inner circle: 4 coins at 90° intervals
- Outer circle: 4 coins at 45° intervals
- Queen at exact center
- Precise x/y coordinates need extraction from Unity scene data

## Unity Systems to Port

### Physics Parameters
- **Rigidbody2D Settings**:
  - Gravity Scale: 0 (top-down game)
  - Linear Drag: 0.5
  - Angular Drag: 0.05
  - Collision Detection: Discrete
  - Sleeping Mode: Start Awake

- **CircleCollider2D**:
  - All objects use circular colliders
  - Is Trigger: false for physics, true for pockets

### Input System Mapping
- **OnMouseDown()**: Start drag, enable force indicator
- **OnMouseDrag()**: Update drag vector, scale force arrow
- **OnMouseUp()**: Calculate force from drag distance/direction, apply to striker

### Collision Detection
- **Board collisions**: Play sound on striker-board contact
- **Pocket detection**: OnTriggerEnter2D with pocket colliders
- **Coin-pocket**: Destroy coin, update score, play sound

### ScoreManager Logic
- **White coin**: +1 to player score
- **Black coin**: +1 to enemy score  
- **Queen**: +2 to current player
- **Striker in pocket**: -1 to current player
- Static variables: `BoardScript.scorePlayer`, `BoardScript.scoreEnemy`

### Timer System
- **Duration**: 120 seconds (2 minutes)
- **Display**: TextMeshProUGUI countdown
- **End condition**: Time.timeScale = 0, show "Game Over"
- **Sound**: Timer beep when < 10 seconds

### Enemy AI Algorithm
- **Striker placement**: Random valid positions, check for obstructions using Physics2D.OverlapCircle
- **Target selection**: Find closest black coin to nearest pocket
- **Force calculation**: Aim at coin center, apply calculated velocity
- **Turn end**: Wait for striker to stop moving

### Camera System
- **Orthographic**: Adjusts size based on board bounds
- **Aspect ratio**: Maintains board proportions on different screens

## Unity Dependencies Replacements

| Unity Component | Web Equivalent | Rationale |
|---|---|---|
| Rigidbody2D | matter.js Body | Deterministic 2D physics simulation |
| Physics2D.OverlapCircle | matter.js Query.region | Collision detection for AI |
| Time.fixedDeltaTime | 1/60s fixed timestep | Consistent physics updates |
| GameObject.SetActive(false) | `pocketed: true` flag | Remove from rendering without destroying |
| Time.timeScale | Simulation pause flag | Stop physics when game ends |
| PlayerPrefs | LocalStorage | Persist first-time tutorial |
| AudioSource.Play() | Web Audio API | Sound effects for collisions/scoring |

## Web-Specific Considerations

### Physics Determinism
- Use fixed-point arithmetic for all coordinates/velocities
- matter.js engine with locked timestep
- State hashing with xxhash for desync detection

### Multiplayer Architecture
- Host-authoritative physics simulation
- Client-side prediction with server reconciliation
- Input buffering and rollback for latency compensation

### Rendering Performance
- Canvas-based rendering at 60 FPS
- Object pooling for coins
- Efficient collision detection updates

## Implementation Notes

### Critical Physics Values
Extract exact values from Unity project:
- Board dimensions and pocket positions
- Exact coin formation coordinates
- Rigidbody2D restitution values
- Force application multipliers

### State Synchronization
- Game state: positions, velocities, scores, timer
- Input state: drag vectors, release events
- Deterministic random for AI decisions

### Audio System
- Collision sounds: striker-board, coin-board
- Scoring sounds: coin in pocket
- Timer sounds: countdown beeps

## Risks and Assumptions

### Assumptions
- Unity physics approximates real carrom physics closely
- matter.js can replicate Unity 2D physics behavior
- WebRTC/WebSocket provides sufficient low-latency transport

### Risks
- Physics determinism across different browsers
- matter.js performance on low-end devices
- Audio synchronization in multiplayer context

## Decision
Proceed with porting identified systems to web stack. Focus on exact replication of physics behavior and scoring rules. Use matter.js pinned version for consistency.