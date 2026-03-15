import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SFUManager } from '@/services/SFUManager';
import { useConnection } from './ConnectionContext';
import { useRoomContext } from '@/hooks/useRoomContext';
import NoiseProcessor from '@/services/audio/NoiseProcessor';
import VideoProcessor from '@/services/video/VideoProcessor';
import { FileData } from '@/types/websocket';
import { MediaContext } from './MediaContextValue';

export const MediaProvider = ({ children }: { children: React.ReactNode }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(
    new Map()
  );

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(false);
  const [isAutoFramingEnabled, setIsAutoFramingEnabled] = useState(false);

  const [presentedFile, setPresentedFile] = useState<FileData | null>(null);
  const [isPresentingFile, setIsPresentingFile] = useState(false);
  const [presenterName, setPresenterName] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const [youtubeStatus, setYoutubeStatus] = useState<'playing' | 'paused' | 'closed'>('closed');
  const [youtubeCurrentTime, setYoutubeCurrentTime] = useState(0);

  const { socket, isConnected } = useConnection();
  const { roomId, setUsers } = useRoomContext();
  const sfuManagerRef = useRef<SFUManager | null>(null);

  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const updateLocalStream = useCallback(() => {
    const tracks: MediaStreamTrack[] = [];
    if (audioTrackRef.current) tracks.push(audioTrackRef.current);
    if (videoTrackRef.current) tracks.push(videoTrackRef.current);
    setLocalStream(tracks.length > 0 ? new MediaStream(tracks) : null);
  }, []);

  const stopTrack = (kind: 'audio' | 'video') => {
    if (kind === 'audio' && audioTrackRef.current) {
      audioTrackRef.current.stop();
      audioTrackRef.current = null;
    } else if (kind === 'video' && videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
  };

  useEffect(() => {
    if (!socket || !isConnected) return;
    const manager = new SFUManager(socket, (userId, track, kind, appData) => {
      const isScreenShare = appData?.source === 'screen';
      track.enabled = true;
      if (isScreenShare) {
        setRemoteScreenStreams((prev: Map<string, MediaStream>) => {
          const next = new Map(prev);
          const oldStream = next.get(userId);
          const filteredTracks = oldStream
            ? oldStream.getTracks().filter((t) => t.kind !== track.kind)
            : [];
          next.set(userId, new MediaStream([...filteredTracks, track]));
          return next;
        });
      } else {
        setRemoteStreams((prev: Map<string, MediaStream>) => {
          const next = new Map(prev);
          const oldStream = next.get(userId);
          const filteredTracks = oldStream
            ? oldStream.getTracks().filter((t) => t.kind !== track.kind)
            : [];
          next.set(userId, new MediaStream([...filteredTracks, track]));
          return next;
        });
        if (kind === 'audio' && userId !== 'virtual-browser') {
          setUsers((prev: User[]) =>
            prev.map((u) => (u.id === userId ? { ...u, isMuted: false } : u))
          );
        }
      }
      track.onended = () => {
        if (isScreenShare) {
          setRemoteScreenStreams((prev: Map<string, MediaStream>) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        } else {
          setRemoteStreams((prev: Map<string, MediaStream>) => {
            const next = new Map(prev);
            const stream = next.get(userId);
            if (stream) {
              stream.removeTrack(track);
              if (stream.getTracks().length === 0) next.delete(userId);
            }
            return next;
          });
        }
      };
    });
    sfuManagerRef.current = manager;
    return () => manager.closeAll();
  }, [socket, isConnected, setUsers]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const onPresentFile = (data: { file: FileData; presenterName: string }) => {
      setPresentedFile(data.file);
      setIsPresentingFile(true);
      setPresenterName(data.presenterName);
    };
    const onStopPresentation = () => {
      setPresentedFile(null);
      setIsPresentingFile(false);
      setPresenterName(null);
    };
    const onYoutubeState = (state: {
      videoId: string | null;
      status: 'playing' | 'paused' | 'closed';
      currentTime: number;
      presenterName: string | null;
    }) => {
      setYoutubeVideoId(state.videoId);
      setYoutubeStatus(state.status);
      setYoutubeCurrentTime(state.currentTime || 0);
      setIsYoutubePlaying(state.status === 'playing');
      setPresenterName(state.presenterName);
    };
    socket.on('present-file', onPresentFile);
    socket.on('stop-presentation', onStopPresentation);
    socket.on('youtube-state', onYoutubeState);
    return () => {
      socket.off('present-file', onPresentFile);
      socket.off('stop-presentation', onStopPresentation);
      socket.off('youtube-state', onYoutubeState);
    };
  }, [socket, isConnected]);

  const enableAudio = useCallback(async () => {
    if (isAudioEnabled) return;
    setIsMediaLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = isNoiseSuppressionEnabled
        ? (await NoiseProcessor.init(stream)).getAudioTracks()[0]
        : stream.getAudioTracks()[0];
      audioTrackRef.current = track;
      setIsAudioEnabled(true);
      updateLocalStream();
      if (sfuManagerRef.current) {
        await sfuManagerRef.current.replaceTrack(track, 'mic');
        await sfuManagerRef.current.resumeProducer('mic');
      }
      socket?.emit('user:media-state', { roomId, audio: true, video: isVideoEnabled });
    } catch (_err) {
      stopTrack('audio');
    } finally {
      setIsMediaLoading(false);
    }
  }, [
    isAudioEnabled,
    isVideoEnabled,
    isNoiseSuppressionEnabled,
    roomId,
    socket,
    updateLocalStream,
  ]);

  const disableAudio = useCallback(() => {
    stopTrack('audio');
    setIsAudioEnabled(false);
    updateLocalStream();
    if (sfuManagerRef.current) sfuManagerRef.current.closeProducer('mic');
    socket?.emit('user:media-state', { roomId, audio: false, video: isVideoEnabled });
  }, [isVideoEnabled, roomId, socket, updateLocalStream]);

  const toggleAudio = useCallback(
    () => (isAudioEnabled ? disableAudio() : enableAudio()),
    [isAudioEnabled, disableAudio, enableAudio]
  );

  const enableVideo = useCallback(async () => {
    if (isVideoEnabled) return;
    setIsMediaLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      const track = isAutoFramingEnabled
        ? (await VideoProcessor.init(stream)).getVideoTracks()[0]
        : stream.getVideoTracks()[0];
      videoTrackRef.current = track;
      setIsVideoEnabled(true);
      updateLocalStream();
      if (sfuManagerRef.current) {
        await sfuManagerRef.current.replaceTrack(track, 'webcam');
        await sfuManagerRef.current.resumeProducer('webcam');
      }
      socket?.emit('user:media-state', { roomId, audio: isAudioEnabled, video: true });
    } catch (_err) {
      stopTrack('video');
    } finally {
      setIsMediaLoading(false);
    }
  }, [isAudioEnabled, isVideoEnabled, isAutoFramingEnabled, roomId, socket, updateLocalStream]);

  const disableVideo = useCallback(() => {
    stopTrack('video');
    setIsVideoEnabled(false);
    updateLocalStream();
    if (sfuManagerRef.current) sfuManagerRef.current.closeProducer('webcam');
    socket?.emit('user:media-state', { roomId, audio: isAudioEnabled, video: false });
  }, [isAudioEnabled, roomId, socket, updateLocalStream]);

  const toggleVideo = useCallback(
    () => (isVideoEnabled ? disableVideo() : enableVideo()),
    [isVideoEnabled, disableVideo, enableVideo]
  );

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      screenStreamRef.current = null;
    }
    setLocalScreenStream(null);
    setIsScreenSharing(false);
    if (sfuManagerRef.current) sfuManagerRef.current.closeProducer('screen');
    socket?.emit('stop-screen-share', { roomId });
  }, [roomId, socket]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setLocalScreenStream(stream);
      setIsScreenSharing(true);
      const track = stream.getVideoTracks()[0];
      if (sfuManagerRef.current && track) await sfuManagerRef.current.replaceTrack(track, 'screen');
      socket?.emit('start-screen-share', { roomId, streamId: stream.id });
      track.onended = () => stopScreenShare();
    } catch (_err) {
      setIsScreenSharing(false);
    }
  }, [socket, roomId, stopScreenShare]);

  const enableMedia = useCallback(
    async (a = false, v = false) => {
      if (a) await enableAudio();
      if (v) await enableVideo();
    },
    [enableAudio, enableVideo]
  );
  const disableMedia = useCallback(() => {
    disableAudio();
    disableVideo();
    stopScreenShare();
  }, [disableAudio, disableVideo, stopScreenShare]);

  const toggleNoiseSuppression = useCallback(
    () => setIsNoiseSuppressionEnabled((p: boolean) => !p),
    []
  );
  const toggleAutoFraming = useCallback(() => setIsAutoFramingEnabled((p: boolean) => !p), []);

  const presentFile = (file: FileData) => socket?.emit('present-file', { roomId, file });
  const closePresentedFile = () => socket?.emit('stop-presentation', { roomId });
  const startYoutubeVideo = (videoId: string) => socket?.emit('start-youtube', { roomId, videoId });
  const stopYoutubeVideo = () => socket?.emit('stop-youtube', { roomId });
  const playYoutubeVideo = (time: number) => socket?.emit('play-youtube', { roomId, time });
  const pauseYoutubeVideo = (time: number) => socket?.emit('pause-youtube', { roomId, time });

  return (
    <MediaContext.Provider
      value={{
        localStream,
        localScreenStream,
        remoteStreams,
        remoteScreenStreams,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        isMediaLoading,
        isNoiseSuppressionEnabled,
        isAutoFramingEnabled,
        presentedFile,
        isPresentingFile,
        presenterName,
        youtubeVideoId,
        isYoutubePlaying,
        youtubeStatus,
        youtubeCurrentTime,
        enableMedia,
        disableMedia,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        toggleNoiseSuppression,
        toggleAutoFraming,
        sfuManager: sfuManagerRef.current,
        presentFile,
        closePresentedFile,
        startYoutubeVideo,
        stopYoutubeVideo,
        playYoutubeVideo,
        pauseYoutubeVideo,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};
