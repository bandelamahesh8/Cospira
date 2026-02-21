import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

interface LudoToken {
  id: string;
  playerId: string;
  position: number; // -1 = home, 0-51 = board, 52-57 = finish lane
  color: 'red' | 'blue' | 'green' | 'yellow';
}

interface LudoBoard {
  tokens: LudoToken[];
  diceValue: number | null;
  lastRoll: number | null;
}

/**
 * Ludo Game Engine
 * 
 * Implements the universal GameEngine interface for Ludo.
 * Supports 2-4 players with standard Ludo rules.
 */
export class LudoEngine extends BaseGameEngine {
  private readonly BOARD_SIZE = 52;
  private readonly TOKENS_PER_PLAYER = 4;
  private readonly SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
  
  private readonly PLAYER_COLORS: Array<'red' | 'blue' | 'green' | 'yellow'> = 
    ['red', 'blue', 'green', 'yellow'];

  initGame(players: Player[], config?: { teamMode?: boolean }): GameState {
    if (players.length < 2 || players.length > 4) {
      throw new Error('Ludo requires 2-4 players');
    }

    // Initialize tokens for each player
    const tokens: LudoToken[] = [];
    const isTeamMode = config?.teamMode && players.length === 4;

    // Team Assignment: P0 & P2 (Red/Yellow) vs P1 & P3 (Green/Blue)
    // Based on index in players array which corresponds to colors:
    // 0: Red, 1: Green, 2: Yellow, 3: Blue (After color fix below)
    
    // Changing colors to match UI layout: Red -> Green -> Yellow -> Blue
    const UI_COLORS: Array<'red' | 'green' | 'yellow' | 'blue'> = ['red', 'green', 'yellow', 'blue'];

    players.forEach((player, playerIndex) => {
      const color = UI_COLORS[playerIndex];
      let teamId = player.id; // Default to individual
      
      if (isTeamMode) {
        // Red (0) & Yellow (2) are Team A
        // Green (1) & Blue (3) are Team B
        if (playerIndex === 0 || playerIndex === 2) teamId = 'team_a';
        else teamId = 'team_b';
      }

      for (let i = 0; i < this.TOKENS_PER_PLAYER; i++) {
        tokens.push({
          id: `${player.id}_token_${i}`,
          playerId: player.id,
          position: -1, // Start in home
          color,
        });
      }
      
      // Update player object with teamId if needed (mostly for reference)
      player.teamId = teamId;
      player.role = color;
    });

    const board: LudoBoard = {
      tokens,
      diceValue: null,
      lastRoll: null,
    };

    const gameState: GameState = {
      id: this.generateGameId(),
      type: 'ludo',
      players: players, // players are mutated above
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board,
      metadata: {
        moveHistory: [],
        rollCount: 0,
        isTeamMode,
        teamScores: isTeamMode ? { team_a: 0, team_b: 0 } : undefined
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  validateMove(move: Move, state: GameState): ValidationResult {
    const board = state.board as LudoBoard;

    // Check if it's the player's turn
    if (move.playerId !== state.currentTurn) {
      return { valid: false, reason: 'Not your turn' };
    }

    // Check if dice has been rolled
    if (!board.diceValue) {
      return { valid: false, reason: 'Roll the dice first' };
    }

    if (move.type === 'roll') {
      return { valid: true };
    }

    if (move.type === 'move-token') {
      const { tokenId } = move.data;
      const token = board.tokens.find((t) => t.id === tokenId);

      if (!token) {
        return { valid: false, reason: 'Token not found' };
      }

      if (token.playerId !== move.playerId) {
        return { valid: false, reason: 'Not your token' };
      }

      // Check if token can move out of home (needs 6)
      if (token.position === -1 && board.diceValue !== 6) {
        return { valid: false, reason: 'Need 6 to start' };
      }

      return { valid: true };
    }

    return { valid: false, reason: 'Invalid move type' };
  }

  applyMove(move: Move, state: GameState): GameState {
    const board = { ...(state.board as LudoBoard) };
    const tokens = [...board.tokens];

    if (move.type === 'roll') {
      const diceValue = Math.floor(Math.random() * 6) + 1;
      board.diceValue = diceValue;
      board.lastRoll = diceValue;

      const newState: GameState = {
        ...state,
        board: { ...board, tokens },
        metadata: {
          ...state.metadata,
          rollCount: state.metadata.rollCount + 1,
          moveHistory: [...state.metadata.moveHistory, { type: 'roll', value: diceValue }],
        },
        updatedAt: new Date(),
      };

      this.state = newState;
      return newState;
    }

    if (move.type === 'move-token') {
      const { tokenId } = move.data;
      const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
      const token = tokens[tokenIndex];

      if (token.position === -1) {
        // Move out of home
        token.position = 0;
      } else {
        // Move forward
        token.position += board.diceValue!;
      }

      // Check for capture
      const capturedTokenIndex = tokens.findIndex(
        (t) =>
          t.id !== tokenId &&
          t.position === token.position &&
          !this.SAFE_POSITIONS.includes(token.position)
      );

      if (capturedTokenIndex !== -1) {
        // In Team Mode, don't capture teammates
        const capturedToken = tokens[capturedTokenIndex];
        const capturer = state.players.find(p => p.id === token.playerId);
        const victim = state.players.find(p => p.id === capturedToken.playerId);
        
        const areTeammates = state.metadata.isTeamMode && capturer?.teamId === victim?.teamId;

        if (!areTeammates) {
             tokens[capturedTokenIndex].position = -1; // Send back home
        }
      }

      tokens[tokenIndex] = token;

      // Determine next turn
      let nextPlayerId = state.currentTurn;
      if (board.diceValue !== 6) {
          nextPlayerId = this.getNextPlayer(state);
          
          // In Team Mode, skip finished players
          // Actually, standard Ludo simply passes turn. 
          // If a player is finished, we should skip them?
          // Let's check finish status of next player
          let attempts = 0;
          while (attempts < 4) { // Prevent infinite loop
              // const nextPlayer = state.players.find(p => p.id === nextPlayerId);
              const playerTokens = tokens.filter(t => t.playerId === nextPlayerId);
              const isFinished = playerTokens.every(t => t.position >= 52);
              
              if (!isFinished) break;
              nextPlayerId = this.getNextPlayer({ ...state, currentTurn: nextPlayerId });
              attempts++;
          }
      }

      const newState: GameState = {
        ...state,
        board: { ...board, tokens, diceValue: null },
        currentTurn: nextPlayerId,
        metadata: {
          ...state.metadata,
          moveHistory: [...state.metadata.moveHistory, { type: 'move', tokenId, position: token.position }],
        },
        updatedAt: new Date(),
      };

      // Check for winner
      const winnerCheck = this.checkWinner(newState);
      if (winnerCheck.finished) {
        newState.status = 'finished';
        newState.winner = winnerCheck.winner;
      }

      this.state = newState;
      return newState;
    }

    return state;
  }

  checkWinner(state: GameState): WinnerResult {
    const board = state.board as LudoBoard;

    if (state.metadata.isTeamMode) {
        // Check Team A (Red/Yellow)
        const teamAIds = state.players.filter(p => p.teamId === 'team_a').map(p => p.id);
        const teamATokens = board.tokens.filter(t => teamAIds.includes(t.playerId));
        const teamAFinished = teamATokens.every(t => t.position >= 52);
        
        if (teamAFinished && teamAIds.length > 0) return { finished: true, winner: 'Team A' };

        // Check Team B (Green/Blue)
        const teamBIds = state.players.filter(p => p.teamId === 'team_b').map(p => p.id);
        const teamBTokens = board.tokens.filter(t => teamBIds.includes(t.playerId));
        const teamBFinished = teamBTokens.every(t => t.position >= 52);

        if (teamBFinished && teamBIds.length > 0) return { finished: true, winner: 'Team B' };

        return { finished: false, winner: null };
    }

    // Individual Mode
    for (const player of state.players) {
      const playerTokens = board.tokens.filter((t) => t.playerId === player.id);
      const allFinished = playerTokens.every((t) => t.position >= 52);

      if (allFinished) {
        return { finished: true, winner: player.id };
      }
    }

    return { finished: false, winner: null };
  }

  getValidMoves(state: GameState): Move[] {
    const board = state.board as LudoBoard;
    const validMoves: Move[] = [];

    if (!board.diceValue) {
      validMoves.push({
        playerId: state.currentTurn,
        type: 'roll',
        data: {},
        timestamp: Date.now(),
      });
      return validMoves;
    }

    const playerTokens = board.tokens.filter((t) => t.playerId === state.currentTurn);

    playerTokens.forEach((token) => {
      // Logic for valid moves (same as before)
      if (token.position === -1 && board.diceValue === 6) {
        validMoves.push({
          playerId: state.currentTurn,
          type: 'move-token',
          data: { tokenId: token.id },
          timestamp: Date.now(),
        });
      } else if (token.position >= 0 && token.position + board.diceValue! <= 57) {
        validMoves.push({
          playerId: state.currentTurn,
          type: 'move-token',
          data: { tokenId: token.id },
          timestamp: Date.now(),
        });
      }
    });

    return validMoves;
  }
}
