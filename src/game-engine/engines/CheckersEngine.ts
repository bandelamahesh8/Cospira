import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

type PieceType = 'man' | 'king';
type PieceColor = 'red' | 'white';

interface CheckersPiece {
  type: PieceType;
  color: PieceColor;
}

type Board = (CheckersPiece | null)[][];

export class CheckersEngine extends BaseGameEngine {
  private readonly BOARD_SIZE = 8;

  initGame(players: Player[]): GameState {
    if (players.length !== 2) {
      throw new Error('Checkers requires exactly 2 players');
    }

    // Initialize 8x8 board
    // Red starts at top (rows 0-2), White at bottom (rows 5-7)
    // Dark squares only. (r+c)%2 !== 0 usually? Or === 1.
    // Let's say top-left (0,0) is light, (0,1) is dark.
    // Pieces on dark squares.
    
    const board: Board = Array(this.BOARD_SIZE).fill(null).map(() => Array(this.BOARD_SIZE).fill(null));

    // Place pieces
    for (let r = 0; r < this.BOARD_SIZE; r++) {
      for (let c = 0; c < this.BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) { // Dark squares
             if (r < 3) board[r][c] = { type: 'man', color: 'red' };
             if (r > 4) board[r][c] = { type: 'man', color: 'white' };
        }
      }
    }

