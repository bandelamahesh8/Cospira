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
  private onTrack: (userId: string, track: MediaStreamTrack, kind: string, appData: AppData) => void;
  private loading: boolean = false;
  private connectionState: ConnectionState = 'disconnected';
  private userId: string | null = null;
  private roomId: string | null = null;
  private consumedProducers: Set<string> = new Set(); // Deduplication

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

  async joinRoom(roomId: string, _iceServers: RTCIceServer[] = []) {
    logger.info('[SFUManager] === JOIN ROOM START ===', roomId);
    this.roomId = roomId;
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
      await new Promise(resolve => setTimeout(resolve, 100));
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

    await Promise.all([
      this.createSendTransport(roomId),
      this.createRecvTransport(roomId)
    ]);

    logger.info('[SFUManager] Transports created successfully');
  }

  private async createSendTransport(roomId: string) {
    logger.info('[SFUManager] Creating send transport...');
    
    const transportParams = await this.requestTransport(roomId, true);

    // Configure with STUN servers
    this.sendTransport = this.device.createSendTransport({
      ...(transportParams as TransportOptions),
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
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
        logger.error('[SFUManager] Send transport FAILED');
      } else if (state === 'closed') {
        this.connectionState = 'closed';
      }
    });

    // Connect handler
    this.sendTransport.on('connect', 
      ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
        this.connectTransport(roomId, this.sendTransport!.id, dtlsParameters)
          .then(() => callback())
          .catch(err => errback(err));
      }
    );

    // Produce handler
    this.sendTransport.on('produce', 
      ({ kind, rtpParameters, appData }: { kind: types.MediaKind; rtpParameters: RtpParameters; appData: AppData }, 
       callback: (data: { id: string }) => void, 
       errback: (error: Error) => void) => {
        this.produceOnServer(roomId, this.sendTransport!.id, kind, rtpParameters, appData)
          .then(id => callback({ id }))
          .catch(err => errback(err));
      }
    );

    logger.info('[SFUManager] Send transport created:', this.sendTransport.id);
  }

  private async createRecvTransport(roomId: string) {
    logger.info('[SFUManager] Creating recv transport...');
    
    const transportParams = await this.requestTransport(roomId, false);

    // Configure with STUN servers
    this.recvTransport = this.device.createRecvTransport({
      ...(transportParams as TransportOptions),
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceTransportPolicy: 'all',
    });

    // Monitor connection state
    this.recvTransport.on('connectionstatechange', (state: string) => {
      logger.info(`[SFUManager] Recv transport state: ${state}`);
      
      if (state === 'failed') {
        logger.error('[SFUManager] Recv transport FAILED');
      } else if (state === 'closed') {
        logger.info('[SFUManager] Recv transport closed');
      }
    });

    // Connect handler
    this.recvTransport.on('connect', 
      ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
        this.connectTransport(roomId, this.recvTransport!.id, dtlsParameters)
          .then(() => callback())
          .catch(err => errback(err));
      }
    );

    logger.info('[SFUManager] Recv transport created:', this.recvTransport.id);
  }

  private async requestTransport(roomId: string, producing: boolean): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout creating transport'));
      }, 15000);

      this.signaling.emit('sfu:createWebRtcTransport', 
        { roomId, forceTcp: true, producing }, 
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

  private async connectTransport(roomId: string, transportId: string, dtlsParameters: DtlsParameters): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signaling.emit('sfu:connectWebRtcTransport', {
        roomId,
        transportId,
        dtlsParameters,
      }, (response: unknown) => {
        const res = response as ResponseWithError;
        
        if (res.error) {
          reject(new Error(res.error));
        } else {
          resolve();
        }
      });
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
      this.signaling.emit('sfu:produce', {
        roomId,
        transportId,
        kind,
        rtpParameters,
        appData: { ...appData, userId: this.userId },
      }, (response: unknown) => {
        const res = response as ResponseWithError;
        
        if (res.error) {
          reject(new Error(res.error));
        } else {
          resolve(res.id as string);
        }
      });
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
        // Screen sharing: High quality
        encodings = [
          { rid: 'r0', maxBitrate: 1500000, scaleResolutionDownBy: 1.0 }
        ];
        codecOptions = {
          videoGoogleStartBitrate: 1000
        };
      } else {
        // Webcam: SIMPLIFIED for Mobile Compatibility (No Simulcast, Single Layer)
        encodings = [
          { rid: 'r0', maxBitrate: 900000, scaleResolutionDownBy: 1.0 }
        ];
        codecOptions = {
          videoGoogleStartBitrate: 1000
        };
      }
    }

    const producer = await this.sendTransport.produce({ 
      track, 
      encodings, 
      codecOptions, 
      appData: { source } 
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
      this.signaling.emit(event, 
        { roomId: this.roomId, producerId }, 
        (res: unknown) => {
          const r = res as ResponseWithError;
          if (r.error) {
            logger.error(`[SFUManager] Server ${resume ? 'resume' : 'pause'} failed:`, r.error);
          }
          resolve();
        }
      );
    });
  }

  // ============================================
  // CONSUME (RECEIVE MEDIA)
  // ============================================
  async consume(roomId: string, producerId: string, socketId: string, kind: string) {
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

      // Small delay for media data
      await new Promise(resolve => setTimeout(resolve, 100));

      // Notify app
      logger.info(`[SFUManager] Calling onTrack for ${kind} track, userId: ${socketId}`);
      this.onTrack(socketId, consumer.track, kind, consumer.appData);

      // Event handlers
      consumer.on('transportclose', () => {
        logger.info(`[SFUManager] Consumer ${consumer.id} transport closed`);
        this.consumers.delete(consumer.id);
        this.consumedProducers.delete(producerId);
      });

      // @ts-ignore
      consumer.on('producerclose', () => {
        logger.info(`[SFUManager] Consumer ${consumer.id} producer closed`);
        this.consumers.delete(consumer.id);
        this.consumedProducers.delete(producerId);
      });

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
      this.signaling.emit('sfu:consume', {
        roomId,
        transportId: this.recvTransport!.id,
        producerId,
        rtpCapabilities,
      }, (response: unknown) => {
        const res = response as ResponseWithError;
        
        if (res.error) {
          reject(new Error(String(res.error)));
        } else {
          resolve(res);
        }
      });
    });
  }

  private async resumeConsumer(roomId: string, consumerId: string): Promise<void> {
    return new Promise((resolve) => {
      this.signaling.emit('sfu:resumeConsumer', 
        { roomId, consumerId }, 
        () => {
          logger.info(`[SFUManager] Consumer ${consumerId} resumed`);
          resolve();
        }
      );
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
        consumerId: targetConsumer.id 
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
      this.signaling.emit('sfu:getProducers', { roomId }, async (producers: { producerId: string, socketId: string, userId: string, kind: string }[]) => {
        if (Array.isArray(producers)) {
          logger.info(`[SFUManager] Found ${producers.length} existing producers`);
          
          for (const p of producers) {
            // Check if it's our own producer or if already consumed
            if (p.socketId !== this.signaling.id && !this.consumedProducers.has(p.producerId)) {
              logger.info(`[SFUManager] Consuming existing producer: ${p.producerId} (${p.kind})`);
              const userIdForStream = p.userId || p.socketId;
              await this.consume(roomId, p.producerId, userIdForStream, p.kind);
            }
          }
        }
        resolve();
      });
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
      await new Promise(resolve => setTimeout(resolve, 200));
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
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return true;
  }

  // ============================================
  // CLEANUP
  // ============================================
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
