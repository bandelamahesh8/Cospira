import * as MediasoupClient from 'mediasoup-client';
import { registerGlobals } from 'react-native-webrtc';

// Explicitly register WebRTC globals for mediasoup-client
registerGlobals();

const TIMEOUT = 20000;

class MobileSFUManager {
  constructor() {
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers = new Map(); // kind => producer
    this.consumers = new Map(); // id => consumer
    this.signaling = null;
    this.roomId = null;
    this.onTrack = null; // Callback for new consumers
    this.consumerTransports = new Map(); // producerId -> consumerTransport (if we wanted per-consumer transport, but we use one recvTransport)
    this.pendingConsumers = new Set(); // Avoid duplicate consumption
    this.userId = null; // Logical user identifier for SFU appData
    this.consumeQueue = []; // Serialize consume to avoid race/crash when both sides toggle
    this.consumeInProgress = false;
  }

  // Initialize with signaling service and track callback
  // onTrackCallback(userId, track, kind, appData?)
  initialize(signalingService, onTrackCallback) {
    this.signaling = signalingService;
    this.onTrack = onTrackCallback;
    this.device = new MediasoupClient.Device();
    console.log('[MobileSFU] Initialized Mediasoup Device');
    
    // Auto-handle new producers from server
    // (Note: useWebSocket binds this, but we should ensure we don't duplicate logic if we bind here too.
    //  For now, let's keep the listener in useWebSocket to keep this class cleaner "service" style)
  }

  // Align with web SFUManager: allow callers to set a stable
  // logical user id so server-side SFU events can tag producers
  // with room.users[].id instead of relying purely on socket.id.
  setUserId(userId) {
    this.userId = userId;
    console.log('[MobileSFU] User ID set:', userId);
  }

