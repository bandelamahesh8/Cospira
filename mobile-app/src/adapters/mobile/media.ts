import { mediaDevices } from 'react-native-webrtc';

export interface MobileMediaAdapter {
  getAudioTrack(): Promise<MediaStreamTrack | null>;
  getVideoTrack(cameraType?: 'front' | 'back'): Promise<MediaStreamTrack | null>;
  stopAll(): void;
}

class DefaultMobileMediaAdapter implements MobileMediaAdapter {
  private tracks: Set<MediaStreamTrack> = new Set();

  async getAudioTrack(): Promise<MediaStreamTrack | null> {
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    const track = stream.getAudioTracks()[0] || null;
    if (track) {
      this.tracks.add(track);
    }
    return track;
  }

  async getVideoTrack(cameraType: 'front' | 'back' = 'front'): Promise<MediaStreamTrack | null> {
    const stream = await mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: cameraType,
        width: 640,
        height: 480,
        frameRate: 24,
      },
    });
    const track = stream.getVideoTracks()[0] || null;
    if (track) {
      this.tracks.add(track);
    }
    return track;
  }

  stopAll(): void {
    this.tracks.forEach((t) => t.stop());
    this.tracks.clear();
  }
}

export const mobileMediaAdapter: MobileMediaAdapter = new DefaultMobileMediaAdapter();

