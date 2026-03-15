/**
 * Game State Creation Utilities
 *
 * Functions to create initial game states and board configurations.
 */

import {
  CarromGameState,
  BoardConfig,
  PhysicsBody,
  Pocket,
  RoomId,
  PlayerState,
} from '../types/game-state';
import { toFixed } from '../fixed-point';

/** Standard carrom board dimensions (in game units) from production specification */
export const BOARD_WIDTH = 740;
export const BOARD_HEIGHT = 740;

/** Pocket radius threshold */
export const POCKET_RADIUS = 28;

/** Coin properties */
export const COIN_RADIUS = 16;
export const COIN_MASS = 1;

/** Striker properties */
export const STRIKER_RADIUS = 22;
export const STRIKER_MASS = 2;

/** Restitution values */
export const COIN_RESTITUTION = 0.5;
export const STRIKER_RESTITUTION = 0.5;
export const BOARD_RESTITUTION = 0.6;

/** Drag coefficients */
export const COIN_LINEAR_DRAG = 0.02;
export const STRIKER_LINEAR_DRAG = 0.015;
export const ANGULAR_DRAG = 0.05;

/** Creates standard board configuration */
export function createStandardBoardConfig(): BoardConfig {
  // Pocket positions from specification
  const pockets: Pocket[] = [
    { id: 0, position: { x: toFixed(38), y: toFixed(38) }, radius: toFixed(POCKET_RADIUS) },
    { id: 1, position: { x: toFixed(702), y: toFixed(38) }, radius: toFixed(POCKET_RADIUS) },
    { id: 2, position: { x: toFixed(38), y: toFixed(702) }, radius: toFixed(POCKET_RADIUS) },
    { id: 3, position: { x: toFixed(702), y: toFixed(702) }, radius: toFixed(POCKET_RADIUS) },
  ];

  return {
    width: toFixed(BOARD_WIDTH),
    height: toFixed(BOARD_HEIGHT),
    wallThickness: toFixed(13),
    pockets,
    strikerBaselineY: toFixed(630),
    strikerXRange: { min: toFixed(100), max: toFixed(640) },
  };
}

/** Creates initial coin formation (17 coins) */
export function createInitialCoins(): PhysicsBody[] {
  const coins: PhysicsBody[] = [];
  const centerX = BOARD_WIDTH / 2;
  const centerY = BOARD_HEIGHT / 2;

  // 1. Queen at dead center
  coins.push({
    id: 'queen',
    type: 'queen',
    position: { x: toFixed(centerX), y: toFixed(centerY) },
    velocity: { x: 0, y: 0 },
    angularVelocity: 0,
    pocketed: false,
    radius: toFixed(COIN_RADIUS),
    mass: toFixed(COIN_MASS),
    restitution: toFixed(COIN_RESTITUTION),
    linearDrag: toFixed(COIN_LINEAR_DRAG),
    angularDrag: toFixed(ANGULAR_DRAG),
  });

  // 2. Inner circle: 6 coins around queen
  const innerRadius = COIN_RADIUS * 2.1;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const x = centerX + Math.cos(angle) * innerRadius;
    const y = centerY + Math.sin(angle) * innerRadius;

    coins.push({
      id: `inner_${i}`,
      type: i % 2 === 0 ? 'white' : 'black',
      position: { x: toFixed(x), y: toFixed(y) },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      pocketed: false,
      radius: toFixed(COIN_RADIUS),
      mass: toFixed(COIN_MASS),
      restitution: toFixed(COIN_RESTITUTION),
      linearDrag: toFixed(COIN_LINEAR_DRAG),
      angularDrag: toFixed(ANGULAR_DRAG),
    });
  }

  // 3. Outer circle: 10 coins to make total 17
  const outerRadius = COIN_RADIUS * 4.2;
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI * 2) / 10 + Math.PI / 10;
    const x = centerX + Math.cos(angle) * outerRadius;
    const y = centerY + Math.sin(angle) * outerRadius;

    coins.push({
      id: `outer_${i}`,
      type: i % 2 === 0 ? 'black' : 'white',
      position: { x: toFixed(x), y: toFixed(y) },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      pocketed: false,
      radius: toFixed(COIN_RADIUS),
      mass: toFixed(COIN_MASS),
      restitution: toFixed(COIN_RESTITUTION),
      linearDrag: toFixed(COIN_LINEAR_DRAG),
      angularDrag: toFixed(ANGULAR_DRAG),
    });
  }

  return coins;
}

/** Creates initial player states */
export function createInitialPlayerStates(player1Id: string, player2Id: string): PlayerState[] {
  return [
    {
      id: player1Id,
      score: 0,
      remainingCoins: 8,
      isAI: false,
      joinTimestamp: Date.now(),
      connected: true,
    },
    {
      id: player2Id,
      score: 0,
      remainingCoins: 8,
      isAI: false,
      joinTimestamp: Date.now(),
      connected: true,
    },
  ];
}

/** Creates initial game state */
export function createInitialGameState(
  roomId: RoomId,
  player1Id: string,
  player2Id: string
): CarromGameState {
  const board = createStandardBoardConfig();
  const coins = createInitialCoins();
  const striker: PhysicsBody = {
    id: 'striker',
    type: 'striker',
    position: { x: toFixed(BOARD_WIDTH / 2), y: board.strikerBaselineY },
    velocity: { x: 0, y: 0 },
    angularVelocity: 0,
    pocketed: false,
    radius: toFixed(STRIKER_RADIUS),
    mass: toFixed(STRIKER_MASS),
    restitution: toFixed(STRIKER_RESTITUTION),
    linearDrag: toFixed(STRIKER_LINEAR_DRAG),
    angularDrag: toFixed(ANGULAR_DRAG),
  };

  return {
    roomId,
    phase: 'playing',
    currentPlayer: player1Id,
    players: createInitialPlayerStates(player1Id, player2Id),
    timeRemaining: 120,
    physics: {
      striker,
      coins,
    },
    board,
    queenStatus: 'on_board',
    coinAssignment: {
      [player1Id]: 'none',
      [player2Id]: 'none',
    },
    hostId: player1Id,
    sequenceId: 0,
    stateHash: '',
    lastInputTimestamp: 0,
    gameStartTimestamp: Date.now(),
  };
}
