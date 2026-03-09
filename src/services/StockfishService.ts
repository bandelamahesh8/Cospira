import { logger } from '@/utils/logger';

// We'll use the public URL for the stockfish worker
const STOCKFISH_WORKER_PATH = '/stockfish.js';

export class StockfishService {
  private worker: Worker | null = null;
  private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  private onMove: ((move: string) => void) | null = null;

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.difficulty = difficulty;
    this.init();
  }

  private init() {
    try {
      // Create a web worker from the public stockfish.js file
      // Since we installed via npm, we might need to rely on the bundler moving it or referencing it
      // For now, attempting to use the file if it exists in public or via simple fetch
      // If run locally, user might need to ensure stockfish.js is in public/ folder.

      // Attempting to resolve via standard worker construction
      // Note: Vite might need specific worker import query

      // Fallback: Check if window.Stockfish exists (if loaded via script tag)
      // Otherwise assumes it's available at the root
      this.worker = new Worker(STOCKFISH_WORKER_PATH);

      this.worker.onmessage = (event) => {
        const line = event.data;
        if (typeof line === 'string') {
          if (line.startsWith('bestmove')) {
            const move = line.split(' ')[1];
            if (this.onMove && move) {
              this.onMove(move);
            }
          }
        }
      };

      this.worker.postMessage('uci');
      this.configureDifficulty();
    } catch (error) {
      logger.error('Failed to initialize Stockfish worker:', error);
    }
  }

  private configureDifficulty() {
    if (!this.worker) return;

    // Configure Stockfish levels
    // Skill Level: 0-20
    const skillLevel = {
      easy: 1,
      medium: 8,
      hard: 20,
    }[this.difficulty];

    this.worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
    // Note: depth is used in go command, not setoption.
    // 'Skill Level' limits strength.

    this.worker.postMessage(`setoption name MultiPV value 1`);
  }

  public setDifficulty(level: 'easy' | 'medium' | 'hard') {
    this.difficulty = level;
    this.configureDifficulty();
  }

  public getBestMove(fen: string, callback: (move: string) => void) {
    if (!this.worker) return;
    this.onMove = callback;
    this.worker.postMessage(`position fen ${fen}`);

    // Adjust depth based on difficulty
    const depth = {
      easy: 5,
      medium: 10,
      hard: 18,
    }[this.difficulty];

    this.worker.postMessage(`go depth ${depth}`);
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
    }
  }
}
