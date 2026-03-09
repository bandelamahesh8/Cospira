import { roomEventBus, BreakoutEventMap } from './EventBus';
import { ModeratorAI } from './ai/ModeratorAI';
import { OptimizerAI } from './ai/OptimizerAI';
import { SummarizerAI } from './ai/SummarizerAI';

/**
 * AIEngine (Orchestrator)
 * ─────────────────────────────────────────────────────────────
 * Advanced Neural Command Architecture.
 * Coordinates specialized AI modules to monitor, optimize,
 * and summarize organization activity in real-time.
 */
class AIEngine {
  private static instance: AIEngine;
  private isListening = false;

  private moderator = ModeratorAI.getInstance();
  private optimizer = OptimizerAI.getInstance();
  private summarizer = SummarizerAI.getInstance();

  private constructor() {}

  public static getInstance(): AIEngine {
    if (!AIEngine.instance) {
      AIEngine.instance = new AIEngine();
    }
    return AIEngine.instance;
  }

  public init() {
    if (this.isListening) return;

    // Subscribe to core events for delegation
    roomEventBus.on('CHAT_MESSAGE', this.handleChatMessage);
    roomEventBus.on('USER_JOIN', this.handleUserJoin);

    this.isListening = true;
    console.warn('[AIEngine] Neural Command Architecture Active (Multi-Module)');
  }

  public destroy() {
    if (!this.isListening) return;
    roomEventBus.off('CHAT_MESSAGE', this.handleChatMessage);
    roomEventBus.off('USER_JOIN', this.handleUserJoin);
    this.isListening = false;
  }

  private handleChatMessage = (payload: BreakoutEventMap['CHAT_MESSAGE']) => {
    // 1. Behavior & Conflict Analysis
    this.moderator.evaluateMessage(payload);

    // 2. Intelligence & Summary Extraction
    this.summarizer.evaluateMessage(payload);
  };

  private handleUserJoin = (payload: BreakoutEventMap['USER_JOIN']) => {
    // 3. Operational Optimization
    this.optimizer.handleJoin(payload);
  };
}

export const aiEngine = AIEngine.getInstance();
