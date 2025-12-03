import config from '../config.js';

class RoomRouter {
    constructor(roomId, worker) {
        this.roomId = roomId;
        this.worker = worker;
        this.router = null;
        this.transports = new Map(); // transportId -> transport
        this.producers = new Map(); // producerId -> producer
        this.consumers = new Map(); // consumerId -> consumer
        this.peers = new Map(); // socketId -> { transports: [], producers: [], consumers: [] }
    }

    async init() {
        this.router = await this.worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
    }

    async createWebRtcTransport(socketId) {
        const transport = await this.router.createWebRtcTransport(config.mediasoup.webRtcTransport);

        transport.on('dtlsstatechange', dtlsState => {
            if (dtlsState === 'closed') {
                transport.close();
            }
        });

        transport.on('close', () => {
            console.log('Transport closed', transport.id);
        });

        this.transports.set(transport.id, transport);
        this.addPeerResource(socketId, 'transports', transport.id);

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    async connectWebRtcTransport(transportId, dtlsParameters) {
        const transport = this.transports.get(transportId);
        if (transport) {
            await transport.connect({ dtlsParameters });
        }
    }

    async produce(socketId, transportId, kind, rtpParameters) {
        const transport = this.transports.get(transportId);
        if (!transport) throw new Error(`Transport with id "${transportId}" not found`);

        const producer = await transport.produce({ kind, rtpParameters });

        this.producers.set(producer.id, producer);
        this.addPeerResource(socketId, 'producers', producer.id);

        producer.on('transportclose', () => {
            producer.close();
            this.producers.delete(producer.id);
        });

        return { id: producer.id };
    }

    async consume(socketId, transportId, producerId, rtpCapabilities) {
        if (!this.router.canConsume({ producerId, rtpCapabilities })) {
            console.warn('Cannot consume', { producerId, rtpCapabilities });
            return;
        }

        const transport = this.transports.get(transportId);
        if (!transport) throw new Error(`Transport with id "${transportId}" not found`);

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: true, // Start paused
        });

        this.consumers.set(consumer.id, consumer);
        this.addPeerResource(socketId, 'consumers', consumer.id);

        consumer.on('transportclose', () => {
            consumer.close();
            this.consumers.delete(consumer.id);
        });

        consumer.on('producerclose', () => {
            consumer.close();
            this.consumers.delete(consumer.id);
        });

        return {
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        };
    }

    async resumeConsumer(consumerId) {
        const consumer = this.consumers.get(consumerId);
        if (consumer) {
            await consumer.resume();
        }
    }

    addPeerResource(socketId, type, id) {
        if (!this.peers.has(socketId)) {
            this.peers.set(socketId, { transports: [], producers: [], consumers: [] });
        }
        this.peers.get(socketId)[type].push(id);
    }

    removePeer(socketId) {
        const peer = this.peers.get(socketId);
        if (peer) {
            peer.transports.forEach(id => this.transports.get(id)?.close());
            peer.producers.forEach(id => this.producers.get(id)?.close());
            peer.consumers.forEach(id => this.consumers.get(id)?.close());
            this.peers.delete(socketId);
        }
    }
}

export default RoomRouter;