    const gameState: GameState = {
      id: this.generateGameId(),
      type: 'checkers',
      players: players.map((p, i) => ({
        ...p,
        role: i === 0 ? 'white' : 'red', // Player 1 is White (bottom, moves first usually in Chess, but Checkers Red often first? actually Black/Red. Let's stick to White/Red. Standard usually 'Black' moves first, here we'll let P1 (White) move first to match Chess convention)
      })),
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board,
      metadata: {
        moveHistory: [],
        mustJump: false, // track if current player is in a multi-jump sequence
        jumpSource: null, // {r, c} if locked to a piece
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  validateMove(move: Move, state: GameState): ValidationResult {
    if (move.playerId !== state.currentTurn) return { valid: false, reason: 'Not your turn' };
    
    // Check basic structural validity handled by getValidMoves usually, 
    // but here we double check against the generated valid moves for robustness.
    const validMoves = this.getValidMoves(state);
    
    // Simple check: does this move exist in valid moves?
    // Move format: { from: {r, c}, to: {r, c} }
    const targetMove = validMoves.find(m => 
        m.data.from.r === move.data.from.r && 
        m.data.from.c === move.data.from.c &&
        m.data.to.r === move.data.to.r &&
        m.data.to.c === move.data.to.c
    );

    if (!targetMove) return { valid: false, reason: 'Invalid move' };

    return { valid: true };
  }

  applyMove(move: Move, state: GameState): GameState {
    const { from, to } = move.data;
    const board = (state.board as Board).map(row => row.map(p => p ? {...p} : null)); // Deep copy
    const piece = board[from.r][from.c];

    if (!piece) throw new Error('No piece at source');

    // Move piece
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;

    // Check Capture
    const isCapture = Math.abs(to.r - from.r) === 2;
    let nextTurn = this.getNextPlayer(state);
    let mustJump = false;
    let jumpSource = null;

    if (isCapture) {
        const midR = (from.r + to.r) / 2;
        const midC = (from.c + to.c) / 2;
        board[midR][midC] = null; // Remove captured piece

        // Check for multi-jump
        // If capture happened, check if THIS piece can capture again
        if (this.canCapture(board, to.r, to.c, piece)) {
            nextTurn = state.currentTurn; // Still my turn
            mustJump = true;
            jumpSource = { r: to.r, c: to.c };
        }
    }

    // Promotion
    if (piece.type === 'man') {
        if ((piece.color === 'white' && to.r === 0) || (piece.color === 'red' && to.r === 7)) {
            piece.type = 'king';
            // Promotion ends turn even if multi-jump was possible? Standard rules vary.
            // Usually promotion ends turn immediately.
            nextTurn = this.getNextPlayer(state); 
            mustJump = false;
            jumpSource = null;
        }
    }

    const newState: GameState = {
      ...state,
      board,
      currentTurn: nextTurn,
      metadata: {
        ...state.metadata,
        moveHistory: [...state.metadata.moveHistory, move],
        mustJump,
        jumpSource
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
    
    let redCount = 0;
    let whiteCount = 0;

    // Count pieces and check existence
    for (let r = 0; r < this.BOARD_SIZE; r++) {
       for (let c = 0; c < this.BOARD_SIZE; c++) {
           const p = board[r][c];
           if (p?.color === 'red') redCount++;
           if (p?.color === 'white') whiteCount++;
       }
    }

    if (redCount === 0) return { finished: true, winner: state.players.find(p => p.role === 'white')?.id || null };
    if (whiteCount === 0) return { finished: true, winner: state.players.find(p => p.role === 'red')?.id || null };

    // Check if current player has moves (Stalemate = Loss)
    const validMoves = this.getValidMoves(state);
    if (validMoves.length === 0) {
        // Current player loses
        const winner = state.players.find(p => p.id !== state.currentTurn);
        return { finished: true, winner: winner?.id || null };
    }

    return { finished: false, winner: null };
  }

  getValidMoves(state: GameState): Move[] {
    const board = state.board as Board;
    const moves: Move[] = [];
    const player = state.players.find(p => p.id === state.currentTurn);
    if (!player?.role) return [];
    
    const color = player.role as PieceColor;
    const { mustJump, jumpSource } = state.metadata;

    // If locked into a multi-jump, only check that piece
    if (mustJump && jumpSource) {
        this.getJumpsForPiece(board, jumpSource.r, jumpSource.c, board[jumpSource.r][jumpSource.c]!, moves, state.currentTurn);
        return moves;
    }

    // 1. Calculate all jumps first (forced capture rule usually applies, but let's be flexible or calculate all)
    // If strict rules: if any jump exists, ONLY jumps are valid.
    const allJumps: Move[] = [];
    const allMoves: Move[] = [];

    for (let r = 0; r < this.BOARD_SIZE; r++) {
        for (let c = 0; c < this.BOARD_SIZE; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                this.getJumpsForPiece(board, r, c, piece, allJumps, state.currentTurn);
                this.getSimpleMovesForPiece(board, r, c, piece, allMoves, state.currentTurn);
            }
        }
    }

    // Force Jump Rule: If captures exist, you must capture.
    if (allJumps.length > 0) return allJumps;
    return allMoves;
  }

  private getSimpleMovesForPiece(board: Board, r: number, c: number, piece: CheckersPiece, moves: Move[], playerId: string) {
      const directions = this.getDirections(piece);
      
      for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          
          if (this.isValidPos(nr, nc) && board[nr][nc] === null) {
              moves.push({
                  playerId,
                  type: 'move',
                  data: { from: {r, c}, to: {r: nr, c: nc} },
                  timestamp: Date.now()
              });
          }
      }
  }

  private getJumpsForPiece(board: Board, r: number, c: number, piece: CheckersPiece, moves: Move[], playerId: string) {
      const directions = this.getDirections(piece);

      for (const [dr, dc] of directions) {
          const midR = r + dr;
          const midC = c + dc;
          const toR = r + dr * 2;
          const toC = c + dc * 2;

          if (this.isValidPos(toR, toC)) {
              const midPiece = board[midR][midC];
              const destCell = board[toR][toC];

              if (midPiece && midPiece.color !== piece.color && destCell === null) {
                  moves.push({
                      playerId,
                      type: 'capture',
                      data: { from: {r, c}, to: {r: toR, c: toC} },
                      timestamp: Date.now()
                  });
              }
          }
      }
  }

  private canCapture(board: Board, r: number, c: number, piece: CheckersPiece): boolean {
       const directions = this.getDirections(piece);
       for (const [dr, dc] of directions) {
          const midR = r + dr;
          const midC = c + dc;
          const toR = r + dr * 2;
          const toC = c + dc * 2;

          if (this.isValidPos(toR, toC)) {
              const midPiece = board[midR][midC];
              const destCell = board[toR][toC];
              if (midPiece && midPiece.color !== piece.color && destCell === null) {
                  return true;
              }
          }
       }
       return false;
  }

  private getDirections(piece: CheckersPiece): number[][] {
      const dirs: number[][] = [];
      if (piece.type === 'king') {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      } else {
          // White moves UP (-1), Red moves DOWN (+1)
          const forward = piece.color === 'white' ? -1 : 1;
          dirs.push([forward, -1], [forward, 1]);
      }
      return dirs;
  }

  private isValidPos(r: number, c: number): boolean {
      return r >= 0 && r < this.BOARD_SIZE && c >= 0 && c < this.BOARD_SIZE;
  }
}
