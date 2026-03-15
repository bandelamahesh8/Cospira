import agentBus from './AgentBus.js';
import logger from '../../logger.js';

class ConsensusService {
    constructor() {
        this.activeProposals = new Map(); // proposalId -> { topic, votes: { agentId: opinion }, timestamp }
        
        // Listen for consensus requests
        agentBus.on('consensus_request', (msg) => this.handleRequest(msg));
        agentBus.on('consensus_vote', (msg) => this.handleVote(msg));
    }

    async handleRequest(msg) {
        const { id, topic, data } = msg.payload;
        this.activeProposals.set(id, {
            topic,
            data,
            votes: {},
            timestamp: Date.now()
        });
        logger.info(`[Consensus] New proposal: ${topic} (${id})`);
    }

    async handleVote(msg) {
        const { proposalId, vote } = msg.payload;
        const proposal = this.activeProposals.get(proposalId);
        
        if (proposal) {
            proposal.votes[msg.from] = vote;
            
            // Check if we have enough votes (e.g., majority of 3 agents)
            if (Object.keys(proposal.votes).length >= 3) {
                this.finalize(proposalId);
            }
        }
    }

    finalize(id) {
        const proposal = this.activeProposals.get(id);
        if (!proposal) return;

        // Simple majority or average aggregation
        const votes = Object.values(proposal.votes);
        let result = null;

        if (typeof votes[0] === 'number') {
            result = votes.reduce((a, b) => a + b, 0) / votes.length;
        } else {
            // Frequency map for strings/booleans
            const counts = {};
            votes.forEach(v => counts[v] = (counts[v] || 0) + 1);
            result = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        }

        agentBus.broadcast('consensus_final', {
            proposalId: id,
            topic: proposal.topic,
            result,
            confidence: 0.9 // Placeholder
        });

        this.activeProposals.delete(id);
        logger.info(`[Consensus] Finalized ${proposal.topic}: ${result}`);
    }
}

export default new ConsensusService();
