/**
 * LudoEngine.ts
 * Lifecycle FSM with extra turns (Audit M2, M3), chained 6s penalty, and skipped players (Audit M5).
 */

import { GameState } from '@/types/websocket';
import { GameAction, RulesEngine } from './RulesEngine';
import { DiceEngine } from './DiceEngine';
import { TokenController } from './TokenController';
import { GameStateManager } from './GameStateManager';

export class LudoEngine {
  private manager: GameStateManager;

  constructor(initialState: GameState) {
    this.manager = new GameStateManager(initialState);
    if (!this.manager.getState().consecutiveSixes) {
      this.manager.update({ consecutiveSixes: 0 });
    }
  }

  handleAction(action: GameAction): GameState {
    const state = this.manager.getState();
    const validation = RulesEngine.validate(state, action);
    if (!validation.valid) {
      console.warn('[LudoEngine] Invalid action:', validation.reason);
      return state;
    }

    switch (action.type) {
      case 'REQUEST_ROLL':
        this.processRoll(action.playerId);
        break;
      case 'MOVE_TOKEN':
        this.processMove(action);
        break;
    }

    return this.manager.getState();
  }

  private processRoll(playerId: string) {
    const val = DiceEngine.roll();
    const state = this.manager.getState();

    let consec = state.consecutiveSixes || 0;
    if (val === 6) consec++;
    else consec = 0;

    // Audit M2: Forfeit three 6s
    if (consec === 3) {
      this.manager.update({
        diceValue: 6,
        diceRolled: false,
        consecutiveSixes: 0,
        lastAction: { type: 'ROLL', playerId, data: { value: 6, forfeit: true } },
      });
      this.passTurn();
      return;
    }

    this.manager.update({
      diceValue: val,
      diceRolled: true,
      consecutiveSixes: consec,
      lastAction: { type: 'ROLL', playerId, data: { value: val } },
    });
  }

  private processMove(action: {
    playerId: string;
    tokenId: number;
    fromCell: number;
    toCell: number;
  }) {
    const state = this.manager.getState();
    const player = state.players.find((p) => p.id === action.playerId);
    if (!player || !player.color || !state.tokens) return;

    const newTokens = { ...state.tokens };
    const colorTokens = [...newTokens[player.color]];
    colorTokens[action.tokenId] = action.toCell;
    newTokens[player.color] = colorTokens;

    let extraTurn = false;

    // Audit M2: Rolling a 6 grants bonus
    if (state.diceValue === 6) extraTurn = true;

    // Home Entry Bonus (Reached 58)
    if (action.toCell === TokenController.FINISHED_POS) extraTurn = true;

    // Audit M3: Capture bonus
    const globalIndex = TokenController.getGlobalIndex(action.toCell, player.color);
    if (globalIndex !== null) {
      const captures = TokenController.checkCaptures(globalIndex, player.color, newTokens);
      if (captures.length > 0) {
        extraTurn = true;
        captures.forEach(([vicColor, vicIdx]) => {
          newTokens[vicColor][vicIdx] = TokenController.YARD_POS;
        });
      }
    }

    this.manager.update({
      tokens: newTokens,
      diceRolled: false,
      diceValue: extraTurn ? state.diceValue : 0,
      lastAction: {
        type: 'MOVE',
        playerId: action.playerId,
        data: { tokenId: action.tokenId, from: action.fromCell, to: action.toCell },
      },
    });

    if (RulesEngine.isTerminal(this.manager.getState())) {
      this.manager.update({
        isActive: false,
        winner: RulesEngine.getWinner(this.manager.getState()),
      });
    } else {
      if (!extraTurn) {
        this.passTurn();
      } else {
        this.manager.update({ diceValue: 0, diceRolled: false });
      }
    }
  }

  public passTurn(): GameState {
    const state = this.manager.getState();
    const players = state.players;
    const currentIndex = players.findIndex((p) => p.id === state.currentTurn);

    // Audit M5: Skip finished players
    let nextIndex = (currentIndex + 1) % players.length;
    let candidatesChecked = 0;
    while (candidatesChecked < players.length) {
      const candidate = players[nextIndex];
      const isFinished = state.tokens?.[candidate.color!]?.every(
        (pos) => pos === TokenController.FINISHED_POS
      );
      if (!isFinished) break;
      nextIndex = (nextIndex + 1) % players.length;
      candidatesChecked++;
    }

    this.manager.update({
      currentTurn: players[nextIndex].id,
      diceRolled: false,
      diceValue: 0,
      consecutiveSixes: 0,
      turnDeadlineTs: Date.now() + 30000,
    });

    return this.manager.getState();
  }

  public hasPossibleMoves(playerId: string, diceValue: number): boolean {
    const state = this.manager.getState();
    const player = state.players.find((p) => p.id === playerId);
    if (!player || !player.color || !state.tokens) return false;

    const tokens = state.tokens[player.color];
    const validationResults = tokens.map((pos, idx) => {
      if (pos === TokenController.FINISHED_POS) return false;
      const nextPos = TokenController.calculateNextPosition(pos, diceValue);
      const action = {
        type: 'MOVE_TOKEN',
        playerId,
        tokenId: idx,
        fromCell: pos,
        toCell: nextPos,
      } as GameAction;
      return RulesEngine.validate(state, action).valid;
    });

    return validationResults.some((result) => result);
  }

  getState(): GameState {
    return this.manager.getState();
  }
}
