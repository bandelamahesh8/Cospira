import { ChessEngine } from './engines/ChessEngine';
import { TicTacToeEngine } from './engines/TicTacToeEngine';
import { SnakeLadderEngine } from './engines/SnakeLadderEngine';
import { BilliardsEngine } from './engines/BilliardsEngine';
import { CheckersEngine } from './engines/CheckersEngine';
import { ConnectFourEngine } from './engines/ConnectFourEngine';
import { TicTacToe5x5Engine } from './engines/TicTacToe5x5Engine';
import { TicTacToe7x7Engine } from './engines/TicTacToe7x7Engine';
import { UltimateTicTacToeEngine } from './engines/UltimateTicTacToeEngine';
import { UnoEngine } from './engines/UnoEngine';
import { WordBattleEngine } from './engines/WordBattleEngine';
import { GameEngine } from './core/GameEngine.interface';

/**
 * Game Engine Factory
 *
 * Creates the appropriate game engine based on game type.
 * Centralizes engine instantiation for consistency.
 */
export function createGameEngine(gameType: string): GameEngine {
  switch (gameType) {
    case 'chess':
      return new ChessEngine();

    case 'xoxo':
    case 'tictactoe':
      return new TicTacToeEngine();

    case 'tictactoe5x5':
      return new TicTacToe5x5Engine();

    case 'tictactoe7x7':
      return new TicTacToe7x7Engine();

    case 'ultimate-tictactoe':
      return new UltimateTicTacToeEngine();

    case 'snakeladder':
      return new SnakeLadderEngine();

    case 'billiards':
      return new BilliardsEngine();

    case 'checkers':
      return new CheckersEngine();

    case 'connect4':
    case 'connectfour':
      return new ConnectFourEngine();

    case 'uno':
      return new UnoEngine();

    case 'wordbattle':
      return new WordBattleEngine();

    default:
      throw new Error(`Unknown game type: ${gameType}`);
  }
}

/**
 * Validate game type
 */
export function isValidGameType(gameType: string): boolean {
  return [
    'chess',
    'xoxo',
    'tictactoe',
    'tictactoe5x5',
    'tictactoe7x7',
    'ultimate-tictactoe',
    'snakeladder',
    'billiards',
    'checkers',
    'connect4',
    'connectfour',
    'uno',
    'wordbattle',
  ].includes(gameType);
}

/**
 * Get all supported game types
 */
export function getSupportedGameTypes(): string[] {
  return [
    'chess',
    'xoxo',
    'tictactoe',
    'tictactoe5x5',
    'tictactoe7x7',
    'ultimate-tictactoe',
    'snakeladder',
    'billiards',
    'checkers',
    'connect4',
    'uno',
    'wordbattle',
  ];
}
