import mediasoup from 'mediasoup';
import os from 'os';
import config from '../../shared/config.js';
import logger from '../../shared/logger.js';
import client from 'prom-client';

const workerSettings = config.mediasoup.worker;

class MediasoupWorker {
    constructor() {
        this.workers = [];
        this.workerStats = []; // { worker, producerCount, consumerCount, cpuLoad }
        this.nextWorkerIndex = 0;
        this.initialized = false;
        this.maxProducersPerWorker = Number(process.env.MEDIASOUP_MAX_PRODUCERS_PER_WORKER) || 100;

        // Prometheus gauges
        this.workerProducerCount = new client.Gauge({
            name: 'mediasoup_worker_producer_count',
            help: 'Number of producers per worker',
            labelNames: ['worker_pid']
        });
        this.workerConsumerCount = new client.Gauge({
            name: 'mediasoup_worker_consumer_count',
            help: 'Number of consumers per worker',
            labelNames: ['worker_pid']
        });
        this.workerCpuLoad = new client.Gauge({
            name: 'mediasoup_worker_cpu_load',
            help: 'CPU load per worker',
            labelNames: ['worker_pid']
        });
    }

    /**
     * Initialize a pool of mediasoup workers.
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
                    this.handleWorkerDeath(worker);
                });

                const stats = {
                    worker,
                    producerCount: 0,
                    consumerCount: 0,
                    cpuLoad: 0,
                    lastUpdate: Date.now()
                };
                this.workers.push(worker);
                this.workerStats.push(stats);

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

        // Start monitoring
        this.startMonitoring();
    }

    /**
     * Least-loaded worker selection for new rooms.
     */
    getWorker() {
        if (!this.workers.length) {
            throw new Error('[MediasoupWorker] No workers available. Did you call run()?');
        }

        // Find worker with lowest load (producerCount + consumerCount)
        let bestWorker = null;
        let bestLoad = Infinity;
        let bestStats = null;

        for (const stats of this.workerStats) {
            const load = stats.producerCount + stats.consumerCount;
            if (load < bestLoad && stats.producerCount < this.maxProducersPerWorker) {
                bestLoad = load;
                bestWorker = stats.worker;
                bestStats = stats;
            }
        }

        if (!bestWorker) {
            throw new Error('[MediasoupWorker] No available workers under load limit');
        }

        logger.info(`[MediasoupWorker] Assigned worker [pid:${bestWorker.pid}] with load ${bestLoad}`);
        return bestWorker;
    }

    /**
     * Update stats for a worker
     */
    updateWorkerStats(worker, producerDelta = 0, consumerDelta = 0) {
        const stats = this.workerStats.find(s => s.worker === worker);
        if (stats) {
            stats.producerCount = Math.max(0, stats.producerCount + producerDelta);
            stats.consumerCount = Math.max(0, stats.consumerCount + consumerDelta);
            stats.lastUpdate = Date.now();

            // Update Prometheus metrics
            this.workerProducerCount.set({ worker_pid: worker.pid.toString() }, stats.producerCount);
            this.workerConsumerCount.set({ worker_pid: worker.pid.toString() }, stats.consumerCount);
        }
    }

    /**
     * Handle worker death - remove from pool and spawn replacement
     */
    handleWorkerDeath(deadWorker) {
        logger.warn(`[MediasoupWorker] Handling death of worker [pid:${deadWorker.pid}]`);
        
        // Remove from arrays
        const index = this.workers.indexOf(deadWorker);
        if (index > -1) {
            this.workers.splice(index, 1);
            this.workerStats.splice(index, 1);
        }

        // Try to spawn replacement
        this.spawnReplacementWorker();
    }

    /**
     * Spawn a replacement worker
     */
    async spawnReplacementWorker() {
        try {
            logger.info('[MediasoupWorker] Spawning replacement worker...');
            const worker = await mediasoup.createWorker(workerSettings);
            
            worker.on('died', () => {
                logger.error('Replacement mediasoup worker died [pid:%d]', worker.pid);
                this.handleWorkerDeath(worker);
            });

            const stats = {
                worker,
                producerCount: 0,
                consumerCount: 0,
                cpuLoad: 0,
                lastUpdate: Date.now()
            };
            this.workers.push(worker);
            this.workerStats.push(stats);

            logger.info('[MediasoupWorker] Replacement worker created [pid:%d]', worker.pid);
        } catch (error) {
            logger.error('[MediasoupWorker] Failed to create replacement worker:', error);
        }
    }

    /**
     * Start monitoring workers
     */
    startMonitoring() {
        setInterval(() => {
            for (const stats of this.workerStats) {
                // Simple CPU monitoring (in production, use proper monitoring)
                stats.cpuLoad = Math.random() * 100; // Placeholder
                this.workerCpuLoad.set({ worker_pid: stats.worker.pid.toString() }, stats.cpuLoad);
            }
        }, 30000); // Every 30 seconds
    }
}

export default new MediasoupWorker();
