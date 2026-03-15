import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

type CellValue = 'red' | 'yellow' | null;
// Board is 6 rows (0-5) x 7 columns (0-6)
// We can store as 1D array of size 42, or 2D array.
// 2D Array [row][col] is easier for gravity logic.
// Row 0 is top, Row 5 is bottom? Or Row 0 bottom?
// Standard convention: Row 0 is top usually in arrays.
// Visual: Drop into column, falls to max index.
type Board = CellValue[][];

export class ConnectFourEngine extends BaseGameEngine {
  private readonly ROWS = 6;
  private readonly COLS = 7;

  initGame(players: Player[]): GameState {
    if (players.length !== 2) {
      console.error('Connect Four requires exactly 2 players, but got:', players.length);
      // Construct a minimal state to avoid crash, though it will be invalid
      return {
        id: this.generateGameId(),
        type: 'connect4',
        players: players.map((p) => ({ ...p, role: 'spectator' })),
        currentTurn: players[0]?.id || '',
        status: 'waiting',
        winner: null,
        board: [],
        metadata: { moveHistory: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Initialize empty 6x7 board
    const board: Board = Array(this.ROWS)
      .fill(null)
      .map(() => Array(this.COLS).fill(null));

    const gameState: GameState = {
      id: this.generateGameId(),
      type: 'connect4',
      players: players.map((p, i) => ({
        ...p,
        role: i === 0 ? 'red' : 'yellow', // Player 1 is Red, Player 2 is Yellow
      })),
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board,
      metadata: {
        moveHistory: [],
        lastMove: null, // { col: number, row: number }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  validateMove(move: Move, state: GameState): ValidationResult {
    // Check turn
    if (move.playerId !== state.currentTurn) {
      return { valid: false, reason: 'Not your turn' };
    }

    // Check move type
    if (move.type !== 'drop') {
      return { valid: false, reason: 'Invalid move type' };
    }

    const { col } = move.data as { col: number };

    // Check column bounds
    if (typeof col !== 'number' || col < 0 || col >= this.COLS) {
      return { valid: false, reason: 'Invalid column' };
    }

    // Check if column is full
    const board = state.board as Board;
    if (board[0][col] !== null) {
      return { valid: false, reason: 'Column is full' };
    }

    return { valid: true };
  }

  applyMove(move: Move, state: GameState): GameState {
    const { col } = move.data as { col: number };
    // Deep copy board
    const board = (state.board as Board).map((row) => [...row]);
    const player = state.players.find((p) => p.id === move.playerId);

    if (!player?.role) throw new Error('Invalid player role');

    // Find first empty row from bottom (index ROWS-1) up to top (index 0)
    let rowIndex = -1;
    for (let r = this.ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) {
        board[r][col] = player.role as CellValue;
        rowIndex = r;
        break;
      }
    }

    if (rowIndex === -1) throw new Error('Column is full (validation failed unexpectedly)');

    const newState: GameState = {
      ...state,
      board,
      currentTurn: this.getNextPlayer(state),
      metadata: {
        ...state.metadata,
        lastMove: { col, row: rowIndex },
        moveHistory: [
          ...(state.metadata.moveHistory as unknown[]),
          { playerId: move.playerId, col, row: rowIndex },
        ] as unknown[],
      },
      updatedAt: new Date(),
    };

    // Check Winner
    const winnerCheck = this.checkWinner(newState);
    if (winnerCheck.finished) {
      newState.status = 'finished';
      newState.winner = winnerCheck.winner;
    }

    this.state = newState;
    return newState;
  }

  checkWinner(state: GameState): WinnerResult {
    const board = state.board as Board;

    // Check horizontal, vertical, diagonal
    // Directions: [rowDelta, colDelta]
    // Horizontal (0, 1)
    // Vertical (1, 0)
    // Diagonal Down-Right (1, 1)
    // Diagonal Down-Left (1, -1)

    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const color = board[r][c];
        if (!color) continue;

        for (const [dr, dc] of directions as number[][]) {
          if (this.checkDirection(board, r, c, dr, dc, color)) {
            const winner = state.players.find((p) => p.role === color);
            return { finished: true, winner: winner?.id || null };
          }
        }
      }
    }

    // Check Draw (Board full)
    const isFull = board.every((row) => row.every((cell) => cell !== null));
    if (isFull) {
      return { finished: true, winner: 'draw' };
    }

    return { finished: false, winner: null };
  }

  private checkDirection(
    board: Board,
    r: number,
    c: number,
    dr: number,
    dc: number,
    color: string
  ): boolean {
    // Check 4 in a row starting at r,c in direction dr,dc
    // Optimization: Only check "forward" directions, loop covers all start points

    for (let i = 1; i < 4; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;

      if (nr < 0 || nr >= this.ROWS || nc < 0 || nc >= this.COLS) return false;
      if (board[nr][nc] !== color) return false;
    }
    return true;
  }

  getValidMoves(state: GameState): Move[] {
    const validMoves: Move[] = [];
    const board = state.board as Board;

    for (let c = 0; c < this.COLS; c++) {
      if (board[0][c] === null) {
        validMoves.push({
          playerId: state.currentTurn,
          type: 'drop',
          data: { col: c },
          timestamp: Date.now(),
        });
      }
    }

    return validMoves;
  }
}
