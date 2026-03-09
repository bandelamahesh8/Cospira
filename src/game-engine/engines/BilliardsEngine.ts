import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

// --- Constants ---
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const BALL_RADIUS = 10;
const POCKET_RADIUS = 18;
const RAIL_FRICTION = 0.985; // Drag factor per frame
const COLLISION_LOSS = 0.95; // Energy lost on ball-ball collision
const VELOCITY_THRESHOLD = 0.05; // Stop threshold

// --- Types ---
export type BallType = 'solid' | 'stripe' | 'black' | 'white';

export interface Ball {
  id: number; // 0 = white, 8 = black, 1-7 solids, 9-15 stripes
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: BallType;
  visible: boolean; // False if pocketed
}

export interface BilliardsGameState extends GameState {
  balls: Ball[];
  cueBall: Ball; // Helper ref to ball 0
  activePlayerType: 'solid' | 'stripe' | 'open';
  isBreakShot: boolean;
  shotInProgress: boolean;
  foulReason: string | null;
}

export class BilliardsEngine extends BaseGameEngine {
  // Game Constants
  readonly POCKETS = [
    { x: 0, y: 0 },
    { x: TABLE_WIDTH / 2, y: 0 },
    { x: TABLE_WIDTH, y: 0 },
    { x: 0, y: TABLE_HEIGHT },
    { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT },
    { x: TABLE_WIDTH, y: TABLE_HEIGHT },
  ];

