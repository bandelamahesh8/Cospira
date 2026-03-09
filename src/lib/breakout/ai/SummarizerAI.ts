import { roomEventBus, ChatMessagePayload } from '../EventBus';

/**
 * SummarizerAI
 * Extracts topics, decisions, and action items from conversations.
 */
export class SummarizerAI {
  private static instance: SummarizerAI;

  private constructor() {}

  public static getInstance(): SummarizerAI {
    if (!SummarizerAI.instance) SummarizerAI.instance = new SummarizerAI();
    return SummarizerAI.instance;
  }

  public evaluateMessage(payload: ChatMessagePayload) {
    const text = payload.text.toLowerCase();
    const { breakoutId, timestamp } = payload;

    // 1. Action Item Extraction (Mock heuristics)
    const actionKeywords = ['todo', 'task', 'assigned to', 'will do', 'need to fix'];
    if (actionKeywords.some((kw) => text.includes(kw))) {
      roomEventBus.emit('MEETING_INSIGHT', {
        breakoutId,
        type: 'ACTION_ITEM',
        content: payload.text,
        timestamp,
      });
    }

    // 2. Decision Detection
    const decisionKeywords = ['decided', 'agreed', 'consensus', 'final', 'we will use'];
    if (decisionKeywords.some((kw) => text.includes(kw))) {
      roomEventBus.emit('MEETING_INSIGHT', {
        breakoutId,
        type: 'DECISION',
        content: payload.text,
        timestamp,
      });
    }

    // 3. Topic Detection
    const topics: Record<string, string[]> = {
      Frontend: ['react', 'ui', 'css', 'tailwind', 'component'],
      Backend: ['database', 'api', 'server', 'node', 'supabase'],
      AI: ['neural', 'model', 'training', 'prompt', 'llm'],
      Product: ['launch', 'timeline', 'user', 'strategy'],
    };

    Object.entries(topics).forEach(([topic, keywords]) => {
      if (keywords.some((kw) => text.includes(kw))) {
        roomEventBus.emit('MEETING_INSIGHT', {
          breakoutId,
          type: 'TOPIC',
          content: topic,
          metadata: { keyword: keywords.find((kw) => text.includes(kw)) },
          timestamp,
        });
      }
    });
  }
}
