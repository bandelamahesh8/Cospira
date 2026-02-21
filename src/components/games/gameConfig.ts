/**
 * Central config for room games: min members, max players per game type.
 * Used by GameSelector, Room (access), and server validation.
 */

export type GameId = 'xoxo' | 'ultimate-xoxo' | 'chess' | 'ludo' | 'snakeladder' | 'connect4' | 'checkers' | 'battleship';

/** Minimum members in room (including you) required to access/start any game */
export const GAME_MIN_ROOM_MEMBERS = 2;

/** Max players per game (total, including host) */
export const GAME_MAX_PLAYERS: Record<GameId, number> = {
  'xoxo': 2,
  'ultimate-xoxo': 2,
  'chess': 2,
  'ludo': 4,
  'snakeladder': 4,
  'connect4': 2,
  'checkers': 2,
  'battleship': 2,
};

/** Max opponent slots (excluding current user) */
export function getMaxOpponentSlots(gameId: GameId): number {
  const max = GAME_MAX_PLAYERS[gameId] ?? 2;
  return Math.max(0, max - 1);
}

export function canStartGame(gameId: GameId, roomMemberCount: number, selectedOpponentCount: number): boolean {
  if (roomMemberCount < GAME_MIN_ROOM_MEMBERS) return false;
  const maxSlots = getMaxOpponentSlots(gameId);
  return selectedOpponentCount >= 1 && selectedOpponentCount <= maxSlots;
}
