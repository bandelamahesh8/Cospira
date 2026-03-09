import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

// --- Constants ---
const WORDS = [
  'BATTLE',
  'GAMING',
  'PLAYER',
  'WINNER',
  'JUNGLE',
  'PUZZLE',
  'ARDENT',
  'BRIGHT',
  'CASTLE',
  'DRAGON',
  'EMPIRE',
  'FOREST',
  'GALAXY',
  'HEROIC',
  'ISLAND',
  'JUMPER',
  'KNIGHT',
  'LEGEND',
  'MASTER',
  'NATURE',
  'ORANGE',
  'PLANET',
  'QUESTS',
  'ROCKET',
  'SHIELD',
  'TEMPLE',
  'UNITED',
  'VICTORY',
  'WONDER',
  'YELLOW',
  'ARCADE',
  'BOSSES',
  'CAMERA',
  'DAMAGE',
  'ENERGY',
  'FINISH',
  'GLOBAL',
  'HEALTH',
  'IMPACT',
  'JOYPAD',
  'LEVELS',
  'MEMORY',
  'ONLINE',
  'PIXELS',
  'RECORD',
  'SCREEN',
  'TARGET',
  'UNLOCK',
  'VIDEO',
  'WORLD',
];

export interface WordBattleGameState extends GameState {
  currentWord: string; // The answer (in uppercase)
  scrambledWord: string; // The challenge
  round: number; // 0 to 4 (5 rounds)
  scores: Record<string, number>; // playerId -> score
  maxRounds: number;
}

export class WordBattleEngine extends BaseGameEngine {
  initGame(players: Player[]): WordBattleGameState {
    // Select first word
    const startWord = this.getRandomWord();

    // Initialize scores
    const scores: Record<string, number> = {};
    players.forEach((p) => (scores[p.id] = 0));

    const gameState: WordBattleGameState = {
      id: this.generateGameId(),
      type: 'wordbattle',
      players: players,
      currentTurn: players[0].id, // Not strictly turn based, but used for generic compatibility
      status: 'active',
      winner: null,
      board: null,
      currentWord: startWord,
      scrambledWord: this.scramble(startWord),
      round: 1,
      maxRounds: 5,
      scores: scores,
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

  private getRandomWord(): string {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }

  private scramble(word: string): string {
    const arr = word.split('');
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const scrambled = arr.join('');
    // Ensure it's not the same as original
    if (scrambled === word && word.length > 1) return this.scramble(word);
    return scrambled;
  }

  validateMove(move: Move, state: WordBattleGameState): ValidationResult {
    // Anyone can guess at any time in this game mode
    if (!move.data || !move.data.guess) return { valid: false, reason: 'Missing guess' };
    return { valid: true };
  }

  applyMove(move: Move, state: WordBattleGameState): WordBattleGameState {
    const guess = (move.data.guess as string).toUpperCase().trim();

    if (guess === state.currentWord) {
      // CORRECT GUESS!
      // 1. Give Point
      state.scores[move.playerId] = (state.scores[move.playerId] || 0) + 1;

      // 2. Check Win Condition (Best of 5 means first to 3?)
      // Or just play 5 rounds. Let's play 5 fixed rounds.
      if (state.round >= state.maxRounds) {
        state.status = 'finished';
        // Determine Winner
        let maxScore = -1;
        let winnerId: string | null = null;
        state.players.forEach((p) => {
          if (state.scores[p.id] > maxScore) {
            maxScore = state.scores[p.id];
            winnerId = p.id;
          } else if (state.scores[p.id] === maxScore) {
            winnerId = 'draw';
          }
        });
        state.winner = winnerId;
      } else {
        // Next Round
        state.round++;
        const newWord = this.getRandomWord();
        state.currentWord = newWord;
        state.scrambledWord = this.scramble(newWord);
      }
    } else {
      // Wrong guess - nothing happens or maybe generic 'miss' event?
      // Ideally we only broadcast state change on correct guess or round end.
      // But for feedback, we might want to return 'invalid' but `applyMove` commits state.
      // So we just return state unchanged.
    }

    this.state = state;
    return state;
  }

  checkWinner(state: WordBattleGameState): WinnerResult {
    if (state.winner) return { finished: true, winner: state.winner };
    return { finished: false, winner: null };
  }
}
