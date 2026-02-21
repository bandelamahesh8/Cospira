import logger from '../../logger.js';

class PersonalityService {
    constructor() {
        this.personalities = {
            tactical: {
                name: 'Tactical',
                description: 'Focused on efficiency, security, and technical precision.',
                tone: 'concise, professional, and alert',
                priorities: ['security', 'health', 'efficiency'],
                style: 'analytical'
            },
            friendly: {
                name: 'Friendly',
                description: 'Supportive, conversational, and empathetic interactions.',
                tone: 'warm, encouraging, and helpful',
                priorities: ['harmony', 'engagement', 'support'],
                style: 'conversational'
            },
            professional: {
                name: 'Professional',
                description: 'Structured, formal, and objective guidance.',
                tone: 'formal, clear, and disciplined',
                priorities: ['accuracy', 'productivity', 'structure'],
                style: 'formal'
            }
        };
        this.currentPersonality = 'tactical'; // Default
    }

    setPersonality(id) {
        if (this.personalities[id]) {
            this.currentPersonality = id;
            logger.info(`[PersonalityService] Switched to ${this.personalities[id].name}`);
            return true;
        }
        return false;
    }

    getPersonality() {
        return this.personalities[this.currentPersonality];
    }

    getAllPersonalities() {
        return Object.entries(this.personalities).map(([id, p]) => ({ id, ...p }));
    }
}

export default new PersonalityService();
