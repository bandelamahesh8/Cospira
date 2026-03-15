import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { Device, types } from 'mediasoup-client';
import { SignalingService } from './SignalingService';

type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;
type RtpCapabilities = types.RtpCapabilities;
type RtpParameters = types.RtpParameters;
type DtlsParameters = types.DtlsParameters;
type TransportOptions = types.TransportOptions;
type AppData = types.AppData;

interface ResponseWithError {
  error?: string;
  [key: string]: unknown;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'closed';

export class SFUManager {
  private device: Device;
  private signaling: SignalingService;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers: Map<string, Producer> = new Map(); // source -> producer
  private consumers: Map<string, Consumer> = new Map(); // consumerId -> consumer
  private onTrack: (
    userId: string,
    track: MediaStreamTrack,
    kind: string,
    appData: AppData
  ) => void;
  private loading: boolean = false;
  private connectionState: ConnectionState = 'disconnected';
  private userId: string | null = null;
  private roomId: string | null = null;
  private consumedProducers: Set<string> = new Set(); // Deduplication
  private iceServers: RTCIceServer[] = [];

  constructor(
    signaling: SignalingService,
    onTrack: (userId: string, track: MediaStreamTrack, kind: string, appData: AppData) => void
  ) {
    this.signaling = signaling;
    this.onTrack = onTrack;
    this.device = new Device();
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  setUserId(userId: string) {
    this.userId = userId;
    logger.info('[SFUManager] User ID set:', userId);
  }

  async joinRoom(roomId: string, iceServers: RTCIceServer[] = []) {
    logger.info('[SFUManager] === JOIN ROOM START ===', roomId);
    this.roomId = roomId;
    this.iceServers = iceServers;
    this.connectionState = 'connecting';

    // Prevent concurrent loading
    if (this.loading) {
      logger.warn('[SFUManager] Device load already in progress, waiting...');
      await this.waitForLoad();
      if (this.device.loaded) {
        logger.info('[SFUManager] Device already loaded');
        await this.createTransports(roomId);
        return;
      }
    }

    // Load device if not already loaded
    if (!this.device.loaded) {
      this.loading = true;

      try {
        logger.info('[SFUManager] Loading device...');

        // Get Router RTP Capabilities
        const routerRtpCapabilities = await this.getRouterRtpCapabilities(roomId);

        // Load device
        await this.device.load({ routerRtpCapabilities });
        logger.info('[SFUManager] Device loaded successfully');
      } catch (error) {
        logger.error('[SFUManager] Failed to load device:', error);
        this.connectionState = 'failed';
        throw error;
      } finally {
        this.loading = false;
      }
    }

    // Create transports
    await this.createTransports(roomId);

    this.connectionState = 'connected';
    logger.info('[SFUManager] === JOIN ROOM COMPLETE ===');
  }

  private async waitForLoad(maxWait = 10000): Promise<void> {
    const startTime = Date.now();

    while (this.loading) {
      if (Date.now() - startTime > maxWait) {
        throw new Error('Timeout waiting for device load');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async getRouterRtpCapabilities(roomId: string): Promise<RtpCapabilities> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout getting RTP capabilities'));
      }, 15000);

      this.signaling.emit('sfu:getRouterRtpCapabilities', { roomId }, (arg: unknown) => {
        clearTimeout(timeout);

        const data = arg as RtpCapabilities | ResponseWithError;
        const res = data as ResponseWithError;

        if (res.error) {
          reject(new Error(res.error));
        } else {
          resolve(data as RtpCapabilities);
        }
      });
    });
  }

  // ============================================
  // TRANSPORT CREATION
  // ============================================
  private async createTransports(roomId: string) {
    logger.info('[SFUManager] Creating transports...');

    // Close existing transports if any
    if (this.sendTransport && !this.sendTransport.closed) {
      this.sendTransport.close();
    }
    if (this.recvTransport && !this.recvTransport.closed) {
      this.recvTransport.close();
    }

    await Promise.all([this.createSendTransport(roomId), this.createRecvTransport(roomId)]);

    logger.info('[SFUManager] Transports created successfully');
  }

