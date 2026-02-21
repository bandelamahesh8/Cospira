class ScenarioGenerator {
    constructor() {
        this.templates = [
            {
                id: 'trust_collapse',
                name: 'Trust Collapse Scenario',
                description: 'What if user trust drops by 50%?',
                perturbators: {
                    trust: -50,
                    alignment: -40,
                    conflict: 30
                }
            },
            {
                id: 'swarm_surge',
                name: 'Swarm Surging Activity',
                description: 'What if agent communication increases by 3x?',
                perturbators: {
                    commVolume: 200,
                    complexity: 20,
                    consensus_speed: -15
                }
            },
            {
                id: 'deep_collaboration',
                name: 'Deep Human-AI Synergy',
                description: 'What if users follow 100% of AI suggestions?',
                perturbators: {
                    alignment: 50,
                    trust: 20,
                    conflicts: -100
                }
            }
        ];
    }

    getTemplates() {
        return this.templates;
    }

    getTemplateById(id) {
        return this.templates.find(t => t.id === id);
    }
}

export default new ScenarioGenerator();
