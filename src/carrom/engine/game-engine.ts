/**
 * Carrom Game Logic Engine
 *
 * Manages game state transitions, scoring, turn management,
 * and win condition detection. Processes player inputs and
 * coordinates with physics simulation.
 */

import { CarromGameState, PlayerInput, GameEvent, PlayerId } from '../types/game-state';
import { CarromPhysicsEngine } from '../physics/matter-engine';
import { hashGameState } from '../utils/state-hash';
import { FixedVector2, toFixed, fromFixed, magnitudeVec2Fixed } from '../fixed-point';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../utils/game-state-creator';

/** Physics simulation timestep (1/60 seconds) */
const FIXED_DELTA = 1 / 60;
/** Maximum physics steps per frame to avoid spiral of death */
const MAX_STEPS_PER_FRAME = 5;

/** Maximum drag distance for shot power */
export const MAX_DRAG_DISTANCE = toFixed(200);

/** Minimum drag distance to register a shot */
export const MIN_DRAG_DISTANCE = toFixed(10);

/** Force multiplier for drag distance to velocity */
export const DRAG_FORCE_MULTIPLIER = toFixed(0.08);

/** Time to wait after shot before switching turns (seconds) */
export const TURN_SWITCH_DELAY = 1.5;

/** Points for different events */
export const POINTS = {
  OWN_COIN: 1,
  OPPONENT_COIN: 1, // Awarded to opponent
  QUEEN: 3,
  FOUL: -1,
  QUEEN_LOST_PENALTY: -3,
} as const;

/** Main game engine class */
export class CarromGameEngine {
  private physicsEngine: CarromPhysicsEngine;
  private gameState: CarromGameState;
  private eventListeners: Array<(event: GameEvent) => void> = [];

  // Physics loop state
  private accumulator = 0;
  private lastTime = 0;

  // Turn state
  private isMoving = false;
  private coinsPocketedThisTurn: string[] = [];
  private currentTurnFouled = false;

  constructor(initialState: CarromGameState) {
    this.gameState = { ...initialState };
    this.physicsEngine = new CarromPhysicsEngine();
    this.physicsEngine.initializeBoard(this.gameState.board);

    // Seed Math.random from roomId for determinism
    this.seedRandom(this.gameState.roomId);

    this.initializePhysicsBodies();
  }