  private async createSendTransport(roomId: string) {
    logger.info('[SFUManager] Creating send transport...');

    const transportParams = await this.requestTransport(roomId, true);

    // Configure with STUN/TURN servers
    this.sendTransport = this.device.createSendTransport({
      ...(transportParams as TransportOptions),
      iceServers: this.iceServers.length > 0 ? this.iceServers : [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ],
      iceTransportPolicy: 'all',
    });

    // Monitor connection state
    this.sendTransport.on('connectionstatechange', (state: string) => {
      logger.info(`[SFUManager] Send transport state: ${state}`);

      if (state === 'connected') {
        this.connectionState = 'connected';
      } else if (state === 'failed') {
        this.connectionState = 'failed';
        logger.error('[SFUManager] Send transport ICE connection FAILED. This usually happens when UDP ports are blocked (e.g. by ngrok or a firewall).');
        toast.error('Media connection failed. If you are using ngrok, please check UDP port forwarding.');
      } else if (state === 'closed') {
        this.connectionState = 'closed';
      }
    });

    this.sendTransport.on('icegatheringstatechange', (state: string) => {
      logger.debug(`[SFUManager] Send transport ICE gathering: ${state}`);
    });

    // Connect handler
    this.sendTransport.on(
      'connect',
      (
        { dtlsParameters }: { dtlsParameters: DtlsParameters },
        callback: () => void,
        errback: (error: Error) => void
      ) => {
        this.connectTransport(roomId, this.sendTransport!.id, dtlsParameters)
          .then(() => callback())
          .catch((err) => errback(err));
      }
    );

    // Produce handler
    this.sendTransport.on(
      'produce',
      (
        {
          kind,
          rtpParameters,
          appData,
        }: { kind: types.MediaKind; rtpParameters: RtpParameters; appData: AppData },
        callback: (data: { id: string }) => void,
        errback: (error: Error) => void
      ) => {
        this.produceOnServer(roomId, this.sendTransport!.id, kind, rtpParameters, appData)
          .then((id) => callback({ id }))
          .catch((err) => errback(err));
      }
    );

    logger.info('[SFUManager] Send transport created:', this.sendTransport.id);
  }

