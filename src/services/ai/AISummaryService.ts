export interface MeetingSummary {
  id: string;
  title: string;
  mode: string;
  duration: string;
  markdown: string;
  highlights: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * AISummaryService — Client-side meeting summary generator.
 * Uses real transcript/context to produce relevant summaries.
 * Falls back to meaningful empty-state messages when no transcript is available.
 */
const AISummaryService = {
  generateSummary: async (
    roomId: string,
    mode: string,
    duration: number,
    context: string
  ): Promise<MeetingSummary> => {
    // Simulate a brief processing delay (realistic AI feel)
    await new Promise((r) => setTimeout(r, 1200));

    const hasContext =
      context && context.trim().length > 10 && context !== 'Session logs unavailable.';
    const durationStr = formatDuration(duration);
    const modeLabel = getModeLabel(mode);

    if (!hasContext) {
      // No transcript — return an honest empty state
      return {
        id: `sum-${roomId}-${Date.now()}`,
        title: `${modeLabel} Session Summary`,
        mode: mode || 'mixed',
        duration: durationStr,
        markdown: '',
        highlights: [
          'No transcript was captured for this session.',
          'Enable microphone and allow speech-to-text to generate AI highlights.',
        ],
        actionItems: [
          'Review session manually if notes were taken.',
          'Enable transcription in room settings for future sessions.',
        ],
        sentiment: 'neutral',
      };
    }

    // Parse the transcript context to extract meaningful content
    const sentences = context
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    // Extract highlights: take up to 3 notable sentences
    const highlights = extractHighlights(sentences, 3);

    // Extract action items: look for keywords like "will", "should", "need to", "please", "can you"
    const actionItems = extractActionItems(sentences, 3);

    const sentiment = analyzeSentiment(context);

    return {
      id: `sum-${roomId}-${Date.now()}`,
      title: `${modeLabel} Session Summary`,
      mode: mode || 'mixed',
      duration: durationStr,
      markdown: `# ${modeLabel} Session — ${durationStr}\n\n${context.slice(0, 300)}...`,
      highlights:
        highlights.length > 0
          ? highlights
          : ['Session active — transcript captured.', 'Conversation data processed successfully.'],
      actionItems:
        actionItems.length > 0 ? actionItems : ['Review session transcript for follow-up items.'],
      sentiment,
    };
  },
};

/** Format seconds into human-readable duration */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Live Session';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Map websocket mode strings to display labels */
function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    professional: 'Professional',
    fun: 'Fun',
    ultra: 'Ultra Secure',
    mixed: 'Mixed',
    social: 'Social',
  };
  return labels[mode?.toLowerCase()] || 'Session';
}

/** Extract up to `max` highlight sentences from transcript */
function extractHighlights(sentences: string[], max: number): string[] {
  // Prefer longer, more substantive sentences as highlights
  return sentences
    .filter((s) => s.length > 40)
    .slice(0, max)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

/** Extract action items by detecting intent keywords */
function extractActionItems(sentences: string[], max: number): string[] {
  const keywords = ['will ', 'should ', 'need to ', 'please ', 'can you ', 'must ', "let's "];
  return sentences
    .filter((s) => keywords.some((kw) => s.toLowerCase().includes(kw)))
    .slice(0, max)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

/** Simple sentiment analysis based on keyword presence */
function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const lower = text.toLowerCase();
  const positiveWords = [
    'great',
    'good',
    'excellent',
    'agree',
    'done',
    'success',
    'perfect',
    'amazing',
  ];
  const negativeWords = ['problem', 'issue', 'error', 'fail', 'blocked', 'stuck', 'wrong', 'bad'];
  const posScore = positiveWords.filter((w) => lower.includes(w)).length;
  const negScore = negativeWords.filter((w) => lower.includes(w)).length;
  if (posScore > negScore) return 'positive';
  if (negScore > posScore) return 'negative';
  return 'neutral';
}

export default AISummaryService;
