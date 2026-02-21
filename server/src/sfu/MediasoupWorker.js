import mediasoup from 'mediasoup';
import os from 'os';
import config from '../config.js';
import logger from '../logger.js';

const workerSettings = config.mediasoup.worker;

class MediasoupWorker {
    constructor() {
        this.workers = [];
        this.nextWorkerIndex = 0;
        this.initialized = false;
    }

    /**
     * Initialize a pool of mediasoup workers.
     * If numWorkers is not provided, it defaults to min(cpuCount, MEDIASOUP_WORKERS || 4).
     */
    async run(numWorkers) {
        if (this.initialized) {
            logger.info('[MediasoupWorker] run() called but workers already initialized');
            return;
        }

        const cpuCount = os.cpus()?.length || 1;
        const configuredWorkers = Number(process.env.MEDIASOUP_WORKERS) || undefined;
        const targetWorkers = numWorkers || configuredWorkers || Math.min(cpuCount, 4);

        logger.info(`[MediasoupWorker] Initializing with ${targetWorkers} workers (cpuCount=${cpuCount})`);

        for (let i = 0; i < targetWorkers; i++) {
            try {
                logger.info(`[MediasoupWorker] Creating worker ${i + 1}/${targetWorkers}...`);
                const worker = await mediasoup.createWorker(workerSettings);
                
                worker.on('died', () => {
                    logger.error('mediasoup worker died [pid:%d]', worker.pid);
                    // Do not exit the whole process immediately; mark as unhealthy.
                    // A higher-level process manager / orchestrator (e.g. Kubernetes)
                    // should handle restarting the pod.
                });

                this.workers.push(worker);
                logger.info('[MediasoupWorker] Worker created [pid:%d]', worker.pid);
            } catch (error) {
                logger.error(`[MediasoupWorker] Failed to create worker ${i + 1}:`, error);
            }
        }

        if (this.workers.length === 0) {
            throw new Error('[MediasoupWorker] Failed to initialize any mediasoup workers');
        }

        this.initialized = true;
        logger.info(`[MediasoupWorker] Initialization complete. Total workers: ${this.workers.length}`);
    }

    /**
     * Round-robin worker selection for new rooms.
     */
    getWorker() {
        if (!this.workers.length) {
            throw new Error('[MediasoupWorker] No workers available. Did you call run()?');
        }
        const worker = this.workers[this.nextWorkerIndex];
        this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
        return worker;
    }
}

export default new MediasoupWorker();
