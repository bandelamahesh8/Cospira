import mediasoup from 'mediasoup';
import config from '../config.js';

const workerSettings = config.mediasoup.worker;

class MediasoupWorker {
    constructor() {
        this.workers = [];
        this.nextWorkerIndex = 0;
    }

    async run(numWorkers = 1) { // Default to 1 worker for now
        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker(workerSettings);

            worker.on('died', () => {
                console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
                setTimeout(() => process.exit(1), 2000);
            });

            this.workers.push(worker);
            console.log('mediasoup worker created [pid:%d]', worker.pid);
        }
    }

    getWorker() {
        const worker = this.workers[this.nextWorkerIndex];
        this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
        return worker;
    }
}

export default new MediasoupWorker();
