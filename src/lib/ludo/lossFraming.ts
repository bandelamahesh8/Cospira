/**
 * Loss Framing Utility
 * Features: Positive loss messages to reduce rage quits
 */

interface GameData {
  survivalPercent: number;
  opponentSixes: number;
  finalPosition: number;
  tokensHome: number;
  totalTokens: number;
  longestStreak?: number;
}

export const getLossMessage = (gameData: GameData): string => {
  const messages = [
    `Almost there! You survived ${gameData.survivalPercent}% of the game.`,
    `Opponent capitalized on a ${gameData.opponentSixes}-six streak.`,
    `You made it to position ${gameData.finalPosition}!`,
    `${gameData.tokensHome}/${gameData.totalTokens} tokens made it home. So close!`,
    `Tough luck! You were in the lead for most of the game.`,
    `Great effort! You had some amazing moves.`,
  ];

  // Choose message based on context
  if (gameData.survivalPercent > 80) {
    return messages[0]; // Emphasize survival
  } else if (gameData.opponentSixes >= 3) {
    return messages[1]; // Blame opponent luck
  } else if (gameData.tokensHome >= 2) {
    return messages[3]; // Highlight progress
  }

  // Random positive message
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Get session emotional anchor
 */
export const getSessionSummary = (gameData: GameData): string => {
  const summaries = [
    "That was chaotic 😄",
    "You survived a brutal match.",
    "What a comeback!",
    "Close game!",
    "Intense finish!",
    "Well played!",
  ];

  // Emotion only, no stats
  return summaries[Math.floor(Math.random() * summaries.length)];
};
