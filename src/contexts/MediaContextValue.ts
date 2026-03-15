import { createContext } from 'react';
import { SFUManager } from '@/services/SFUManager';
import { FileData } from '@/types/websocket';

export interface MediaState {
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isMediaLoading: boolean;
  isNoiseSuppressionEnabled: boolean;
  isAutoFramingEnabled: boolean;
  presentedFile: FileData | null;
  isPresentingFile: boolean;
  presenterName: string | null;
  youtubeVideoId: string | null;
  youtubeStatus: 'playing' | 'paused' | 'closed';
  youtubeCurrentTime: number;
  isYoutubePlaying: boolean;
}

export interface MediaContextType extends MediaState {
  enableMedia: (startAudio?: boolean, startVideo?: boolean) => Promise<void>;
  disableMedia: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  toggleNoiseSuppression: () => void;
  toggleAutoFraming: () => void;
  sfuManager: SFUManager | null;
  presentFile: (file: FileData) => void;
  closePresentedFile: () => void;
  startYoutubeVideo: (videoId: string) => void;
  stopYoutubeVideo: () => void;
  playYoutubeVideo: (time: number) => void;
  pauseYoutubeVideo: (time: number) => void;
}

export const MediaContext = createContext<MediaContextType | undefined>(undefined);
