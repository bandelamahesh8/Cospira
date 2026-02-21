
// Stub for AISummaryService to resolve build error
export interface MeetingSummary {
    id: string;
    markdown: string;
    bullets: string[];
    actionItems: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
}

const AISummaryService = {
    generateSummary: async (roomId: string, mode: string, duration: number, context: string): Promise<MeetingSummary> => {
        // Mock implementation
        return {
            id: 'mock-summary',
            markdown: '# Summary\n\nThis is a placeholder summary.',
            bullets: ['Point 1', 'Point 2'],
            actionItems: ['Review code'],
            sentiment: 'neutral'
        };
    }
};

export default AISummaryService;
