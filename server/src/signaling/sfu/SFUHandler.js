import mediasoupWorker from './MediasoupWorker.js';
import RoomRouter from './RoomRouter.js';
import { getUser } from '../../shared/redis.js';
import AIService from '../../api/services/ai/AIService.js';
import moderationService from '../../api/services/ModerationService.js';
import logger from '../../shared/logger.js';

class SFUHandler {
    constructor(io) {
        this.io = io;
        this.roomRouters = new Map(); // roomId -> RoomRouter
        this.peerStates = new Map(); // socketId -> { roomId, producerIds: Set, consumerIds: Set, transports: Set }
    }

    async init() {
        try {
            await mediasoupWorker.run();
            AIService.init(this.io);
            moderationService.init(this.io);
            logger.info('[SFU] Initialized successfully');
        } catch (error) {
            logger.error('[SFU] Initialization failed:', error);
            throw error;
        }
    }

    async getOrCreateRoomRouter(roomId) {
        let roomRouter = this.roomRouters.get(roomId);
        
        if (!roomRouter) {
            try {
                const worker = mediasoupWorker.getWorker();
                if (!worker) {
                    throw new Error('No Mediasoup worker available');
                }
                
                roomRouter = new RoomRouter(roomId, worker);
                await roomRouter.init();
                this.roomRouters.set(roomId, roomRouter);
                
                logger.info(`[SFU] Created RoomRouter for room: ${roomId}`);
            } catch (err) {
                logger.error(`[SFU] Failed to create RoomRouter for ${roomId}:`, err);
                throw err;
            }
        }
        
        return roomRouter;
    }

