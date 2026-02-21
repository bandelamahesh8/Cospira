
import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

type CellValue = 'X' | 'O' | null;
type MiniBoardState = CellValue | 'draw'; // 'draw' if full without winner
type UltimateBoard = {
  cells: CellValue[][]; // 9x9 grid
  macroBoard: MiniBoardState[]; // 3x3 grid representing mini-board winners
  activeBoxIndex: number | null; // Index of the mini-board where next move must occur (0-8), or null if any
};

/**
 * Ultimate Tic-Tac-Toe Game Engine
 * 
 * Rules:
 * 1. 9x9 grid divided into 9 mini-boards (3x3).
 * 2. Winning a mini-board marks that board on the macro-board.
 * 3. A move determines which mini-board the next player must play in.
 * 4. If target mini-board is full/won, player can play anywhere.
 * 5. First to win the macro-board (3 in a row) wins the game.
 */
export class UltimateTicTacToeEngine extends BaseGameEngine {
  initGame(players: Player[]): GameState {
    if (players.length !== 2) {
      throw new Error('Ultimate Tic-Tac-Toe requires exactly 2 players');
    }

    const board: UltimateBoard = {
      cells: Array(9).fill(null).map(() => Array(9).fill(null)), // 9 boards of 9 cells
      macroBoard: Array(9).fill(null),
      activeBoxIndex: null, // Start with free move (or constrain to center? Standard is usually free or specified. Let's say free to start)
    };

    const gameState: GameState = {
      id: this.generateGameId(),
      type: 'ultimate-xoxo',
      players: players.map((p, i) => ({
        ...p,
        role: i === 0 ? 'X' : 'O',
      })),
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board,
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

  validateMove(move: Move, state: GameState): ValidationResult {
    const board = state.board as UltimateBoard;
    const { boardIndex, cellIndex } = move.data; // boardIndex (0-8), cellIndex (0-8)

    // Check turn
    if (move.playerId !== state.currentTurn) {
      return { valid: false, reason: 'Not your turn' };
    }

    // Check game status
    if (state.status !== 'active') {
      return { valid: false, reason: 'Game is not active' };
    }

    // Validate indices
    if (
      boardIndex < 0 || boardIndex > 8 ||
      cellIndex < 0 || cellIndex > 8
    ) {
      return { valid: false, reason: 'Invalid board positions' };
    }

    // Check active board constraint
    // If activeBoxIndex is not null, move MUST be in that board
    // UNLESS that board is already full/decided, in which case activeBoxIndex should have been set to null by previous turn processing?
    // Actually, usually we set activeBoxIndex. If waiting for next move:
    if (board.activeBoxIndex !== null && board.activeBoxIndex !== -1) {
      if (board.activeBoxIndex !== boardIndex) {
        return { valid: false, reason: 'Must play in the active mini-board' };
      }
    }

    // Check if target mini-board is already won or full
    // (Note: rule variations exist. Usually if sent to a won board, you can play anywhere. 
    // This engine should reset activeBoxIndex to null if the target is full/won immediately after the previous move.
    // So if activeBoxIndex is set, it means it IS valid to play there.)
    
    // Wait, if I am sent to board X, but board X is full, I can play anywhere.
    // My applyMove logic should handle setting activeBoxIndex to -1/null in that case.
    
    // Check cell vacancy
    if (board.cells[boardIndex][cellIndex] !== null) {
      return { valid: false, reason: 'Cell already occupied' };
    }

    // Check if the mini-board itself is already considered 'closed' (won or drawn) for gameplay?
    // Standard rule: Even if won, can you play in empty spots? 
    // Variation A: Once won, no more moves allowed in it. (Usually this).
    // Variation B: You can play to force opponent, but it doesn't change winner.
    // Let's go with Variation A: Cannot play in a completed mini-board.
    if (board.macroBoard[boardIndex] !== null) {
         // If activeBoxIndex was pointing here, it's a bug in previous turn logic or a very specific edge case.
         // If we follow the "sent to full board = free move" rule, activeBoxIndex should be null.
         // So if we are here and activeBoxIndex === boardIndex, it implies we thought it was playable.
         return { valid: false, reason: 'This mini-board is already completed' };
    }

    return { valid: true };
  }

  applyMove(move: Move, state: GameState): GameState {
    const board = JSON.parse(JSON.stringify(state.board)) as UltimateBoard; // Deep copy
    const { boardIndex, cellIndex } = move.data;
    const player = state.players.find(p => p.id === move.playerId);

    if (!player?.role) throw new Error('Invalid player');

    // 1. Place Piece
    board.cells[boardIndex][cellIndex] = player.role as CellValue;

    // 2. Check Mini-Board Win
    // If not already won, check if this move wins the mini-board
    if (board.macroBoard[boardIndex] === null) {
      const miniWinner = this.checkMiniBoardWinner(board.cells[boardIndex]);
      if (miniWinner) {
        board.macroBoard[boardIndex] = miniWinner as MiniBoardState;
      } else if (board.cells[boardIndex].every(c => c !== null)) {
        board.macroBoard[boardIndex] = 'draw';
      }
    }

    // 3. Determine Next Active Box
    // The cellIndex of the move determines the boardIndex of the next move.
    const nextTargetBoardIndex = cellIndex;
    
    // Check if the target board is valid (not full/won)
    if (board.macroBoard[nextTargetBoardIndex] !== null) {
      // Target board is already decided, so next player can play anywhere
      board.activeBoxIndex = null; 
    } else {
      // Constrain to target board
      board.activeBoxIndex = nextTargetBoardIndex;
    }

    // 4. Update State
    const newState: GameState = {
      ...state,
      board,
      currentTurn: this.getNextPlayer(state),
      metadata: {
        ...state.metadata,
        moveHistory: [...state.metadata.moveHistory, { playerId: move.playerId, boardIndex, cellIndex }],
        moveCount: state.metadata.moveCount + 1,
      },
      updatedAt: new Date(),
    };

    // 5. Check Macro Win
    const gameWinner = this.checkWinner(newState);
    if (gameWinner.finished) {
      newState.status = 'finished';
      newState.winner = gameWinner.winner;
    }

    this.state = newState;
    return newState;
  }

  checkWinner(state: GameState): WinnerResult {
    const board = state.board as UltimateBoard;
    const macro = board.macroBoard;

    // Check standard win patterns on macro board
    const WIN_PATTERNS = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diags
    ];

    for (const pattern of WIN_PATTERNS) {
      const [a, b, c] = pattern;
      if (macro[a] && macro[a] !== 'draw' && macro[a] === macro[b] && macro[a] === macro[c]) {
        // Find player with this role
        const winner = state.players.find(p => p.role === macro[a]);
        return { finished: true, winner: winner?.id || null };
      }
    }

    // Check Draw (Macro board full)
    if (macro.every(cell => cell !== null)) {
      return { finished: true, winner: 'draw' };
    }

    return { finished: false, winner: null };
  }

  checkMiniBoardWinner(cells: CellValue[]): CellValue {
    const WIN_PATTERNS = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (const pattern of WIN_PATTERNS) {
      const [a, b, c] = pattern;
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
        return cells[a];
      }
    }
    return null;
  }

  getValidMoves(state: GameState): Move[] {
    const board = state.board as UltimateBoard;
    const moves: Move[] = [];

    // If activeBoxIndex is null, checking all open boards
    const boardsToCheck = board.activeBoxIndex !== null 
      ? [board.activeBoxIndex] 
      : [0, 1, 2, 3, 4, 5, 6, 7, 8];

    boardsToCheck.forEach(bIdx => {
      // Should not be able to play in completed boards
      if (board.macroBoard[bIdx] === null) {
        board.cells[bIdx].forEach((cell, cIdx) => {
          if (cell === null) {
            moves.push({
              playerId: state.currentTurn,
              type: 'move',
              data: { boardIndex: bIdx, cellIndex: cIdx },
              timestamp: Date.now()
            });
          }
        });
      }
    });

    return moves;
  }
}
