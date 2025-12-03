import mediasoupWorker from './MediasoupWorker.js';
import RoomRouter from './RoomRouter.js';
import BrowserService from './BrowserService.js';

class SFUHandler {
    constructor(io) {
        this.io = io;
        this.roomRouters = new Map(); // roomId -> RoomRouter
        this.browserServices = new Map(); // roomId -> BrowserService
    }

    async init() {
        await mediasoupWorker.run();
    }

    async getOrCreateRoomRouter(roomId) {
        let roomRouter = this.roomRouters.get(roomId);
        if (!roomRouter) {
            console.log('SFU: Creating new RoomRouter for', roomId);
            try {
                const worker = mediasoupWorker.getWorker();
                if (!worker) throw new Error('No Mediasoup worker available');
                roomRouter = new RoomRouter(roomId, worker);
                await roomRouter.init();
                this.roomRouters.set(roomId, roomRouter);
                console.log('SFU: RoomRouter initialized');
            } catch (err) {
                console.error('SFU: Failed to create RoomRouter', err);
                throw err;
            }
        }
        return roomRouter;
    }

    setupSocketEvents(socket) {
        console.log('SFU: Setting up socket events for', socket.id);

        socket.on('sfu:getRouterRtpCapabilities', async ({ roomId }, callback) => {
            console.log('SFU: Received getRouterRtpCapabilities for room', roomId);
            try {
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                console.log('SFU: Sending RTP capabilities');
                callback(roomRouter.router.rtpCapabilities);
            } catch (error) {
                console.error('sfu:getRouterRtpCapabilities error', error);
                callback({ error: error.message });
            }
        });

        socket.on('sfu:createWebRtcTransport', async ({ roomId }, callback) => {
            console.log('SFU: Received createWebRtcTransport request for room', roomId);
            try {
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                console.log('SFU: Got room router for room', roomId);
                const transportParams = await roomRouter.createWebRtcTransport(socket.id);
                console.log('SFU: Created transport for socket', socket.id);
                callback(transportParams);
            } catch (error) {
                console.error('sfu:createWebRtcTransport error', error);
                callback({ error: error.message });
            }
        });

        socket.on('sfu:connectWebRtcTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
            try {
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                await roomRouter.connectWebRtcTransport(transportId, dtlsParameters);
                callback({ success: true });
            } catch (error) {
                console.error('sfu:connectWebRtcTransport error', error);
                callback({ error: error.message });
            }
        });

        socket.on('sfu:produce', async ({ roomId, transportId, kind, rtpParameters }, callback) => {
            try {
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                const { id } = await roomRouter.produce(socket.id, transportId, kind, rtpParameters);

                // Notify other peers in the room about the new producer
                socket.to(roomId).emit('sfu:newProducer', {
                    producerId: id,
                    socketId: socket.id,
                    kind: kind
                });

                callback({ id });
            } catch (error) {
                console.error('sfu:produce error', error);
                callback({ error: error.message });
            }
        });

        socket.on('sfu:consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
            try {
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                const params = await roomRouter.consume(socket.id, transportId, producerId, rtpCapabilities);
                callback(params);
            } catch (error) {
                console.error('sfu:consume error', error);
                callback({ error: error.message });
            }
        });

        socket.on('sfu:resumeConsumer', async ({ roomId, consumerId }, callback) => {
            try {
                const roomRouter = await this.getOrCreateRoomRouter(roomId);
                await roomRouter.resumeConsumer(consumerId);
                callback({ success: true });
            } catch (error) {
                console.error('sfu:resumeConsumer error', error);
                callback({ error: error.message });
            }
        });

        socket.on('disconnect', () => {
            // Clean up peers from all room routers they might be in
            // Since we don't easily know which room they are in without tracking, 
            // we might rely on the room logic in index.js calling a cleanup method, 
            // or iterate all routers (inefficient).
            // Ideally, index.js calls a cleanup method on leave/disconnect.
        });

        socket.on('sfu:startBrowser', async ({ roomId }, callback) => {
            console.log('SFU: startBrowser for room', roomId);
            try {
                let service = this.browserServices.get(roomId);
                if (!service) {
                    const roomRouter = await this.getOrCreateRoomRouter(roomId);
                    service = new BrowserService(roomId, roomRouter.router);
                    this.browserServices.set(roomId, service);

                    service.on('close', () => {
                        this.browserServices.delete(roomId);
                        // Notify room?
                    });
                }

                const { producerId } = await service.start();

                // Notify ALL users (including the host who started it) about the new producer
                this.io.in(roomId).emit('sfu:newProducer', {
                    producerId: producerId,
                    socketId: 'browser-bot', // Special ID for browser
                    kind: 'video',
                    appData: { source: 'browser' } // Tag it
                });

                callback({ producerId });
            } catch (error) {
                console.error('sfu:startBrowser error', error);
                callback({ error: error.message });
            }
        });

        socket.on('sfu:stopBrowser', async ({ roomId }, callback) => {
            try {
                const service = this.browserServices.get(roomId);
                if (service) {
                    await service.stop();
                }
                callback({ success: true });
            } catch (error) {
                callback({ error: error.message });
            }
        });

        socket.on('sfu:browserInput', async ({ roomId, input }) => {
            const service = this.browserServices.get(roomId);
            if (service) {
                await service.handleInput(input);
            }
        });
    }

    removePeer(roomId, socketId) {
        const roomRouter = this.roomRouters.get(roomId);
        if (roomRouter) {
            roomRouter.removePeer(socketId);
            // If room is empty, close the router.
            if (roomRouter.peers.size === 0) {
                this.cleanUpRoom(roomId);
            }
        }
    }

    cleanUpRoom(roomId) {
        const service = this.browserServices.get(roomId);
        if (service) {
            service.stop();
        }

        const roomRouter = this.roomRouters.get(roomId);
        if (roomRouter) {
            console.log(`SFU: Cleaning up room ${roomId}`);
            roomRouter.router.close(); // This closes all transports and producers associated with it
            this.roomRouters.delete(roomId);
        }
    }
}

export default SFUHandler;