    setupSocketEvents(socket) {
        logger.info(`[SFU] Setting up socket events for: ${socket.id}`);

        // Initialize peer state
        this.peerStates.set(socket.id, {
            roomId: null,
            producerIds: new Set(),
            consumerIds: new Set(),
            transports: new Set()
        });

        // ============================================
        // GET ROUTER RTP CAPABILITIES
        // ============================================
        socket.on('sfu:getRouterRtpCapabilities', async ({ roomId }, callback) => {
            try {
                logger.info(`[SFU] getRouterRtpCapabilities: ${socket.id} -> room ${roomId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                const capabilities = roomRouter.router.rtpCapabilities;
                
                // Update peer state
                const peerState = this.peerStates.get(socket.id);
                if (peerState) {
                    peerState.roomId = roomId;
                }
                
                callback(capabilities);
                logger.info(`[SFU] RTP capabilities sent to ${socket.id}`);
            } catch (error) {
                logger.error(`[SFU] getRouterRtpCapabilities error for ${socket.id}:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // CREATE WEBRTC TRANSPORT
        // ============================================
        socket.on('sfu:createWebRtcTransport', async ({ roomId, forceTcp }, callback) => {
            try {
                logger.info(`[SFU] createWebRtcTransport: ${socket.id} -> room ${roomId}, forceTcp: ${forceTcp}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                
                // Determine announcedIp from request
                const host = socket.handshake.headers.host;
                const forwardedHost = socket.handshake.headers['x-forwarded-host'];
                const effectiveHost = forwardedHost || host;
                let suggestedAnnouncedIp = null;
                
                if (effectiveHost) {
                    const hostname = effectiveHost.split(':')[0];
                    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
                    const isNgrok = hostname.includes('ngrok');
                    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

                    if (isIp) {
                        suggestedAnnouncedIp = hostname;
                        logger.info(`[SFU] Using LAN IP from Host header: ${suggestedAnnouncedIp}`);
                    } else if (isNgrok) {
                        suggestedAnnouncedIp = hostname;
                        logger.info(`[SFU] Using ngrok domain for announcedIp: ${suggestedAnnouncedIp}. Note: UDP will likely fail without a TURN server.`);
                    } else if (isLocal) {
                        suggestedAnnouncedIp = '127.0.0.1';
                    }
                }

                const transportParams = await roomRouter.createWebRtcTransport(socket.id, { 
                    forceTcp: forceTcp === true,
                    announcedIp: suggestedAnnouncedIp
                });

                // Track transport in peer state
                const peerState = this.peerStates.get(socket.id);
                if (peerState) {
                    peerState.transports.add(transportParams.id);
                }

                callback(transportParams);
                logger.info(`[SFU] Transport created: ${transportParams.id} for ${socket.id}`);
            } catch (error) {
                logger.error(`[SFU] createWebRtcTransport error for ${socket.id}:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // CONNECT WEBRTC TRANSPORT
        // ============================================
        socket.on('sfu:connectWebRtcTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
            try {
                logger.info(`[SFU] connectWebRtcTransport: ${socket.id} -> transport ${transportId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                await roomRouter.connectWebRtcTransport(transportId, dtlsParameters);
                
                callback({ success: true });
                logger.info(`[SFU] Transport connected: ${transportId} for ${socket.id}`);
            } catch (error) {
                logger.error(`[SFU] connectWebRtcTransport error for ${socket.id}:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // PRODUCE (SEND MEDIA)
        // ============================================
        socket.on('sfu:produce', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
            try {
                logger.info(`[SFU] produce: ${socket.id} -> ${kind} on transport ${transportId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                const { id: producerId } = await roomRouter.produce(socket.id, transportId, kind, rtpParameters, appData);

                // Track producer in peer state
                const peerState = this.peerStates.get(socket.id);
                if (peerState) {
                    peerState.producerIds.add(producerId);
                }

                // Get user info
                let userId = appData?.userId;
                if (!userId) {
                    const user = await getUser(socket.id);
                    userId = user ? user.id : socket.id;
                }

                // Start AI transcription for audio
                if (kind === 'audio') {
                    try {
                        AIService.startTranscription(roomId, userId, producerId, roomRouter)
                            .catch(err => {
                                logger.error(`[SFU] AI transcription startup failed for ${userId}:`, err);
                            });
                    } catch (e) {
                        logger.error('[SFU] Failed to trigger AI Service:', e);
                    }
                }

                // Notify other peers about new producer
                socket.to(roomId).emit('sfu:newProducer', {
                    producerId,
                    socketId: socket.id,
                    userId,
                    kind,
                    appData
                });

                callback({ id: producerId });
                logger.info(`[SFU] Producer created: ${producerId} (${kind}) for ${socket.id}`);
            } catch (error) {
                logger.error(`[SFU] produce error for ${socket.id}:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // GET EXISTING PRODUCERS
        // ============================================
        socket.on('sfu:getProducers', async ({ roomId }, callback) => {
            try {
                logger.info(`[SFU] getProducers: ${socket.id} -> room ${roomId}`);
                
                const producers = await this.getExistingProducers(roomId);
                
                // Auto-recover virtual browser stream if session exists but router was recreated
                const hasVbProducer = producers.some(p => String(p.userId) === 'virtual-browser');
                if (!hasVbProducer) {
                    const { getBrowserManager } = await import('../sockets/browser.socket.js');
                    const manager = getBrowserManager(roomId);
                    if (manager && manager.session) {
                        logger.info(`[SFU] Auto-recovering Virtual Browser stream for room ${roomId}`);
                        manager.startWebRTCStream(manager.session).catch(e => {
                            logger.error(`[SFU] Failed to restart Virtual Browser stream:`, e);
                        });
                    }
                }
                
                callback(producers);
                
                logger.info(`[SFU] Sent ${producers.length} producers to ${socket.id}`);
            } catch (error) {
                logger.error(`[SFU] getProducers error:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // CONSUME (RECEIVE MEDIA)
        // ============================================
        socket.on('sfu:consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
            try {
                logger.info(`[SFU] consume: ${socket.id} -> producer ${producerId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                const params = await roomRouter.consume(socket.id, transportId, producerId, rtpCapabilities);

                // Track consumer in peer state
                const peerState = this.peerStates.get(socket.id);
                if (peerState) {
                    peerState.consumerIds.add(params.id);
                }

                callback(params);
                logger.info(`[SFU] Consumer created: ${params.id} for ${socket.id}`);
            } catch (error) {
                logger.error(`[SFU] consume error for ${socket.id}:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // RESUME CONSUMER
        // ============================================
        socket.on('sfu:resumeConsumer', async ({ roomId, consumerId }, callback) => {
            try {
                logger.info(`[SFU] resumeConsumer: ${socket.id} -> ${consumerId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                await roomRouter.resumeConsumer(consumerId);
                
                callback({ success: true });
                logger.info(`[SFU] Consumer resumed: ${consumerId}`);
            } catch (error) {
                logger.error(`[SFU] resumeConsumer error:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // REQUEST KEY FRAME (PLI)
        // ============================================
        socket.on('sfu:requestKeyFrame', async ({ roomId, consumerId }, callback) => {
            try {
                logger.info(`[SFU] requestKeyFrame: ${socket.id} -> ${consumerId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                await roomRouter.requestKeyFrame(consumerId);
                
                callback({ success: true });
                logger.info(`[SFU] Key frame requested for: ${consumerId}`);
            } catch (error) {
                logger.error(`[SFU] requestKeyFrame error:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // PAUSE PRODUCER
        // ============================================
        socket.on('sfu:pauseProducer', async ({ roomId, producerId }, callback) => {
            try {
                logger.info(`[SFU] pauseProducer: ${socket.id} -> ${producerId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                await roomRouter.pauseProducer(producerId);
                
                callback({ success: true });
                logger.info(`[SFU] Producer paused: ${producerId}`);
            } catch (error) {
                logger.error(`[SFU] pauseProducer error:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // RESUME PRODUCER
        // ============================================
        socket.on('sfu:resumeProducer', async ({ roomId, producerId }, callback) => {
            try {
                logger.info(`[SFU] resumeProducer: ${socket.id} -> ${producerId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                await roomRouter.resumeProducer(producerId);
                
                callback({ success: true });
                logger.info(`[SFU] Producer resumed: ${producerId}`);
            } catch (error) {
                logger.error(`[SFU] resumeProducer error:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // RESTART ICE
        // ============================================
        socket.on('sfu:restartIce', async ({ roomId, transportId }, callback) => {
            try {
                logger.info(`[SFU] restartIce: ${socket.id} -> transport ${transportId}`);
                
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                const iceParameters = await roomRouter.restartIce(transportId);
                
                callback({ iceParameters });
                logger.info(`[SFU] ICE restarted for transport: ${transportId}`);
            } catch (error) {
                logger.error(`[SFU] restartIce error:`, error);
                callback({ error: error.message });
            }
        });

        // ============================================
        // CLOSE PRODUCER (EXPLICIT CLIENT REQUEST)
        // ============================================
        socket.on('sfu:closeProducer', async ({ roomId, producerId }, callback = () => {}) => {
            try {
                logger.info(`[SFU] closeProducer: ${socket.id} -> ${producerId}`);

                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                roomRouter.closeProducer(producerId);

                // Update peer state bookkeeping
                const peerState = this.peerStates.get(socket.id);
                if (peerState) {
                    peerState.producerIds.delete(producerId);
                }

                if (typeof callback === 'function') {
                    callback({ success: true });
                }
                logger.info(`[SFU] Producer closed: ${producerId}`);
            } catch (error) {
                logger.error(`[SFU] closeProducer error for ${socket.id}:`, error);
                if (typeof callback === 'function') {
                    callback({ error: error.message });
                }
            }
        });

        // ============================================
        // CLOSE CONSUMER (CLEANUP ON CLIENT FAILURE)
        // ============================================
        socket.on('sfu:closeConsumer', async ({ roomId, consumerId }, callback = () => {}) => {
            try {
                logger.info(`[SFU] closeConsumer: ${socket.id} -> ${consumerId}`);

                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                roomRouter.closeConsumer(consumerId);

                // Update peer state bookkeeping
                const peerState = this.peerStates.get(socket.id);
                if (peerState) {
                    peerState.consumerIds.delete(consumerId);
                }

                if (typeof callback === 'function') {
                    callback({ success: true });
                }
                logger.info(`[SFU] Consumer closed: ${consumerId}`);
            } catch (error) {
                logger.error(`[SFU] closeConsumer error for ${socket.id}:`, error);
                if (typeof callback === 'function') {
                    callback({ error: error.message });
                }
            }
        });

        // ============================================
        // DISCONNECT HANDLER
        // ============================================
        socket.on('disconnect', async () => {
            logger.info(`[SFU] Socket disconnected: ${socket.id}`);
            
            try {
                const peerState = this.peerStates.get(socket.id);
                if (peerState && peerState.roomId) {
                    await this.cleanupPeer(socket.id, peerState.roomId);
                }
            } catch (error) {
                logger.error(`[SFU] Error during disconnect cleanup for ${socket.id}:`, error);
            } finally {
                this.peerStates.delete(socket.id);
            }
        });
    }

    // ============================================
    // CLEANUP METHODS
    // ============================================
    async cleanupPeer(socketId, roomId) {
        try {
            logger.info(`[SFU] Cleaning up peer: ${socketId} from room ${roomId}`);
            
            const roomRouter = this.roomRouters.get(roomId);
            if (!roomRouter) {
                logger.warn(`[SFU] No RoomRouter found for ${roomId} during cleanup`);
                return;
            }

            // Remove peer (closes all transports, producers, consumers)
            roomRouter.removePeer(socketId);

            // Check if room is empty
            if (roomRouter.peers.size === 0) {
                await this.cleanUpRoom(roomId);
            }

            logger.info(`[SFU] Peer cleanup complete: ${socketId}`);
        } catch (error) {
            logger.error(`[SFU] Error cleaning up peer ${socketId}:`, error);
        }
    }

    removePeer(roomId, socketId) {
        // Delegate to cleanupPeer for proper async handling
        this.cleanupPeer(socketId, roomId).catch(err => {
            logger.error(`[SFU] Error in removePeer for ${socketId}:`, err);
        });
    }

    async cleanUpRoom(roomId) {
        try {
            const roomRouter = this.roomRouters.get(roomId);
            if (!roomRouter) return;

            logger.info(`[SFU] Cleaning up room: ${roomId}`);
            
            // Close all transports/producers/consumers for extra safety
            for (const transportId of roomRouter.transports.keys()) {
                roomRouter.closeTransport(transportId);
            }
            for (const producerId of roomRouter.producers.keys()) {
                roomRouter.closeProducer(producerId);
            }
            for (const consumerId of roomRouter.consumers.keys()) {
                roomRouter.closeConsumer(consumerId);
            }

            // Close router and remove from registry
            if (roomRouter.router && !roomRouter.router.closed) {
                roomRouter.router.close();
            }
            this.roomRouters.delete(roomId);

            logger.info(`[SFU] Room cleanup complete: ${roomId}`);
        } catch (error) {
            logger.error(`[SFU] Error cleaning up room ${roomId}:`, error);
        }
    }

    async getExistingProducers(roomId) {
        const roomRouter = this.roomRouters.get(roomId);
        if (!roomRouter) {
            return [];
        }

        const producers = roomRouter.getExistingProducers();
        
        // Enhance with userId: prefer appData.userId (from mobile/web produce) so stream key
        // matches room.users[].id for remoteStreams lookup; fallback to Redis user or socketId.
        const producersWithUserId = await Promise.all(
            producers.map(async (producer) => {
                const user = await getUser(producer.socketId);
                const userId = producer.appData?.userId || (user ? user.id : producer.socketId);
                return {
                    ...producer,
                    userId
                };
            })
        );

        return producersWithUserId;
    }

    // ============================================
    // VIRTUAL BROWSER SUPPORT
    // ============================================
    async createPlainTransport(roomId) {
        logger.info(`[SFU] Creating PlainTransport for room: ${roomId}`);
        
        const roomRouter = await this.getOrCreateRoomRouter(roomId);
        const transport = await roomRouter.createPlainTransport();
        
        return {
            id: transport.id,
            ip: transport.tuple.localIp,
            port: transport.tuple.localPort,
            rtcpPort: transport.rtcpTuple ? transport.rtcpTuple.localPort : undefined
        };
    }

    async produceFromTransport(roomId, transportId, kind, rtpParameters, appData) {
        logger.info(`[SFU] Producing from PlainTransport: ${roomId}, ${kind}`);
        
        const roomRouter = await this.getOrCreateRoomRouter(roomId);
        const socketId = `virtual-browser-${roomId}`;
        
        roomRouter.addPeerResource(socketId, 'transports', transportId);
        
        const { id } = await roomRouter.produce(socketId, transportId, kind, rtpParameters, { 
            ...appData,
            userId: 'virtual-browser' 
        });
        
        // Notify others
        this.io.to(roomId).emit('sfu:newProducer', {
            producerId: id,
            socketId: socketId,
            userId: 'virtual-browser',
            kind: kind,
            appData: appData
        });
        
        return { id };
    }
}

export default SFUHandler;
