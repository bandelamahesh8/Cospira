import { SignalingService } from '@/services/SignalingService';
import { SFUManager } from '@/services/SFUManager';
import { logger } from '@/utils/logger';
import type { AppData } from 'mediasoup-client/lib/types';

export type MediaSource = 'mic' | 'webcam' | 'screen';

export interface ClientCoreParticipant {
  userId: string;
  displayName: string;
  isHost: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}

export interface ClientCoreState {
  roomId: string | null;
  isConnected: boolean;
  participants: Map<string, ClientCoreParticipant>;
  remoteStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
}

export interface MediaAdapter {
  getAudioTrack(): Promise<MediaStreamTrack | null>;
  getVideoTrack(): Promise<MediaStreamTrack | null>;
  getScreenTrack(): Promise<MediaStreamTrack | null>;
  stopAll(): void;
}

type OnStateChange = (state: ClientCoreState) => void;

export class ClientCore {
  private signaling: SignalingService;
  private sfu: SFUManager;
  private mediaAdapter: MediaAdapter;
  private state: ClientCoreState;
  private onStateChange: OnStateChange;

  constructor(
    signaling: SignalingService,
    mediaAdapter: MediaAdapter,
    onStateChange: OnStateChange
  ) {
    this.signaling = signaling;
    this.mediaAdapter = mediaAdapter;
    this.onStateChange = onStateChange;

    this.state = {
      roomId: null,
      isConnected: false,
      participants: new Map(),
      remoteStreams: new Map(),
      remoteScreenStreams: new Map(),
    };

    this.sfu = new SFUManager(this.signaling, this.handleRemoteTrack);
  }

  private emitState() {
    this.onStateChange(this.state);
  }

  private handleRemoteTrack = (
    userId: string,
    track: MediaStreamTrack,
    kind: string,
    appData: AppData
  ) => {
    const isScreen = appData?.source === 'screen';
    const targetMap = isScreen ? this.state.remoteScreenStreams : this.state.remoteStreams;
    const key = String(userId);

    const existing = targetMap.get(key);
    const baseTracks = existing ? existing.getTracks().filter((t) => t.kind !== track.kind) : [];
    const stream = new MediaStream([...baseTracks, track]);
    targetMap.set(key, stream);

    this.emitState();
  };

  async joinRoom(roomId: string) {
    this.state.roomId = roomId;
    this.state.isConnected = true;
    this.emitState();

    await this.sfu.joinRoom(roomId);
    await this.sfu.requestExistingProducers(roomId);
  }

  async enableMedia() {
    const roomId = this.state.roomId;
    if (!roomId) {
      logger.warn('[ClientCore] enableMedia called without roomId');
      return;
    }

    const [audioTrack, videoTrack] = await Promise.all([
      this.mediaAdapter.getAudioTrack(),
      this.mediaAdapter.getVideoTrack(),
    ]);

    if (audioTrack) {
      await this.sfu.replaceTrack(audioTrack, 'mic');
      await this.sfu.pauseProducer('mic');
    }

    if (videoTrack) {
      await this.sfu.replaceTrack(videoTrack, 'webcam');
      await this.sfu.pauseProducer('webcam');
    }
  }

  async toggleAudio(enabled: boolean) {
    if (enabled) {
      await this.sfu.resumeProducer('mic');
    } else {
      await this.sfu.pauseProducer('mic');
    }
  }

  async toggleVideo(enabled: boolean) {
    if (enabled) {
      await this.sfu.resumeProducer('webcam');
    } else {
      await this.sfu.pauseProducer('webcam');
    }
  }

  async startScreenShare() {
    const track = await this.mediaAdapter.getScreenTrack();
    if (!track) return;
    await this.sfu.replaceTrack(track, 'screen');
  }

  async stopScreenShare() {
    this.sfu.closeProducer('screen');
  }

  leaveRoom() {
    this.mediaAdapter.stopAll();
    this.sfu.closeAll();
    this.state.roomId = null;
    this.state.remoteStreams.clear();
    this.state.remoteScreenStreams.clear();
    this.emitState();
  }
}