  initGame(players: Player[]): BilliardsGameState {
    const balls = this.setupRack();

    const gameState: BilliardsGameState = {
      id: this.generateGameId(),
      type: 'billiards',
      players: players,
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board: null,
      balls: balls,
      cueBall: balls[0],
      activePlayerType: 'open',
      isBreakShot: true,
      shotInProgress: false,
      foulReason: null,
      metadata: {
        moveHistory: [],
        moveCount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  // --- Physics Simulation (Run this ~60 times per shot or deterministically) ---
  // Note: For turn-based, we might just expose a 'simulateShot' method that returns the final state.
  // But for the shared visual, we pass the force params and let clients simulate too.
  // This 'applyMove' calculates the final resting position to serve as authority.

  simulateShot(angle: number, power: number): void {
    const state = this.state as BilliardsGameState;
    const cue = state.balls[0];

    // Apply impulse
    const forceWrapper = Math.min(power, 30); // Cap power
    cue.vx = Math.cos(angle) * forceWrapper;
    cue.vy = Math.sin(angle) * forceWrapper;

    state.shotInProgress = true;

    // Run Physics Loop until all stopped (with safety limit)
    let steps = 0;
    const MAX_STEPS = 5000; // ~83 seconds at 60fps

    while (this.areBallsMoving(state.balls) && steps < MAX_STEPS) {
      this.stepPhysics(state.balls);
      steps++;
    }

    state.shotInProgress = false;
    this.handleShotResult(state);
  }

  private stepPhysics(balls: Ball[]) {
    balls.forEach((ball) => {
      if (!ball.visible) return;

      // Integration
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Friction
      ball.vx *= RAIL_FRICTION;
      ball.vy *= RAIL_FRICTION;

      // Stop if slow
      if (Math.abs(ball.vx) < VELOCITY_THRESHOLD) ball.vx = 0;
      if (Math.abs(ball.vy) < VELOCITY_THRESHOLD) ball.vy = 0;

      // Wall Collisions
      if (ball.x < BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx *= -1;
      }
      if (ball.x > TABLE_WIDTH - BALL_RADIUS) {
        ball.x = TABLE_WIDTH - BALL_RADIUS;
        ball.vx *= -1;
      }
      if (ball.y < BALL_RADIUS) {
        ball.y = BALL_RADIUS;
        ball.vy *= -1;
      }
      if (ball.y > TABLE_HEIGHT - BALL_RADIUS) {
        ball.y = TABLE_HEIGHT - BALL_RADIUS;
        ball.vy *= -1;
      }

      // Pocket Check
      this.POCKETS.forEach((p) => {
        const dx = ball.x - p.x;
        const dy = ball.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS) {
          ball.visible = false;
          ball.vx = 0;
          ball.vy = 0;
        }
      });
    });

    // Ball-Ball Collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i];
        const b2 = balls[j];
        if (!b1.visible || !b2.visible) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < BALL_RADIUS * 2) {
          // Resolve Overlap
          const angle = Math.atan2(dy, dx);
          const overlap = (BALL_RADIUS * 2 - dist) / 2;
          b1.x -= Math.cos(angle) * overlap;
          b1.y -= Math.sin(angle) * overlap;
          b2.x += Math.cos(angle) * overlap;
          b2.y += Math.sin(angle) * overlap;

          // Resolve Velocity (Elastic 2D)
          const nx = Math.cos(angle);
          const ny = Math.sin(angle);
          // Normal velocity components
          const v1n = b1.vx * nx + b1.vy * ny;
          const v2n = b2.vx * nx + b2.vy * ny;

          // Tangential velocity components (unchanged)
          const tx = -ny;
          const ty = nx;
          const v1t = b1.vx * tx + b1.vy * ty;
          const v2t = b2.vx * tx + b2.vy * ty;

          // Swap normal velocities (elastic) + loss
          const v1nFinal = v2n * COLLISION_LOSS;
          const v2nFinal = v1n * COLLISION_LOSS;

          // Convert back
          b1.vx = v1nFinal * nx + v1t * tx;
          b1.vy = v1nFinal * ny + v1t * ty;
          b2.vx = v2nFinal * nx + v2t * tx;
          b2.vy = v2nFinal * ny + v2t * ty;
        }
      }
    }
  }

  private areBallsMoving(balls: Ball[]): boolean {
    return balls.some((b) => b.visible && (Math.abs(b.vx) > 0 || Math.abs(b.vy) > 0));
  }

  // --- Game Rule Logic ---

  private handleShotResult(state: BilliardsGameState) {
    if (!state.cueBall.visible) {
      state.foulReason = 'Scratch! Cue ball pocketed.';
      // Respawn Cue Logic (Usually ball in hand, here center for simplicity)
      state.cueBall.visible = true;
      state.cueBall.x = TABLE_WIDTH / 4;
      state.cueBall.y = TABLE_HEIGHT / 2;
      this.switchTurn(state);
      return;
    }

    // Determine if valid balls pocketed
    // This is simplified.
    // Real pool needs to track "First Contact".
    // Implementation omitted for brevity of this pass, focusing on physics.

    this.switchTurn(state); // Always switch turn for this simple v1
  }

  private switchTurn(state: BilliardsGameState) {
    const pIdx = state.players.findIndex((p) => p.id === state.currentTurn);
    state.currentTurn = state.players[(pIdx + 1) % state.players.length].id;
  }

  validateMove(move: Move, state: BilliardsGameState): ValidationResult {
    if (move.playerId !== state.currentTurn) return { valid: false, reason: 'Not your turn' };
    if (state.shotInProgress) return { valid: false, reason: 'Balls moving' };

    // "Move" here is just parameters
    if (!move.data.angle || !move.data.power) return { valid: false };

    return { valid: true };
  }

  applyMove(move: Move, state: BilliardsGameState): BilliardsGameState {
    // Simulate here for authority
    // Clients will also simulate for visuals
    this.simulateShot(move.data.angle, move.data.power);

    return this.state as BilliardsGameState;
  }

  checkWinner(state: BilliardsGameState): WinnerResult {
    // Check 8-ball status
    const blackBall = state.balls.find((b) => b.id === 8);
    if (!blackBall?.visible) {
      // Immediate Win/Loss depending on if other balls cleared
      // Simpler: If 8 ball sinks, current player wins (casual rule)
      return { finished: true, winner: state.currentTurn };
    }
    return { finished: false, winner: null };
  }

  // --- Setup Helpers ---
  private setupRack(): Ball[] {
    const balls: Ball[] = [];
    const startX = TABLE_WIDTH * 0.75;
    const startY = TABLE_HEIGHT / 2;

    // 1. Cue Ball
    balls.push({
      id: 0,
      x: TABLE_WIDTH * 0.25,
      y: startY,
      vx: 0,
      vy: 0,
      type: 'white',
      visible: true,
    });

    // Rack Layout (Triangle)
    // row 0: 1
    // row 1: 2
    // ...
    let idCounter = 1;
    const rows = 5;
    for (let col = 0; col < rows; col++) {
      for (let row = 0; row <= col; row++) {
        const x = startX + col * (BALL_RADIUS * 1.8); // 1.8 cos 30? Approx packing
        const y = startY - col * BALL_RADIUS + row * BALL_RADIUS * 2;

        // Assign Type
        let type: BallType = 'solid';
        if (idCounter === 8) type = 'black';
        else if (idCounter > 8) type = 'stripe';

        balls.push({ id: idCounter, x, y, vx: 0, vy: 0, type, visible: true });
        idCounter++;
      }
    }
    return balls;
  }
}
