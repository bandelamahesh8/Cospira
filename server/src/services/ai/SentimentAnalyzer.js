
const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'superb',
  'happy', 'joy', 'excited', 'love', 'like', 'best', 'brilliant', 'awesome',
  'cool', 'nice', 'pleasant', 'fun', 'enjoy', 'supportive', 'helpful',
  'productive', 'creative', 'innovative', 'smart', 'intelligent', 'friendly'
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'poor', 'hate', 'dislike', 'worst',
  'angry', 'sad', 'depressed', 'boring', 'annoying', 'stupid', 'dumb',
  'idiot', 'useless', 'waste', 'hard', 'difficult', 'frustrating', 'confusing',
  'slow', 'broken', 'buggy', 'fail', 'failure', 'stress', 'tense'
]);

/**
 * Analyzes the sentiment of a given text.
 * Returns a score between -1.0 (negative) and 1.0 (positive).
 * @param {string} text 
 * @returns {number} sentiment score
 */
export const analyzeSentiment = (text) => {
  if (!text || typeof text !== 'string') return 0;

  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  if (words.length === 0) return 0;

  let score = 0;
  let wordCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) {
      score += 1;
      wordCount++;
    } else if (NEGATIVE_WORDS.has(word)) {
      score -= 1;
      wordCount++;
    }
  }

  // Normalize score between -1 and 1
  if (wordCount === 0) return 0;
  
  // Dampening factor to avoid extremes too easily
  return Math.max(-1, Math.min(1, score / Math.max(1, wordCount * 0.5)));
};

export default { analyzeSentiment };
