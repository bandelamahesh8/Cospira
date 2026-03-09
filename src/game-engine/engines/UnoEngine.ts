import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'draw4';

export interface UnoCard {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface UnoGameState extends GameState {
  deck: UnoCard[];
  discardPile: UnoCard[];
  hands: Record<string, UnoCard[]>; // PlayerId -> Cards
  currentColor: CardColor;
  direction: 1 | -1; // 1 = Clockwise, -1 = Counter-Clockwise
  drawStack: number; // For stacking rules (future)
}

export class UnoEngine extends BaseGameEngine {
  initGame(players: Player[]): UnoGameState {
    const deck = this.generateDeck();
    const shuffledDeck = this.shuffle(deck);
    const hands: Record<string, UnoCard[]> = {};

    // Deal 7 cards to each player
    players.forEach((p) => {
      hands[p.id] = shuffledDeck.splice(0, 7);
    });

    // Start discard pile
    let firstCard = shuffledDeck.pop()!;
    // If first card is Wild/Draw4, reshuffle (simple rule for now)
    while (firstCard.color === 'wild') {
      shuffledDeck.push(firstCard);
      this.shuffle(shuffledDeck);
      firstCard = shuffledDeck.pop()!;
    }

    const gameState: UnoGameState = {
      id: this.generateGameId(),
      type: 'uno',
      players: players,
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board: null, // Not used in UNO
      deck: shuffledDeck,
      discardPile: [firstCard],
      hands,
      currentColor: firstCard.color,
      direction: 1,
      drawStack: 0,
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

  private generateDeck(): UnoCard[] {
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    const deck: UnoCard[] = [];

    colors.forEach((color) => {
      // 1 zero
      deck.push(this.createCard(color, '0'));

      // 2 or each 1-9
      for (let i = 1; i <= 9; i++) {
        deck.push(this.createCard(color, i.toString() as CardValue));
        deck.push(this.createCard(color, i.toString() as CardValue));
      }

      // 2 of each action
      ['skip', 'reverse', 'draw2'].forEach((val) => {
        deck.push(this.createCard(color, val as CardValue));
        deck.push(this.createCard(color, val as CardValue));
      });
    });

    // Wilds (4 each)
    for (let i = 0; i < 4; i++) {
      deck.push(this.createCard('wild', 'wild'));
      deck.push(this.createCard('wild', 'draw4'));
    }

    return deck;
  }

  private createCard(color: CardColor, value: CardValue): UnoCard {
    return {
      id: crypto.randomUUID(),
      color,
      value,
    };
  }

  private shuffle(deck: UnoCard[]): UnoCard[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  validateMove(move: Move, state: UnoGameState): ValidationResult {
    // Basic turn validation
    if (move.playerId !== state.currentTurn) return { valid: false, reason: 'Not your turn' };

    if (move.type === 'draw') return { valid: true };

    if (move.type === 'play') {
      const card = move.data.card as UnoCard;
      const topCard = state.discardPile[state.discardPile.length - 1];

      // Wilds are always valid
      if (card.color === 'wild') return { valid: true };

      // Color Match (using currentState.currentColor which handles Wild effects)
      if (card.color === state.currentColor) return { valid: true };

      // Value Match
      if (card.value === topCard.value) return { valid: true };

      return { valid: false, reason: 'Card does not match color or value' };
    }

    return { valid: false, reason: 'Invalid move type' };
  }

  applyMove(move: Move, state: UnoGameState): UnoGameState {
    const nextState = {
      ...state,
      hands: { ...state.hands },
      deck: [...state.deck],
      discardPile: [...state.discardPile],
    }; // Shallow copy parts

    // DRAW MOVE
    if (move.type === 'draw') {
      this.handleDraw(nextState, move.playerId, 1);
      // Drawing passes turn (in simple rules, or you can play if valid. Implementing 'Draw-Pas' for simplicity first)
      nextState.currentTurn = this.getNextPlayerId(nextState);
      this.state = nextState;
      return nextState;
    }

    // PLAY MOVE
    const card = move.data.card as UnoCard;
    const playerHand = nextState.hands[move.playerId];

    // Remove card from hand
    nextState.hands[move.playerId] = playerHand.filter((c) => c.id !== card.id);

    // Add to discard
    nextState.discardPile.push(card);

    // Update Color
    if (card.color === 'wild') {
      // Must specify picked color in move data
      nextState.currentColor = move.data.pickedColor || 'red';
    } else {
      nextState.currentColor = card.color;
    }

    // Apply Effects
    let skipNext = false;

    if (card.value === 'reverse') {
      if (nextState.players.length === 2) {
        skipNext = true; // Review rules: In 2 player, reverse acts like skip
      } else {
        nextState.direction *= -1;
      }
    }

    if (card.value === 'skip') {
      skipNext = true;
    }

    if (card.value === 'draw2') {
      const nextPlayerId = this.getNextPlayerId(nextState); // Check who is next
      this.handleDraw(nextState, nextPlayerId, 2);
      skipNext = true; // Victim loses turn
    }

    if (card.value === 'draw4') {
      const nextPlayerId = this.getNextPlayerId(nextState);
      this.handleDraw(nextState, nextPlayerId, 4);
      skipNext = true;
    }

    // Determine next player
    let nextPlayer = this.getNextPlayerId(nextState);
    if (skipNext) {
      // Calculate the player *after* the next one
      // We can cheatingly use getNextPlayerId on a temp state or implement index math
      // Easiest is to set currentTurn to next, then get next again.
      const tempState = { ...nextState, currentTurn: nextPlayer };
      nextPlayer = this.getNextPlayerId(tempState);
    }

    nextState.currentTurn = nextPlayer;

    // Check Winner
    if (nextState.hands[move.playerId].length === 0) {
      nextState.status = 'finished';
      nextState.winner = move.playerId;
    }

    this.state = nextState;
    return nextState;
  }

  private handleDraw(state: UnoGameState, playerId: string, count: number) {
    for (let i = 0; i < count; i++) {
      if (state.deck.length === 0) {
        // Reshuffle discard (keep top)
        const top = state.discardPile.pop()!;
        const newDeck = this.shuffle(state.discardPile);
        state.deck = newDeck;
        state.discardPile = [top];
      }
      if (state.deck.length > 0) {
        state.hands[playerId].push(state.deck.pop()!);
      }
    }
  }

  private getNextPlayerId(state: UnoGameState): string {
    const pIdx = state.players.findIndex((p) => p.id === state.currentTurn);
    const len = state.players.length;
    // JS modulo bug with negatives: ((n % m) + m) % m
    const nextIdx = (((pIdx + state.direction) % len) + len) % len;
    return state.players[nextIdx].id;
  }

  checkWinner(state: UnoGameState): WinnerResult {
    if (state.winner) return { finished: true, winner: state.winner };
    return { finished: false, winner: null };
  }
}