  /**
   * Seeds the random number generator for deterministic simulation
   */
  private seedRandom(roomId: string): void {
    let h = 0;
    for (let i = 0; i < roomId.length; i++) {
      h = (Math.imul(31, h) + roomId.charCodeAt(i)) | 0;
    }
    let state = h >>> 0;

    Math.random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0xffffffff;
    };
  }

  /**
   * Initializes physics bodies from game state
   */
  private initializePhysicsBodies(): void {
    this.physicsEngine.createBody(this.gameState.physics.striker);
    this.gameState.physics.coins.forEach((coin) => {
      if (!coin.pocketed) {
        this.physicsEngine.createBody(coin);
      }
    });
  }

  /**
   * Syncs the local game state with an external authoritative state
   */
  public syncState(newState: CarromGameState): void {
    this.gameState = { ...newState };
    this.physicsEngine.syncStateFromGameState(this.gameState);
  }

  /**
   * Updates game state using a fixed-timestep loop
   */
  update(currentTimeMs: number): void {
    if (this.lastTime === 0) {
      this.lastTime = currentTimeMs;
      return;
    }

    const elapsed = Math.min((currentTimeMs - this.lastTime) / 1000, 0.25);
    this.lastTime = currentTimeMs;
    this.accumulator += elapsed;

    let steps = 0;
    while (this.accumulator >= FIXED_DELTA && steps < MAX_STEPS_PER_FRAME) {
      this.stepPhysics();
      this.accumulator -= FIXED_DELTA;
      steps++;
    }

    this.syncStateFromPhysics();

    if (this.isMoving && this.allBodiesAtRest()) {
      this.handleShotEnd();
    }

    if (this.gameState.phase === 'playing' && !this.isMoving) {
      this.gameState.timeRemaining = Math.max(0, this.gameState.timeRemaining - elapsed);
      if (this.gameState.timeRemaining <= 0) {
        this.endGame('time_up');
      }
    }
  }

  private stepPhysics(): void {
    this.physicsEngine.step();
    const pocketCollisions = this.physicsEngine.checkPocketCollisions();
    pocketCollisions.forEach(({ bodyId, pocketId }) => {
      this.handlePocketCollision(bodyId, pocketId);
    });
  }

  processInput(input: PlayerInput): void {
    if (this.gameState.phase !== 'playing' || input.playerId !== this.gameState.currentPlayer) {
      return;
    }

    if (this.isMoving) return;

    if (input.type === 'drag_end') {
      this.processShot(input);
    }

    this.gameState.lastInputTimestamp = input.timestamp;
  }

  private processShot(input: PlayerInput): void {
    if (!input.startPosition || !input.currentPosition) return;

    const dragX = input.currentPosition.x - input.startPosition.x;
    const dragY = input.currentPosition.y - input.startPosition.y;
    const dragMagnitude = Math.sqrt(dragX * dragX + dragY * dragY);

    if (dragMagnitude < fromFixed(MIN_DRAG_DISTANCE)) return;

    const clampedMagnitude = Math.min(dragMagnitude, fromFixed(MAX_DRAG_DISTANCE));
    const forceFactor =
      (clampedMagnitude / fromFixed(MAX_DRAG_DISTANCE)) * fromFixed(DRAG_FORCE_MULTIPLIER);
    const forceAngle = Math.atan2(-dragY, -dragX);

    const forceVector: FixedVector2 = {
      x: toFixed(Math.cos(forceAngle) * forceFactor),
      y: toFixed(Math.sin(forceAngle) * forceFactor),
    };

    this.coinsPocketedThisTurn = [];
    this.currentTurnFouled = false;
    this.isMoving = true;

    this.physicsEngine.applyForce(this.gameState.physics.striker.id, forceVector);

    this.emitEvent({
      type: 'PLAYER_SHOT',
      payload: {
        playerId: input.playerId,
        angle: forceAngle,
        power: clampedMagnitude / fromFixed(MAX_DRAG_DISTANCE),
      },
      timestamp: Date.now(),
    });
  }

  private handlePocketCollision(bodyId: string, _pocketId: number): void {
    if (bodyId === 'striker') {
      this.handleStrikerFoul();
      return;
    }

    const coinIndex = this.gameState.physics.coins.findIndex((c) => c.id === bodyId);
    const coin = this.gameState.physics.coins[coinIndex];
    if (!coin || coin.pocketed) return;

    coin.pocketed = true;
    this.physicsEngine.removeBody(bodyId);
    this.coinsPocketedThisTurn.push(bodyId);

    if (coin.type === 'queen') {
      this.gameState.queenStatus = 'pocketed_needs_cover';
      this.emitEvent({
        type: 'QUEEN_POCKETED',
        payload: { player: this.gameState.currentPlayer },
        timestamp: Date.now(),
      });
    }

    this.emitEvent({
      type: 'COIN_POCKETED',
      payload: { coinId: bodyId, type: coin.type, player: this.gameState.currentPlayer },
      timestamp: Date.now(),
    });
  }

  private handleShotEnd(): void {
    this.isMoving = false;
    const currentPlayerId = this.gameState.currentPlayer;

    this.checkColorAssignment();
    this.handleQueenLogic();
    this.updateScoresAtTurnEnd();
    this.checkTurnFouls();

    let turnContinues = false;
    if (!this.currentTurnFouled && this.coinsPocketedThisTurn.length > 0) {
      const assignedColor = this.gameState.coinAssignment[currentPlayerId];
      const ownCoins = this.gameState.physics.coins.filter(
        (c) =>
          this.coinsPocketedThisTurn.includes(c.id) &&
          (c.type === assignedColor || c.type === 'queen')
      );
      if (ownCoins.length > 0) {
        turnContinues = true;
      }
    }

    this.emitEvent({
      type: 'SHOT_RESULT',
      payload: { turner: currentPlayerId, turnContinues, fouled: this.currentTurnFouled },
      timestamp: Date.now(),
    });

    if (!turnContinues) {
      this.switchTurn();
    } else {
      this.resetStrikerPosition();
    }

    this.checkWinConditions();
    this.gameState.sequenceId++;
    this.gameState.stateHash = hashGameState(this.gameState);
  }

  private checkColorAssignment(): void {
    const cp = this.gameState.currentPlayer;
    if (this.gameState.coinAssignment[cp] !== 'none') return;

    const firstCoinId = this.coinsPocketedThisTurn.find((id) => {
      const c = this.gameState.physics.coins.find((coin) => coin.id === id);
      return c && c.type !== 'queen';
    });

    if (firstCoinId) {
      const coin = this.gameState.physics.coins.find((c) => c.id === firstCoinId)!;
      const assignedColor = coin.type as 'white' | 'black';
      const opponentColor = assignedColor === 'white' ? 'black' : 'white';

      this.gameState.coinAssignment[cp] = assignedColor;
      const opponentId = this.gameState.players.find((p) => p.id !== cp)!.id;
      this.gameState.coinAssignment[opponentId] = opponentColor;
    }
  }

  private handleQueenLogic(): void {
    if (this.gameState.queenStatus === 'pocketed_needs_cover') {
      const cp = this.gameState.currentPlayer;
      const assignedColor = this.gameState.coinAssignment[cp];

      const coverSucceeded = this.gameState.physics.coins.some(
        (c) => this.coinsPocketedThisTurn.includes(c.id) && c.type === assignedColor
      );

      if (coverSucceeded) {
        this.gameState.queenStatus = 'covered';
        this.addScore(cp, POINTS.QUEEN);
        this.emitEvent({ type: 'QUEEN_COVERED', payload: { player: cp }, timestamp: Date.now() });
      } else {
        this.gameState.queenStatus = 'on_board';
        const queen = this.gameState.physics.coins.find((c) => c.id === 'queen')!;
        queen.pocketed = false;
        queen.position = { x: toFixed(BOARD_WIDTH / 2), y: toFixed(BOARD_HEIGHT / 2) };
        queen.velocity = { x: 0, y: 0 };
        this.physicsEngine.createBody(queen);
        this.emitEvent({
          type: 'QUEEN_RETURNED',
          payload: { reason: 'failed_cover' },
          timestamp: Date.now(),
        });
      }
    }
  }

  private updateScoresAtTurnEnd(): void {
    const cp = this.gameState.currentPlayer;
    const opponentId = this.gameState.players.find((p) => p.id !== cp)!.id;
    const cpColor = this.gameState.coinAssignment[cp];
    const opColor = this.gameState.coinAssignment[opponentId];

    this.coinsPocketedThisTurn.forEach((id) => {
      const coin = this.gameState.physics.coins.find((c) => c.id === id)!;
      if (coin.type === cpColor) {
        this.addScore(cp, POINTS.OWN_COIN);
      } else if (coin.type === opColor) {
        this.addScore(opponentId, POINTS.OPPONENT_COIN);
      }
    });
  }

  private checkTurnFouls(): void {}

  private handleStrikerFoul(): void {
    this.currentTurnFouled = true;
    const cp = this.gameState.currentPlayer;
    this.addScore(cp, POINTS.FOUL);
    this.returnOnePocketedCoin(cp);
    this.emitEvent({
      type: 'FOUL',
      payload: { player: cp, reason: 'striker_pocketed' },
      timestamp: Date.now(),
    });
    this.gameState.physics.striker.pocketed = true;
    this.physicsEngine.removeBody('striker');
  }

  private returnOnePocketedCoin(playerId: PlayerId): void {
    const color = this.gameState.coinAssignment[playerId];
    if (color === 'none') return;
    const coin = this.gameState.physics.coins.find((c) => c.pocketed && c.type === color);
    if (coin) {
      coin.pocketed = false;
      coin.position = { x: toFixed(BOARD_WIDTH / 2), y: toFixed(BOARD_HEIGHT / 2) };
      coin.velocity = { x: 0, y: 0 };
      this.physicsEngine.createBody(coin);
    }
  }

  private addScore(playerId: PlayerId, points: number): void {
    const p = this.gameState.players.find((player) => player.id === playerId);
    if (p) p.score += points;
  }

  private switchTurn(): void {
    const currentPlayerId = this.gameState.currentPlayer;
    const nextPlayer = this.gameState.players.find((p) => p.id !== currentPlayerId)!.id;
    this.gameState.currentPlayer = nextPlayer;
    this.resetStrikerPosition();
    this.emitEvent({ type: 'TURN_SWITCH', payload: { nextPlayer }, timestamp: Date.now() });
  }

  private resetStrikerPosition(): void {
    const { strikerBaselineY, strikerXRange } = this.gameState.board;
    const centerX = (fromFixed(strikerXRange.min) + fromFixed(strikerXRange.max)) / 2;
    const striker = this.gameState.physics.striker;
    striker.pocketed = false;
    striker.position = { x: toFixed(centerX), y: strikerBaselineY };
    striker.velocity = { x: 0, y: 0 };
    striker.angularVelocity = 0;
    this.physicsEngine.removeBody('striker');
    this.physicsEngine.createBody(striker);
  }

  private allBodiesAtRest(): boolean {
    const THRESHOLD = 0.05;
    const striker = this.gameState.physics.striker;
    if (!striker.pocketed && magnitudeVec2Fixed(striker.velocity) > toFixed(THRESHOLD))
      return false;
    for (const coin of this.gameState.physics.coins) {
      if (!coin.pocketed && magnitudeVec2Fixed(coin.velocity) > toFixed(THRESHOLD)) return false;
    }
    return true;
  }

  private checkWinConditions(): void {
    this.gameState.players.forEach((p) => {
      const color = this.gameState.coinAssignment[p.id];
      if (color !== 'none') {
        const remaining = this.gameState.physics.coins.filter(
          (c) => !c.pocketed && c.type === color
        ).length;
        p.remainingCoins = remaining;
        if (remaining === 0 && this.gameState.queenStatus === 'covered') {
          this.endGame('all_coins_pocketed');
        }
      }
    });
  }

  private endGame(reason: 'time_up' | 'all_coins_pocketed' | 'forfeit'): void {
    this.gameState.phase = 'finished';
    this.gameState.endReason = reason;
    const p1 = this.gameState.players[0];
    const p2 = this.gameState.players[1];
    if (p1.score > p2.score) this.gameState.winner = p1.id;
    else if (p2.score > p1.score) this.gameState.winner = p2.id;
    else this.gameState.winner = p1.id;
    this.emitEvent({
      type: 'GAME_OVER',
      payload: { winner: this.gameState.winner, reason },
      timestamp: Date.now(),
    });
  }

  private syncStateFromPhysics(): void {
    const physicsState = this.physicsEngine.getPhysicsState();
    this.gameState.physics.coins.forEach((c) => {
      const ps = physicsState.coins.find((pc) => pc.id === c.id);
      if (ps) {
        c.position = ps.position;
        c.velocity = ps.velocity;
        c.angularVelocity = ps.angularVelocity;
      }
    });
    const strikerPS = physicsState.striker;
    if (strikerPS) {
      this.gameState.physics.striker.position = strikerPS.position;
      this.gameState.physics.striker.velocity = strikerPS.velocity;
      this.gameState.physics.striker.angularVelocity = strikerPS.angularVelocity;
    }
  }

  getGameState(): CarromGameState {
    return { ...this.gameState };
  }

  addEventListener(listener: (event: GameEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: GameEvent) => void): void {
    this.eventListeners = this.eventListeners.filter((l) => l !== listener);
  }

  private emitEvent(event: GameEvent): void {
    this.eventListeners.forEach((l) => l(event));
  }
}
