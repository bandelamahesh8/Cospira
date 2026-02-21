/**
 * Fate Framing System
 * Shift blame from player to destiny
 */

/**
 * Get fate message for snake bite
 * "The snake found you" not "You fell"
 */
export const getSnakeFateMessage = (): string => {
  const messages = [
    "The snake found you.",
    "Fate had other plans.",
    "The path winds downward.",
    "The journey takes a turn.",
    "Sometimes we must go back to move forward.",
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Get fate message for ladder climb
 * "Luck lifted you" not "You climbed"
 */
export const getLadderFateMessage = (): string => {
  const messages = [
    "Luck lifted you.",
    "Fortune smiles.",
    "The way opened upward.",
    "A helping hand appeared.",
    "The path rises before you.",
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Get win message (shared joy, not domination)
 */
export const getWinMessage = (playerName: string): string => {
  return `The journey is complete. ${playerName} made it!`;
};

/**
 * Get session memory message (light, warm)
 */
export const getMemoryMessage = (lastEvent: 'snake' | 'ladder' | null): string => {
  if (!lastEvent) return "Welcome back to the journey.";
  
  if (lastEvent === 'ladder') {
    return "Last time, a ladder helped you.";
  } else {
    return "Last time, the path was winding.";
  }
};
