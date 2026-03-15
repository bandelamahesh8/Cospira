import twinService from './TwinService.js';
import logger from '../../logger.js';

class SimulationEngine {
    constructor() {
        this.activeSimulations = new Map(); // simId -> { scenario, results, status }
    }

    /**
     * Run a simulation against the Digital Twin
     * @param {string} roomId 
     * @param {Object} scenario { name, perturbators: { key: modifier } }
     */
    async runSimulation(roomId, scenario) {
        const twin = twinService.getTwin(roomId);
        if (!twin) {
            throw new Error(`No Digital Twin found for room ${roomId}. Resync required.`);
        }

        const simId = `sim-${Date.now()}`;
        this.activeSimulations.set(simId, {
            scenario,
            status: 'RUNNING',
            startTime: new Date().toISOString()
        });

        logger.info(`[SimulationEngine] Starting simulation ${simId} for room ${roomId}: ${scenario.name}`);

        // Simulation Logic (Simplified Monte Carlo)
        // We apply perturbations to the twin state and calculate stability
        
        const results = [];
        const iterations = 10;
        let stabilitySum = 0;

        for (let i = 0; i < iterations; i++) {
            // Predict outcome based on scenario modifiers
            // Example: If 'trust' modifier is -50, risk increases significantly
            let iterationStability = 100;
            
            for (const [key, modifier] of Object.entries(scenario.perturbators)) {
                if (typeof modifier === 'number') {
                    iterationStability += modifier * (0.8 + Math.random() * 0.4);
                }
            }

            iterationStability = Math.max(0, Math.min(100, iterationStability));
            stabilitySum += iterationStability;
            results.push(iterationStability);
        }

        const finalScore = Math.round(stabilitySum / iterations);
        const report = {
            simId,
            scenario: scenario.name,
            predictedStability: finalScore,
            riskLevel: finalScore > 80 ? 'LOW' : finalScore > 50 ? 'MODERATE' : 'HIGH',
            timestamp: new Date().toISOString(),
            iterations: results
        };

        this.activeSimulations.set(simId, {
            ...this.activeSimulations.get(simId),
            status: 'COMPLETED',
            results: report
        });

        return report;
    }

    getSimulation(simId) {
        return this.activeSimulations.get(simId);
    }

    getAllForRoom(roomId) {
        // In a real DB we'd filter by roomId
        return Array.from(this.activeSimulations.values());
    }
}

export default new SimulationEngine();