  async joinRoom(roomId) {
    this.roomId = roomId;
    console.log(`[MobileSFU] Joining room: ${roomId}`);
    
    try {
      // 1. Ensure Socket is Connected
      if (!this.signaling.socket?.connected) {
          console.log('[MobileSFU] Waiting for socket connection...');
          await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 10000);
              const onConnect = () => {
                  clearTimeout(timeout);
                  resolve();
              };
              if (this.signaling.socket?.connected) {
                  onConnect();
              } else {
                  this.signaling.socket?.once('connect', onConnect);
              }
          });
      }

      // 2. Get Router RTP Capabilities
      const rtpCapabilities = await this.getSignalingData('sfu:getRouterRtpCapabilities', { roomId });
      
      // 2. Load Device
      if (!this.device.loaded) {
        await this.device.load({ routerRtpCapabilities: rtpCapabilities });
        console.log('[MobileSFU] Device loaded:', this.device.handlerName);
      }

      // 3. Create Transports
      await this.createSendTransport();
      await this.createRecvTransport();

      console.log('[MobileSFU] Room joined, transports ready');
      
      // 4. Get Existing Producers
      this.getExistingProducers();
      
    } catch (error) {
      console.error('[MobileSFU] Failed to join room:', error);
      throw error;
    }
  }

  async createSendTransport() {
    const data = await this.getSignalingData('sfu:createWebRtcTransport', { 
        roomId: this.roomId, 
        forceTcp: true, // Force TCP for better emulator/network compatibility
        rtpCapabilities: this.device.rtpCapabilities 
    });

    if (data.error) throw new Error(data.error);

    this.sendTransport = this.device.createSendTransport(data);

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.getSignalingData('sfu:connectWebRtcTransport', {
          roomId: this.roomId,
          transportId: this.sendTransport.id,
          dtlsParameters
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const { id } = await this.getSignalingData('sfu:produce', {
          roomId: this.roomId,
          transportId: this.sendTransport.id,
          kind,
          rtpParameters,
          appData
        });
        callback({ id });
      } catch (error) {
        errback(error);
      }
    });
    
    this.sendTransport.on('connectionstatechange', (state) => {
        console.log(`[MobileSFU] Send Transport state: ${state}`);
    });

    console.log('[MobileSFU] Send Transport created');
  }

  async createRecvTransport() {
    const data = await this.getSignalingData('sfu:createWebRtcTransport', { 
        roomId: this.roomId, 
        forceTcp: true, // Force TCP for better emulator/network compatibility
        rtpCapabilities: this.device.rtpCapabilities 
    });

    if (data.error) throw new Error(data.error);

    this.recvTransport = this.device.createRecvTransport(data);

    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.getSignalingData('sfu:connectWebRtcTransport', {
          roomId: this.roomId,
          transportId: this.recvTransport.id,
          dtlsParameters
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    this.recvTransport.on('connectionstatechange', (state) => {
        console.log(`[MobileSFU] Recv Transport state: ${state}`);
    });

    console.log('[MobileSFU] Recv Transport created');
  }

  async produce(track, source = 'webcam') {
    if (!this.sendTransport) {
      console.error('[MobileSFU] No send transport');
      throw new Error('Connection not ready (No Transport)');
    }

    try {
        // Stop existing producer of same kind if any
        if (this.producers.has(source)) {
            const oldProducer = this.producers.get(source);
            oldProducer.close();
            // Notify server
            this.signaling.emit('sfu:closeProducer', { roomId: this.roomId, producerId: oldProducer.id });
        }

        const appUserId = this.userId || this.signaling?.socket?.id;
        if (!this.userId && this.signaling?.socket?.id) {
            console.warn('[MobileSFU] Producing without setUserId; using socket.id for appData.userId. Call setUserId(joinedAsUserId) after join-room for correct web lookup.');
        }
        const producer = await this.sendTransport.produce({
            track,
            appData: { source, userId: appUserId }
        });

        this.producers.set(source, producer);
        console.log(`[MobileSFU] Producing ${source} (${track.kind}) - ID: ${producer.id}`);

        producer.on('transportclose', () => {
            console.log(`[MobileSFU] Producer ${source} transport closed`);
            this.producers.delete(source);
        });

        producer.on('trackended', () => {
             console.log(`[MobileSFU] Producer ${source} track ended`);
             this.closeProducer(source);
        });

        return producer;
    } catch (err) {
        console.error(`[MobileSFU] Produce failed for ${source}:`, err);
        throw err;
    }
  }
  
  async replaceTrack(track, source = 'webcam') {
      const producer = this.producers.get(source);
      if (producer && !producer.closed) {
          console.log(`[MobileSFU] Replacing track for ${source}`);
          await producer.replaceTrack({ track });
          return producer;
      } else {
          console.log(`[MobileSFU] No active producer for ${source}, creating new`);
          return await this.produce(track, source);
      }
  }

  async closeProducer(source) {
      const producer = this.producers.get(source);
      if (producer) {
          const { id } = producer;
          producer.close();
          this.producers.delete(source);
          console.log(`[MobileSFU] Closed producer ${source}`);
          
          if(this.signaling && this.roomId) {
              this.signaling.emit('sfu:closeProducer', { roomId: this.roomId, producerId: id });
          }
      }
  }
  
  async pauseProducer(source) {
    const producer = this.producers.get(source);
    if (producer && !producer.paused) {
      await producer.pause();
      if (this.signaling && this.roomId) {
        this.signaling.emit('sfu:pauseProducer', { roomId: this.roomId, producerId: producer.id }, () => {});
      }
      console.log(`[MobileSFU] Paused producer ${source}`);
    }
  }

  async resumeProducer(source) {
    const producer = this.producers.get(source);
    if (producer && producer.paused) {
      await producer.resume();
      if (this.signaling && this.roomId) {
        this.signaling.emit('sfu:resumeProducer', { roomId: this.roomId, producerId: producer.id }, () => {});
      }
      console.log(`[MobileSFU] Resumed producer ${source}`);
    }
  }

  async consume(producerId, userId, kind) {
    if (!this.recvTransport) {
        console.warn('[MobileSFU] recvTransport not ready to consume');
        return;
    }
    
    // 1. Avoid duplicate consumption
    if (this.pendingConsumers.has(producerId)) return;
    if ([...this.consumers.values()].some(c => c.producerId === producerId)) {
        console.log(`[MobileSFU] Already consuming producer ${producerId}`);
        return;
    }

    // 2. Serialize consume to avoid crash when mobile producing + web starts producing
    const runConsume = async (pid, uid, k) => {
      this.pendingConsumers.add(pid);
      try {
      console.log(`[MobileSFU] Attempting to consume ${k} from ${uid} (${pid})`);
      const data = await this.getSignalingData('sfu:consume', {
        roomId: this.roomId,
        transportId: this.recvTransport.id, // Must pass transportId!
        producerId: pid,
        // NOTE: For mediasoup-client, the server-side SFU already checks
        // router.canConsume against our RTP capabilities when creating
        // the consumer. Passing the device RTP capabilities here is enough;
        // we don't need a client-side `device.canConsume` call (which does
        // not exist on the Device instance and was causing runtime errors).
        rtpCapabilities: this.device.rtpCapabilities
      });

      const { id, kind: consumerKind, rtpParameters } = data;

      console.log('[MobileSFU] Consuming RTP Parameters:', JSON.stringify(rtpParameters, null, 2));

      const consumer = await this.recvTransport.consume({
        id,
        producerId,
        kind: consumerKind,
        rtpParameters
      });

      // Ensure remote track is explicitly enabled
      if (consumer.track) {
        consumer.track.enabled = true;
        console.log('[MobileSFU] Consumer track info:', {
          id: consumer.track.id,
          kind: consumer.track.kind,
          readyState: consumer.track.readyState,
          muted: consumer.track.muted,
        });
      }

      this.consumers.set(consumer.id, consumer);
      console.log(`[MobileSFU] Consumed ${consumer.kind} from ${uid} (id: ${consumer.id})`);

      // Resume on server
      await this.getSignalingData('sfu:resumeConsumer', {
          roomId: this.roomId,
          consumerId: consumer.id
      });
      
      // For video, proactively request a key frame to avoid black frames,
      // mirroring the older, battle-tested mobile SFU hook.
      if (consumer.kind === 'video') {
        setTimeout(() => {
          this.getSignalingData('sfu:requestKeyFrame', {
            roomId: this.roomId,
            consumerId: consumer.id,
          }).catch((err) => {
            console.warn('[MobileSFU] Keyframe request failed (non-fatal):', err?.message || err);
          });
        }, 500);
      }

      // If the remote video track gets muted/unmuted (often happens when local camera toggles),
      // request a keyframe on unmute so the decoder recovers immediately.
      let onTrackUnmute = null;
      if (consumer.kind === 'video' && consumer.track && typeof consumer.track.addEventListener === 'function') {
        let lastKeyframeAt = 0;
        onTrackUnmute = () => {
          const now = Date.now();
          // throttle: at most once per 1s
          if (now - lastKeyframeAt < 1000) return;
          lastKeyframeAt = now;
          if (!this.roomId) return;
          this.getSignalingData('sfu:requestKeyFrame', {
            roomId: this.roomId,
            consumerId: consumer.id,
          }).catch((err) => {
            console.warn('[MobileSFU] Keyframe on track unmute failed (non-fatal):', err?.message || err);
          });
        };
        try {
          consumer.track.addEventListener('unmute', onTrackUnmute);
        } catch (_e) {}
      }
      
      // Notify UI – pass appData for parity with web SFUManager
      if (this.onTrack) {
          this.onTrack(uid, consumer.track, consumerKind, data.appData || {});
      }

      // Cleanup listeners – also notify UI so it can remove tracks from remote streams
      const notifyClosed = (reason) => {
        this.consumers.delete(consumer.id);
        console.log(`[MobileSFU] Consumer ${consumer.id} closed (${reason})`);
        if (onTrackUnmute && consumer.track && typeof consumer.track.removeEventListener === 'function') {
          try { consumer.track.removeEventListener('unmute', onTrackUnmute); } catch (_e) {}
        }
        if (this.onTrack) {
          // Signal "remove track" to UI: track=null
          this.onTrack(
            uid,
            null,
            consumerKind,
            { ...(data.appData || {}), reason }
          );
        }
      };

      consumer.on('transportclose', () => notifyClosed('transportclose'));
      consumer.on('producerclose', () => notifyClosed('producerclose'));

      // When web pauses then resumes (replaceTrack), we get producerresume.
      // Request keyframe and force UI refresh so video displays correctly.
      consumer.on('producerresume', () => {
        if (consumer.kind === 'video' && this.roomId) {
          this.getSignalingData('sfu:requestKeyFrame', {
            roomId: this.roomId,
            consumerId: consumer.id,
          }).catch((err) => {
            console.warn('[MobileSFU] Keyframe on producerresume failed (non-fatal):', err?.message || err);
          });
          // Force new MediaStream so RTCView re-mounts and displays resumed video
          if (this.onTrack && consumer.track) {
            this.onTrack(uid, consumer.track, 'video', { ...(data.appData || {}), producerResumed: true });
          }
        }
      });

      return consumer;

      } catch (error) {
        console.error('[MobileSFU] Consume failed:', error);
      } finally {
        this.pendingConsumers.delete(pid);
        this.consumeInProgress = false;
        if (this.consumeQueue.length > 0) {
          const next = this.consumeQueue.shift();
          this.consumeInProgress = true;
          runConsume(next.producerId, next.userId, next.kind);
        }
      }
    };

    if (this.consumeInProgress) {
      this.consumeQueue.push({ producerId, userId, kind });
      return;
    }
    this.consumeInProgress = true;
    runConsume(producerId, userId, kind);
  }

  async getExistingProducers() {
      try {
          const producers = await this.getSignalingData('sfu:getProducers', { roomId: this.roomId });
          console.log(`[MobileSFU] Found ${producers.length} existing producers`);
          
          for (const p of producers) {
              if (p.socketId === this.signaling.socket.id) continue; // Don't consume self (loopback handled inside produce?) usually we don't consume self
              
              await this.consume(p.producerId, p.userId, p.kind);
          }
      } catch (err) {
          console.error('[MobileSFU] Failed to get existing producers:', err);
      }
  }

  closeAll() {
    console.log('[MobileSFU] Closing all');
    this.consumeQueue = [];
    this.consumeInProgress = false;
    this.producers.forEach(p => p.close());
    this.producers.clear();
    
    this.consumers.forEach(c => c.close());
    this.consumers.clear();

    if (this.sendTransport) this.sendTransport.close();
    if (this.recvTransport) this.recvTransport.close();
  }

  // --- Helper for Promise-based Socket Emits ---
  getSignalingData(event, data = {}) {
    return new Promise((resolve, reject) => {
      if (!this.signaling || !this.signaling.socket) {
          reject(new Error('Signaling not connected'));
          return;
      }

      let settled = false;
      const once = (fn) => (...args) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        fn(...args);
      };

      const timeoutId = setTimeout(() => once(() => reject(new Error(`Request timeout: ${event}`)))(), TIMEOUT);

      this.signaling.emit(event, data, (response) => {
        if (response && response.error) {
          once(() => reject(new Error(response.error)))();
        } else {
          once(() => resolve(response))();
        }
      });
    });
  }
}

export const mobileSFUManager = new MobileSFUManager();
