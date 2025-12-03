import { Device, types } from 'mediasoup-client';
import { SignalingService } from './signaling';

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

export class SFUManager {
  private device: Device;
  private signaling: SignalingService;
  private sendTransport: Transport | undefined;
  private recvTransport: Transport | undefined;
  private producers: Map<string, Producer> = new Map(); // source -> producer
  private consumers: Map<string, Consumer> = new Map(); // consumerId -> consumer
  private onTrack: (userId: string, track: MediaStreamTrack, kind: string) => void;
  private iceServers: RTCIceServer[] = [];

  constructor(
    signaling: SignalingService,
    onTrack: (userId: string, track: MediaStreamTrack, kind: string) => void
  ) {
    this.signaling = signaling;
    this.onTrack = onTrack;
    this.device = new Device();
  }

  async joinRoom(roomId: string, iceServers: RTCIceServer[] = []) {
    console.log('SFUManager: joinRoom called', roomId);
    this.iceServers = iceServers;

    // Reset device if already loaded to allow re-joining
    if (this.device && this.device.loaded) {
      console.log('SFUManager: Device already loaded, skipping load');
      return;
    }

    // 1. Get Router RTP Capabilities
    console.log('SFUManager: Emitting sfu:getRouterRtpCapabilities');
    const routerRtpCapabilities = await new Promise<RtpCapabilities>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for getRouterRtpCapabilities')), 15000);
      this.signaling.emit('sfu:getRouterRtpCapabilities', { roomId }, (data: RtpCapabilities | ResponseWithError) => {
        clearTimeout(timeout);
        const res = data as ResponseWithError;
        if (res.error) reject(res.error);
        else resolve(data as RtpCapabilities);
      });
    });
    console.log('SFUManager: Received Router RTP Capabilities');

    // 2. Load Device
    this.device = new Device(); // Re-initialize device if not loaded or if we want a fresh one
    await this.device.load({ routerRtpCapabilities });
    console.log('SFUManager: Device loaded');

    // 3. Create Send Transport
    console.log('SFUManager: Creating Send Transport');
    await this.createSendTransport(roomId);
    console.log('SFUManager: Send Transport Created');

    // 4. Create Recv Transport
    console.log('SFUManager: Creating Recv Transport');
    await this.createRecvTransport(roomId);
    console.log('SFUManager: Recv Transport Created');
  }

  async createSendTransport(roomId: string) {
    const transportParams = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for createWebRtcTransport')), 15000);
      this.signaling.emit('sfu:createWebRtcTransport', { roomId, forceTcp: false, producing: true }, (data: Transport | ResponseWithError) => {
        clearTimeout(timeout);
        const res = data as ResponseWithError;
        if (res.error) reject(res.error);
        else resolve(data as Transport);
      });
    });

    this.sendTransport = this.device.createSendTransport({
      ...(transportParams as TransportOptions),
      iceServers: this.iceServers,
    });

    this.sendTransport.on('connect', ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
      this.signaling.emit(
        'sfu:connectWebRtcTransport',
        {
          roomId,
          transportId: this.sendTransport!.id,
          dtlsParameters,
        },
        (response: unknown) => {
          const res = response as ResponseWithError;
          if (res.error) errback(new Error(res.error));
          else {
            this.transportConnected = true;
            callback();
          }
        }
      );
    });

    this.sendTransport.on(
      'produce',
      ({ kind, rtpParameters, appData }: { kind: types.MediaKind; rtpParameters: RtpParameters; appData: AppData }, callback: (data: { id: string }) => void, errback: (error: Error) => void) => {
        this.signaling.emit(
          'sfu:produce',
          {
            roomId,
            transportId: this.sendTransport!.id,
            kind,
            rtpParameters,
            appData,
          },
          (response: unknown) => {
            const res = response as ResponseWithError;
            if (res.error) errback(new Error(res.error));
            else callback({ id: res.id as string });
          }
        );
      }
    );
  }

  async createRecvTransport(roomId: string) {
    const transportParams = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for createWebRtcTransport (recv)')), 15000);
      this.signaling.emit('sfu:createWebRtcTransport', { roomId, forceTcp: false, producing: false }, (data: Transport | ResponseWithError) => {
        clearTimeout(timeout);
        const res = data as ResponseWithError;
        if (res.error) reject(res.error);
        else resolve(data as Transport);
      });
    });

    this.recvTransport = this.device.createRecvTransport({
      ...(transportParams as TransportOptions),
      iceServers: this.iceServers,
    });

    this.recvTransport.on('connect', ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
      this.signaling.emit(
        'sfu:connectWebRtcTransport',
        {
          roomId,
          transportId: this.recvTransport!.id,
          dtlsParameters,
        },
        (response: unknown) => {
          const res = response as ResponseWithError;
          if (res.error) errback(new Error(res.error));
          else callback();
        }
      );
    });
  }

  async produce(track: MediaStreamTrack, source: string = 'webcam') {
    // Wait for transport to be ready
    const ready = await this.waitForTransportReady();
    if (!ready) {
      throw new Error('Send transport not created or not connected');
    }

    if (!this.sendTransport) throw new Error('Send transport not created');

    const producer = await this.sendTransport.produce({ track, appData: { source } });
    this.producers.set(source, producer);

    producer.on('trackended', () => {
      this.closeProducer(source);
    });

    return producer;
  }

  async replaceTrack(track: MediaStreamTrack, source: string = 'webcam') {
    const producer = this.producers.get(source);
    if (producer) {
      await producer.replaceTrack({ track });
    } else {
      await this.produce(track, source);
    }
  }

  closeProducer(source: string) {
    const producer = this.producers.get(source);
    if (producer) {
      producer.close();
      this.producers.delete(source);
    }
  }

  getProducer(source: string) {
    return this.producers.get(source);
  }

  private transportConnected = false;

  isTransportReady(): boolean {
    return !!this.sendTransport;
  }

  async waitForTransportReady(maxWait = 5000): Promise<boolean> {
    const startTime = Date.now();

    // Poll for sendTransport existence
    while (!this.sendTransport) {
      if (Date.now() - startTime > maxWait) {
        console.warn('Timed out waiting for sendTransport creation');
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return true;
  }

  async consume(roomId: string, producerId: string, socketId: string, kind: string) {
    if (!this.recvTransport) throw new Error('Recv transport not created');

    const { rtpCapabilities } = this.device;

    const data = await new Promise<ResponseWithError>((resolve, reject) => {
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
          if (res.error) reject(res.error);
          else resolve(res);
        }
      );
    });

    const consumer = await this.recvTransport.consume({
      id: data.id as string,
      producerId: data.producerId as string,
      kind: data.kind as 'audio' | 'video',
      rtpParameters: data.rtpParameters as RtpParameters,
    });

    // Resume consumer (it starts paused)
    await new Promise<void>((resolve) => {
      this.signaling.emit('sfu:resumeConsumer', { roomId, consumerId: consumer.id }, () =>
        resolve()
      );
    });

    this.consumers.set(consumer.id, consumer);

    this.onTrack(socketId, consumer.track, kind);

    consumer.on('transportclose', () => {
      this.consumers.delete(consumer.id);
    });
  }

  closeAll() {
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.producers.forEach((p) => p.close());
    this.consumers.forEach((c) => c.close());
    this.transportConnected = false;
  }
}
