import config from '../config.js';
import logger from '../logger.js';

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
        try {
            this.router = await this.worker.createRouter({ 
                mediaCodecs: config.mediasoup.router.mediaCodecs 
            });
            logger.info(`[RoomRouter] Router initialized for room: ${this.roomId}`);
        } catch (error) {
            logger.error(`[RoomRouter] Failed to initialize router for ${this.roomId}:`, error);
            throw error;
        }
    }

    async createWebRtcTransport(socketId, options = {}) {
        try {
            logger.info(`[RoomRouter] Creating WebRTC transport for ${socketId} in room ${this.roomId}`);
            
            if (!this.router) {
                throw new Error('Router not initialized');
            }
            
            const transportConfig = {
                ...config.mediasoup.webRtcTransport,
                enableUdp: !options.forceTcp,
                enableTcp: true,
                preferUdp: !options.forceTcp,
            };

            // Dynamic announcedIp override
            if (options.announcedIp) {
                transportConfig.listenIps[0].announcedIp = options.announcedIp;
            }

            const transport = await this.router.createWebRtcTransport(transportConfig);
            
            logger.info(`[RoomRouter] Transport created: ${transport.id} (UDP: ${transportConfig.enableUdp}, TCP: ${transportConfig.enableTcp})`);

            // Event handlers
            transport.on('dtlsstatechange', dtlsState => {
                logger.info(`[RoomRouter] Transport ${transport.id} DTLS state: ${dtlsState}`);
                if (dtlsState === 'closed' || dtlsState === 'failed') {
                    this.closeTransport(transport.id);
                }
            });

            transport.on('close', () => {
                logger.info(`[RoomRouter] Transport closed: ${transport.id}`);
                this.transports.delete(transport.id);
            });

            // Store transport
            this.transports.set(transport.id, transport);
            this.addPeerResource(socketId, 'transports', transport.id);
            
            return {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            };
        } catch (error) {
            logger.error(`[RoomRouter] Failed to create WebRTC transport for ${socketId}:`, error);
            throw error;
        }
    }

    async createPlainTransport() {
        try {
            if (!this.router) {
                throw new Error('Router not initialized');
            }

            const transport = await this.router.createPlainTransport({
                listenIp: config.mediasoup.plainTransport.listenIp,
                rtcpMux: false,
                comedia: true
            });

            logger.info(`[RoomRouter] PlainTransport created: ${transport.id}`);
            this.transports.set(transport.id, transport);
            
            return transport;
        } catch (error) {
            logger.error(`[RoomRouter] Failed to create PlainTransport:`, error);
            throw error;
        }
    }

    async pipeToPlainTransport(producerId, options = {}) {
        try {
            const producer = this.producers.get(producerId);
            if (!producer) {
                throw new Error(`Producer ${producerId} not found`);
            }

            // 1. Create PlainTransport
            const transport = await this.createPlainTransport();

            // 2. Connect it to the destination (where FFmpeg is listening)
            await transport.connect({
                ip: options.ip || '127.0.0.1',
                port: options.port
            });

            // 3. Consume the producer on this transport
            // We use the router's RTP capabilities to ensure compatibility
            const consumer = await transport.consume({
                producerId: producerId,
                rtpCapabilities: this.router.rtpCapabilities,
                paused: false
            });

            logger.info(`[RoomRouter] Piped producer ${producerId} to PlainTransport ${transport.id}`);

            return { transport, consumer };
        } catch (error) {
            logger.error(`[RoomRouter] Failed to pipe producer to PlainTransport:`, error);
            throw error;
        }
    }

    async connectWebRtcTransport(transportId, dtlsParameters) {
        try {
            const transport = this.transports.get(transportId);
            if (!transport) {
                throw new Error(`Transport ${transportId} not found`);
            }

            await transport.connect({ dtlsParameters });
            logger.info(`[RoomRouter] Transport connected: ${transportId}`);
        } catch (error) {
            logger.error(`[RoomRouter] Failed to connect transport ${transportId}:`, error);
            throw error;
        }
    }

    async produce(socketId, transportId, kind, rtpParameters, appData = {}) {
        try {
            const transport = this.transports.get(transportId);
            if (!transport) {
                throw new Error(`Transport ${transportId} not found`);
            }

            const producer = await transport.produce({ kind, rtpParameters, appData });
            logger.info(`[RoomRouter] Producer created: ${producer.id} (${kind}) for ${socketId}`);

            // Store producer
            this.producers.set(producer.id, producer);
            this.addPeerResource(socketId, 'producers', producer.id);

            // Event handlers
            producer.on('transportclose', () => {
                logger.info(`[RoomRouter] Producer ${producer.id} transport closed`);
                this.closeProducer(producer.id);
            });

            producer.on('score', (score) => {
                logger.debug(`[RoomRouter] Producer ${producer.id} score:`, score);
            });

            return { id: producer.id };
        } catch (error) {
            logger.error(`[RoomRouter] Failed to create producer for ${socketId}:`, error);
            throw error;
        }
    }

    async consume(socketId, transportId, producerId, rtpCapabilities) {
        try {
            if (!this.router.canConsume({ producerId, rtpCapabilities })) {
                throw new Error(`Cannot consume producer ${producerId} - incompatible RTP capabilities`);
            }

            const transport = this.transports.get(transportId);
            if (!transport) {
                throw new Error(`Transport ${transportId} not found`);
            }

            const producer = this.producers.get(producerId);
            if (!producer) {
                throw new Error(`Producer ${producerId} not found`);
            }

            const consumer = await transport.consume({
                producerId,
                rtpCapabilities,
                paused: true, // Start paused
                appData: producer.appData,
            });

            logger.info(`[RoomRouter] Consumer created: ${consumer.id} for producer ${producerId}`);

            // Store consumer
            this.consumers.set(consumer.id, consumer);
            this.addPeerResource(socketId, 'consumers', consumer.id);

            // Event handlers
            consumer.on('transportclose', () => {
                logger.info(`[RoomRouter] Consumer ${consumer.id} transport closed`);
                this.closeConsumer(consumer.id);
            });

            consumer.on('producerclose', () => {
                logger.info(`[RoomRouter] Consumer ${consumer.id} producer closed`);
                this.closeConsumer(consumer.id);
            });

            consumer.on('producerpause', () => {
                logger.debug(`[RoomRouter] Consumer ${consumer.id} producer paused`);
            });

            consumer.on('producerresume', () => {
                logger.debug(`[RoomRouter] Consumer ${consumer.id} producer resumed`);
            });

            consumer.on('score', (score) => {
                logger.debug(`[RoomRouter] Consumer ${consumer.id} score:`, score);
            });

            return {
                id: consumer.id,
                producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                appData: consumer.appData,
            };
        } catch (error) {
            logger.error(`[RoomRouter] Failed to create consumer for ${socketId}:`, error);
            throw error;
        }
    }

    async resumeConsumer(consumerId) {
        try {
            const consumer = this.consumers.get(consumerId);
            if (!consumer) {
                throw new Error(`Consumer ${consumerId} not found`);
            }

            if (consumer.paused) {
                await consumer.resume();
                logger.info(`[RoomRouter] Consumer resumed: ${consumerId}`);
            }
        } catch (error) {
            logger.error(`[RoomRouter] Failed to resume consumer ${consumerId}:`, error);
            throw error;
        }
    }

    async pauseProducer(producerId) {
        try {
            const producer = this.producers.get(producerId);
            if (!producer || producer.closed) {
                return;
            }

            if (!producer.paused) {
                await producer.pause();
                logger.info(`[RoomRouter] Producer paused: ${producerId}`);
            }
        } catch (error) {
            logger.error(`[RoomRouter] Failed to pause producer ${producerId}:`, error);
            throw error;
        }
    }

    async resumeProducer(producerId) {
        try {
            const producer = this.producers.get(producerId);
            if (!producer || producer.closed) {
                return;
            }

            if (producer.paused) {
                await producer.resume();
                logger.info(`[RoomRouter] Producer resumed: ${producerId}`);
            }
        } catch (error) {
            logger.error(`[RoomRouter] Failed to resume producer ${producerId}:`, error);
            throw error;
        }
    }

    async requestKeyFrame(consumerId) {
        try {
            const consumer = this.consumers.get(consumerId);
            if (!consumer) {
                logger.warn(`[RoomRouter] Consumer ${consumerId} not found for key frame request`);
                return;
            }

            if (consumer.kind === 'video') {
                await consumer.requestKeyFrame();
                logger.info(`[RoomRouter] Key frame requested for consumer: ${consumerId}`);
            }
        } catch (error) {
            logger.error(`[RoomRouter] Failed to request key frame for ${consumerId}:`, error);
            // Don't throw - this is a best-effort operation
        }
    }

    async restartIce(transportId) {
        try {
            const transport = this.transports.get(transportId);
            if (!transport || transport.closed) {
                logger.warn(`[RoomRouter] transport ${transportId} not found for restartIce (likely already closed)`);
                return null;
            }

            const iceParameters = await transport.restartIce();
            logger.info(`[RoomRouter] ICE restarted for transport: ${transportId}`);
            
            return iceParameters;
        } catch (error) {
            logger.error(`[RoomRouter] Failed to restart ICE for ${transportId}:`, error);
            throw error;
        }
    }

    // ============================================
    // RESOURCE MANAGEMENT
    // ============================================
    addPeerResource(socketId, type, id) {
        if (!this.peers.has(socketId)) {
            this.peers.set(socketId, { 
                transports: [], 
                producers: [], 
                consumers: [] 
            });
        }
        
        const peer = this.peers.get(socketId);
        if (!peer[type].includes(id)) {
            peer[type].push(id);
        }
    }

    removePeer(socketId) {
        const peer = this.peers.get(socketId);
        if (!peer) {
            logger.warn(`[RoomRouter] No peer data found for ${socketId}`);
            return;
        }

        logger.info(`[RoomRouter] Removing peer: ${socketId}`);

        // Close all transports (this will cascade to producers/consumers)
        peer.transports.forEach(id => this.closeTransport(id));
        
        // Close any orphaned producers
        peer.producers.forEach(id => this.closeProducer(id));
        
        // Close any orphaned consumers
        peer.consumers.forEach(id => this.closeConsumer(id));

        this.peers.delete(socketId);
        logger.info(`[RoomRouter] Peer removed: ${socketId}`);
    }

    closeTransport(transportId) {
        const transport = this.transports.get(transportId);
        if (transport && !transport.closed) {
            transport.close();
            logger.info(`[RoomRouter] Transport closed: ${transportId}`);
        }
        this.transports.delete(transportId);
    }

    closeProducer(producerId) {
        const producer = this.producers.get(producerId);
        if (producer && !producer.closed) {
            producer.close();
            logger.info(`[RoomRouter] Producer closed: ${producerId}`);
        }
        this.producers.delete(producerId);
    }

    closeConsumer(consumerId) {
        const consumer = this.consumers.get(consumerId);
        if (consumer && !consumer.closed) {
            consumer.close();
            logger.info(`[RoomRouter] Consumer closed: ${consumerId}`);
        }
        this.consumers.delete(consumerId);
    }

    getExistingProducers() {
        const producers = [];
        
        for (const [socketId, peer] of this.peers.entries()) {
            for (const producerId of peer.producers) {
                const producer = this.producers.get(producerId);
                if (producer && !producer.closed) {
                    producers.push({
                        producerId,
                        socketId,
                        kind: producer.kind,
                        appData: producer.appData
                    });
                }
            }
        }
        
        return producers;
    }
}

export default RoomRouter;