  private async createRecvTransport(roomId: string) {
    logger.info('[SFUManager] Creating recv transport...');

    const transportParams = await this.requestTransport(roomId, false);

    // Configure with STUN/TURN servers
    this.recvTransport = this.device.createRecvTransport({
      ...(transportParams as TransportOptions),
      iceServers: this.iceServers.length > 0 ? this.iceServers : [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceTransportPolicy: 'all',
    });

    // Monitor connection state
    this.recvTransport.on('connectionstatechange', (state: string) => {
      logger.info(`[SFUManager] Recv transport state: ${state}`);

      if (state === 'failed') {
        logger.error('[SFUManager] Recv transport ICE connection FAILED. Remote media tracks will not play.');
      } else if (state === 'closed') {
        logger.info('[SFUManager] Recv transport closed');
      }
    });

    this.recvTransport.on('icegatheringstatechange', (state: string) => {
      logger.debug(`[SFUManager] Recv transport ICE gathering: ${state}`);
    });

    // Connect handler
    this.recvTransport.on(
      'connect',
      (
        { dtlsParameters }: { dtlsParameters: DtlsParameters },
        callback: () => void,
        errback: (error: Error) => void
      ) => {
        this.connectTransport(roomId, this.recvTransport!.id, dtlsParameters)
          .then(() => callback())
          .catch((err) => errback(err));
      }
    );

    logger.info('[SFUManager] Recv transport created:', this.recvTransport.id);
  }

  private async requestTransport(roomId: string, producing: boolean): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout creating transport'));
      }, 15000);

      // Detect if we are running through a tunnel (ngrok, dev tunnels, etc.)
      const isTunnel = 
        window.location.hostname.includes('ngrok') || 
        window.location.hostname.includes('devtunnels.ms') ||
        window.location.hostname.includes('cloudflare');

      this.signaling.emit(
        'sfu:createWebRtcTransport',
        { roomId, forceTcp: isTunnel, producing },
        (arg: unknown) => {
          clearTimeout(timeout);

          const data = arg as Transport | ResponseWithError;
          const res = data as ResponseWithError;

          if (res.error) {
            reject(new Error(res.error));
          } else {
            resolve(data as Transport);
          }
        }
      );
    });
  }

  private async connectTransport(
    roomId: string,
    transportId: string,
    dtlsParameters: DtlsParameters
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signaling.emit(
        'sfu:connectWebRtcTransport',
        {
          roomId,
          transportId,
          dtlsParameters,
        },
        (response: unknown) => {
          const res = response as ResponseWithError;

          if (res.error) {
            reject(new Error(res.error));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private async produceOnServer(
    roomId: string,
    transportId: string,
    kind: types.MediaKind,
    rtpParameters: RtpParameters,
    appData: AppData
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.signaling.emit(
        'sfu:produce',
        {
          roomId,
          transportId,
          kind,
          rtpParameters,
          appData: { ...appData, userId: this.userId },
        },
        (response: unknown) => {
          const res = response as ResponseWithError;

          if (res.error) {
            reject(new Error(res.error));
          } else {
            resolve(res.id as string);
          }
        }
      );
    });
  }

  // ============================================
  // PRODUCE (SEND MEDIA)
  // ============================================
  async produce(track: MediaStreamTrack, source: string = 'webcam'): Promise<Producer> {
    // 1. Check if producer already exists for this source
    const existingProducer = this.producers.get(source);

    if (existingProducer && !existingProducer.closed) {
      logger.info(`[SFUManager] Producer already exists for ${source}, replacing track...`);
      await existingProducer.replaceTrack({ track });

      // Ensure it's resumed if it was paused
      if (existingProducer.paused) {
        await existingProducer.resume();
        if (this.roomId) {
          await this.syncProducerState(existingProducer.id, true);
        }
      }

      return existingProducer;
    }

    // Wait for transport
    const ready = await this.waitForTransportReady();
    if (!ready || !this.sendTransport) {
      throw new Error('Send transport not ready');
    }

    logger.info(`[SFUManager] Producing ${track.kind} track for source: ${source}`);

    let encodings;
    let codecOptions;

    if (track.kind === 'video') {
      if (source === 'screen') {
        // Screen sharing optimization: prioritize clarity (resolution) over framerate
        // and force TCP for tunnels to bypass UDP blocks.
        encodings = [
          { 
            rid: 'r0', 
            maxBitrate: 2500000, // Slightly higher for clear PPTs
            scaleResolutionDownBy: 1.0,
            maxFramerate: 30 
          }
        ];
        codecOptions = {
          videoGoogleStartBitrate: 1000,
        };
        
        // Use browser hint if available
        if ('contentHint' in track) {
          (track as { contentHint?: string }).contentHint = 'text';
        }
      } else {
        // Webcam
        encodings = [{ rid: 'r0', maxBitrate: 1000000, scaleResolutionDownBy: 1.0 }];
        codecOptions = {
          videoGoogleStartBitrate: 600,
        };
      }
    }

    const producer = await this.sendTransport.produce({
      track,
      encodings,
      codecOptions,
      appData: { source },
    });

    this.producers.set(source, producer);

    // Handle track ended
    producer.on('trackended', () => {
      logger.warn(`[SFUManager] Producer ${producer.id} track ended`);
      this.closeProducer(source);
    });

    logger.info(`[SFUManager] Producer created: ${producer.id} for source: ${source}`);
    return producer;
  }

  async replaceTrack(track: MediaStreamTrack, source: string = 'webcam') {
    const producer = this.producers.get(source);

    if (producer && !producer.closed) {
      await producer.replaceTrack({ track });
      logger.info(`[SFUManager] Track replaced for source: ${source}`);
    } else {
      await this.produce(track, source);
    }
  }

  closeProducer(source: string) {
    const producer = this.producers.get(source);

    if (producer) {
      const { id } = producer;
      if (!producer.closed) {
        producer.close();
        logger.info(`[SFUManager] Producer closed for source: ${source}`);
      }

      // Notify server to close producer
      if (this.roomId) {
        this.signaling.emit('sfu:closeProducer', { roomId: this.roomId, producerId: id });
      }
    }

    this.producers.delete(source);
  }

  getProducer(source: string): Producer | undefined {
    return this.producers.get(source);
  }

  async pauseProducer(source: string) {
    const producer = this.producers.get(source);

    if (!producer || producer.closed) {
      logger.warn(`[SFUManager] No producer found for ${source}`);
      return;
    }

    if (!producer.paused) {
      await producer.pause();

      // Sync with server
      if (this.roomId) {
        await this.syncProducerState(producer.id, false);
      }

      logger.info(`[SFUManager] Producer paused: ${source}`);
    }
  }

  async resumeProducer(source: string) {
    const producer = this.producers.get(source);

    if (!producer || producer.closed) {
      logger.warn(`[SFUManager] No producer found for ${source}`);
      return;
    }

    if (producer.paused) {
      await producer.resume();

      // Sync with server
      if (this.roomId) {
        await this.syncProducerState(producer.id, true);
      }

      logger.info(`[SFUManager] Producer resumed: ${source}`);
    }
  }

  private async syncProducerState(producerId: string, resume: boolean): Promise<void> {
    const event = resume ? 'sfu:resumeProducer' : 'sfu:pauseProducer';

    return new Promise((resolve) => {
      this.signaling.emit(event, { roomId: this.roomId, producerId }, (res: unknown) => {
        const r = res as ResponseWithError;
        if (r.error) {
          logger.error(`[SFUManager] Server ${resume ? 'resume' : 'pause'} failed:`, r.error);
        }
        resolve();
      });
    });
  }

  // ============================================
  // CONSUME (RECEIVE MEDIA)
  // ============================================

  /**
   * Closes existing consumers for the same user and kind.
   * Important for handling producer replacement on mobile/web without
   * explicit producerclose notification (e.g. abrupt switch).
   */
  private closeStaleConsumers(userId: string, kind: string) {
    const uid = String(userId);
    let count = 0;

    for (const [id, consumer] of this.consumers.entries()) {
      // Note: consumer.appData should contain userId if the server sends it,
      // or we check the userId we passed to onTrack.
      // In our case, socketId passed to consume() is the userId.

      // Check if consumer matches user and kind
      const appData = consumer.appData as Record<string, unknown>;
      const consumerUserId = appData?.userId || appData?.socketId;

      if (consumer.kind === kind && (String(consumerUserId) === uid || String(id).includes(uid))) {
        logger.info(`[SFUManager] Closing stale consumer: ${id} (kind: ${kind}, user: ${uid})`);
        consumer.close();
        this.consumers.delete(id);
        this.consumedProducers.delete(consumer.producerId);
        count++;
      }
    }

    if (count > 0) {
      logger.info(`[SFUManager] Cleaned up ${count} stale consumers for user ${uid}`);
    }
  }

  async consume(roomId: string, producerId: string, socketId: string, kind: string) {
    // 1. Clean up stale consumers for this user and kind before creating a new one
    this.closeStaleConsumers(socketId, kind);

    // Deduplication
    if (this.consumedProducers.has(producerId)) {
      logger.warn(`[SFUManager] Producer ${producerId} already consumed`);
      return;
    }
    this.consumedProducers.add(producerId);

    // Wait for recv transport
    const ready = await this.waitForRecvTransportReady();
    if (!ready || !this.recvTransport) {
      logger.error('[SFUManager] Recv transport not ready');
      this.consumedProducers.delete(producerId);
      return;
    }

    try {
      logger.info(`[SFUManager] Consuming producer: ${producerId}`);

      const { rtpCapabilities } = this.device;

      // Request consumption from server
      const data = await this.requestConsume(roomId, producerId, rtpCapabilities);

      // Create consumer
      const consumer = await this.recvTransport.consume({
        id: data.id as string,
        producerId: data.producerId as string,
        kind: data.kind as 'audio' | 'video',
        rtpParameters: data.rtpParameters as RtpParameters,
        appData: data.appData as AppData,
      });

      logger.info(`[SFUManager] Consumer created: ${consumer.id} for producer ${producerId}`);

      // Resume consumer
      await this.resumeConsumer(roomId, consumer.id);

      // Store consumer
      this.consumers.set(consumer.id, consumer);

      // Ensure track is enabled
      if (consumer.track) {
        consumer.track.enabled = true;

        logger.debug(`[SFUManager] Track state:`, {
          trackId: consumer.track.id,
          kind: consumer.track.kind,
          enabled: consumer.track.enabled,
          muted: consumer.track.muted,
          readyState: consumer.track.readyState,
        });
      }

      // Small delay for media data to start flowing
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Request keyframe for video tracks to prevent initial black/blank screens
      if (kind === 'video') {
         try {
           // Use a safe cast to check for requestKeyFrame
           const consumerWithKeyFrame = consumer as { requestKeyFrame?: () => void };
           consumerWithKeyFrame.requestKeyFrame?.();
         } catch (_err) {
           logger.debug('Keyframe request not supported for this consumer');
         }
      }

      // Notify app
      logger.info(`[SFUManager] Calling onTrack for ${kind} track, userId: ${socketId}`);
      this.onTrack(socketId, consumer.track, kind, consumer.appData);

      // Event handlers
      const handleTrackEnded = () => {
        logger.info(`[SFUManager] Consumer ${consumer.id} track/producer ended`);
        this.consumers.delete(consumer.id);
        this.consumedProducers.delete(producerId);
      };

      consumer.on('transportclose', handleTrackEnded);

      // @ts-expect-error - producerclose is a custom event on consumer in some versions of mediasoup-client
      consumer.on('producerclose', handleTrackEnded);

      // Also monitor track ended
      if (consumer.track) {
        consumer.track.onended = handleTrackEnded;
      }
    } catch (error) {
      logger.error(`[SFUManager] Consume error:`, error);
      this.consumedProducers.delete(producerId);
    }
  }

  private async requestConsume(
    roomId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<ResponseWithError> {
    return new Promise((resolve, reject) => {
      this.signaling.emit(
        'sfu:consume',
        {
          roomId,
          transportId: this.recvTransport!.id,
          producerId,
          rtpCapabilities,
        },
        (response: unknown) => {
          const res = response as ResponseWithError;

          if (res.error) {
            reject(new Error(String(res.error)));
          } else {
            resolve(res);
          }
        }
      );
    });
  }

  private async resumeConsumer(roomId: string, consumerId: string): Promise<void> {
    return new Promise((resolve) => {
      this.signaling.emit('sfu:resumeConsumer', { roomId, consumerId }, () => {
        logger.info(`[SFUManager] Consumer ${consumerId} resumed`);
        resolve();
      });
    });
  }

  // ============================================
  // KEY FRAME REQUEST
  // ============================================
  requestKeyFrame(trackId: string) {
    let targetConsumer: Consumer | undefined;

    for (const consumer of this.consumers.values()) {
      if (consumer.track.id === trackId) {
        targetConsumer = consumer;
        break;
      }
    }

    if (targetConsumer && this.roomId) {
      logger.debug(`[SFUManager] Requesting key frame for consumer ${targetConsumer.id}`);

      this.signaling.emit('sfu:requestKeyFrame', {
        roomId: this.roomId,
        consumerId: targetConsumer.id,
      });
    } else {
      if (!this.roomId) {
        logger.warn('[SFUManager] Cannot request key frame: roomId not set');
      } else {
        logger.warn(`[SFUManager] No consumer found for track ${trackId}`);
      }
    }
  }

  // ============================================
  // PRODUCER DISCOVERY
  // ============================================
  async requestExistingProducers(roomId: string) {
    logger.info('[SFUManager] Requesting existing producers for room:', roomId);

    return new Promise<void>((resolve) => {
      this.signaling.emit(
        'sfu:getProducers',
        { roomId },
        async (
          producers: { producerId: string; socketId: string; userId: string; kind: string }[]
        ) => {
          if (Array.isArray(producers)) {
            logger.info(`[SFUManager] Found ${producers.length} existing producers`);

            for (const p of producers) {
              // Check if it's our own producer or if already consumed
              if (p.socketId !== this.signaling.id && !this.consumedProducers.has(p.producerId)) {
                logger.info(
                  `[SFUManager] Consuming existing producer: ${p.producerId} (${p.kind})`
                );
                const userIdForStream = p.userId || p.socketId;
                await this.consume(roomId, p.producerId, userIdForStream, p.kind);
              }
            }
          }
          resolve();
        }
      );
    });
  }

  // ============================================
  // UTILITY
  // ============================================
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isTransportReady(): boolean {
    return !!this.sendTransport && !this.sendTransport.closed;
  }

  isRecvTransportReady(): boolean {
    return !!this.recvTransport && !this.recvTransport.closed;
  }

  async waitForTransportReady(maxWait = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (!this.sendTransport || this.sendTransport.closed) {
      if (Date.now() - startTime > maxWait) {
        logger.warn('[SFUManager] Timeout waiting for send transport');
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return true;
  }

  async waitForRecvTransportReady(maxWait = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (!this.recvTransport || this.recvTransport.closed) {
      if (Date.now() - startTime > maxWait) {
        logger.warn('[SFUManager] Timeout waiting for recv transport');
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return true;
  }

  // ============================================
  // CLEANUP
  // ============================================
  async repair() {
    logger.info('[SFUManager] Repairing media connection...');
    
    // 1. Kickstart producers
    for (const [source, producer] of this.producers.entries()) {
      if (!producer.closed) {
        try {
          await producer.pause();
          await new Promise(r => setTimeout(r, 100));
          await producer.resume();
          logger.info(`[SFUManager] Kicked producer: ${source}`);
        } catch (err) {
          logger.error(`[SFUManager] Failed to kick producer ${source}:`, err);
        }
      }
    }

    // 2. Kickstart consumers
    for (const consumer of this.consumers.values()) {
      if (!consumer.closed) {
        try {
          if (consumer.kind === 'video') {
            const c = consumer as { requestKeyFrame?: () => void };
            c.requestKeyFrame?.();
          }
          logger.info(`[SFUManager] Requested keyframe for consumer: ${consumer.id}`);
        } catch (_err) {
          logger.debug('Keyframe request failed during repair');
        }
      }
    }
  }

  closeAll() {
    logger.info('[SFUManager] === CLEANUP START ===');

    // Close producers
    for (const [source, producer] of this.producers.entries()) {
      if (!producer.closed) {
        producer.close();
        logger.info(`[SFUManager] Closed producer: ${source}`);
      }
    }
    this.producers.clear();

    // Close consumers
    for (const [id, consumer] of this.consumers) {
      if (!consumer.closed) {
        consumer.close();
        logger.info(`[SFUManager] Closed consumer: ${id}`);
      }
    }
    this.consumers.clear();
    this.consumedProducers.clear();

    // Close transports
    if (this.sendTransport && !this.sendTransport.closed) {
      this.sendTransport.close();
      logger.info('[SFUManager] Closed send transport');
    }
    this.sendTransport = null;

    if (this.recvTransport && !this.recvTransport.closed) {
      this.recvTransport.close();
      logger.info('[SFUManager] Closed recv transport');
    }
    this.recvTransport = null;

    this.connectionState = 'closed';
    logger.info('[SFUManager] === CLEANUP COMPLETE ===');
  }
}
