import { useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { SFUManager } from '@/services/SFUManager';
import { logger } from '@/utils/logger';
import NoiseProcessor from '@/services/audio/NoiseProcessor';
import VideoProcessor from '@/services/video/VideoProcessor';
import { SignalingService } from '@/services/SignalingService';
import { WebSocketState } from '@/contexts/WebSocketContext';

interface UseMediaStreamParams {
  sfuManagerRef: React.MutableRefObject<SFUManager | null>;
  setLocalStream: (stream: MediaStream | null) => void;
  setLocalScreenStream: (stream: MediaStream | null) => void;
  setIsAudioEnabled: (enabled: boolean) => void;
  setIsVideoEnabled: (enabled: boolean) => void;
  setIsScreenSharing: (sharing: boolean) => void;
  setIsMediaLoading: (loading: boolean) => void;
  setIsNoiseSuppressionEnabled: (enabled: boolean) => void;
  setIsAutoFramingEnabled: (enabled: boolean) => void;
  selectedVideoDeviceId?: string | null;
  selectedAudioDeviceId?: string | null;
  signalingRef: React.MutableRefObject<SignalingService | null>;
  stateRef: React.MutableRefObject<WebSocketState>;
}

const VIDEO_SOURCE = 'webcam';
const AUDIO_SOURCE = 'mic';
const SCREEN_SOURCE = 'screen';

export function useMediaStream({
  sfuManagerRef,
  setLocalStream,
  setLocalScreenStream,
  setIsAudioEnabled,
  setIsVideoEnabled,
  setIsScreenSharing,
  setIsMediaLoading,
  setIsNoiseSuppressionEnabled,
  setIsAutoFramingEnabled,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  signalingRef,
  stateRef,
}: UseMediaStreamParams) {
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Refs to track current state without triggering re-renders in internal logic
  const isAudioEnabledRef = useRef(false);
  const isVideoEnabledRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  const isNoiseSuppressionEnabledRef = useRef(false);
  const isAutoFramingEnabledRef = useRef(false);

  // --- Helper: Update Local Stream Preview ---
  const updateLocalStream = useCallback(() => {
    const tracks: MediaStreamTrack[] = [];
    if (audioTrackRef.current) tracks.push(audioTrackRef.current);
    if (videoTrackRef.current) tracks.push(videoTrackRef.current);

    if (tracks.length > 0) {
      setLocalStream(new MediaStream(tracks));
    } else {
      setLocalStream(null);
    }
  }, [setLocalStream]);

  // --- Helper: Stop Track ---
  const stopTrack = (kind: 'audio' | 'video') => {
    if (kind === 'audio' && audioTrackRef.current) {
      audioTrackRef.current.stop();
      audioTrackRef.current = null;
    } else if (kind === 'video' && videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
  };

  const checkMediaSupport = useCallback(() => {
    if (!navigator.mediaDevices) {
      const isLanHttp = window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname);
      const message = isLanHttp 
        ? "Media access (Camera/Mic) requires HTTPS on your local network. Please use localhost or connect via ngrok (https)."
        : "Your browser does not support media devices. Make sure you are using a secure context (HTTPS).";
      
      toast.error(message);
      return false;
    }
    return true;
  }, []);

  // --- API: Enable Audio ---
  const enableAudio = useCallback(async () => {
    if (isAudioEnabledRef.current) return; // Already enabled
    logger.info('[useMediaStream] Enabling Audio...');
    if (!checkMediaSupport()) return;
    setIsMediaLoading(true);

    try {
      // 1. Get User Media
      const constraints = {
        audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true,
        video: false,
      };

      let stream = await navigator.mediaDevices.getUserMedia(constraints);

      // 2. Process Audio (NS)
      if (isNoiseSuppressionEnabledRef.current) {
        stream = await NoiseProcessor.init(stream);
      }

      const track = stream.getAudioTracks()[0];
      if (!track) throw new Error('No audio track obtained');

      audioTrackRef.current = track;
      isAudioEnabledRef.current = true;
      setIsAudioEnabled(true);

      // 3. Update Preview
      updateLocalStream();

      // 4. Update SFU
      const sfu = sfuManagerRef.current;
      if (sfu) {
        // If producer exists, replace track and resume. If not, produce.
        await sfu.replaceTrack(track, AUDIO_SOURCE);
        await sfu.resumeProducer(AUDIO_SOURCE);
      }

      // 5. Sync State
      if (signalingRef.current && stateRef.current.roomId) {
        signalingRef.current.emit('user:media-state', {
          roomId: stateRef.current.roomId,
          audio: true,
          video: isVideoEnabledRef.current,
        });
      }
    } catch (err) {
      logger.error('[useMediaStream] Failed to enable audio', err);
      stopTrack('audio');
      isAudioEnabledRef.current = false;
      setIsAudioEnabled(false);
    } finally {
      setIsMediaLoading(false);
    }
  }, [
    selectedAudioDeviceId,
    setIsAudioEnabled,
    setIsMediaLoading,
    updateLocalStream,
    sfuManagerRef,
    signalingRef,
    stateRef,
    checkMediaSupport
  ]);

  // --- API: Disable Audio ---
  const disableAudio = useCallback(async () => {
    if (!isAudioEnabledRef.current) return;
    logger.info('[useMediaStream] Disabling Audio...');

    // 1. Stop Hardware
    stopTrack('audio');
    isAudioEnabledRef.current = false;
    setIsAudioEnabled(false);

    // 2. Update Preview
    updateLocalStream();

    // 3. Close producer so remote peers get producerclose and re-enable creates a fresh producer
    const sfu = sfuManagerRef.current;
    if (sfu) {
      sfu.closeProducer(AUDIO_SOURCE);
    }

    // 4. Sync State
    if (signalingRef.current && stateRef.current.roomId) {
      signalingRef.current.emit('user:media-state', {
        roomId: stateRef.current.roomId,
        audio: false,
        video: isVideoEnabledRef.current,
      });
    }
  }, [setIsAudioEnabled, updateLocalStream, sfuManagerRef, signalingRef, stateRef]);

  // --- API: Toggle Audio ---
  const toggleAudio = useCallback(() => {
    if (isAudioEnabledRef.current) {
      disableAudio();
    } else {
      enableAudio();
    }
  }, [disableAudio, enableAudio]);

  // --- API: Enable Video ---
  const enableVideo = useCallback(async () => {
    if (isVideoEnabledRef.current) return;
    logger.info('[useMediaStream] Enabling Video...');
    if (!checkMediaSupport()) return;
    setIsMediaLoading(true);

    try {
      // 1. Get User Media
      const constraints = {
        audio: false,
        video: {
          deviceId: selectedVideoDeviceId ? { exact: selectedVideoDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      };

      let stream = await navigator.mediaDevices.getUserMedia(constraints);

      // 2. Process Video (AutoFraming)
      if (isAutoFramingEnabledRef.current) {
        stream = await VideoProcessor.init(stream);
      }

      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error('No video track obtained');

      videoTrackRef.current = track;
      isVideoEnabledRef.current = true;
      setIsVideoEnabled(true);

      // 3. Update Preview
      updateLocalStream();

      // 4. Update SFU
      const sfu = sfuManagerRef.current;
      if (sfu) {
        await sfu.replaceTrack(track, VIDEO_SOURCE);
        await sfu.resumeProducer(VIDEO_SOURCE);
      }

      // 5. Sync State
      if (signalingRef.current && stateRef.current.roomId) {
        signalingRef.current.emit('user:media-state', {
          roomId: stateRef.current.roomId,
          audio: isAudioEnabledRef.current,
          video: true,
        });
      }
    } catch (err) {
      logger.error('[useMediaStream] Failed to enable video', err);
      stopTrack('video');
      isVideoEnabledRef.current = false;
      setIsVideoEnabled(false);
    } finally {
      setIsMediaLoading(false);
    }
  }, [
    selectedVideoDeviceId,
    setIsVideoEnabled,
    setIsMediaLoading,
    updateLocalStream,
    sfuManagerRef,
    signalingRef,
    stateRef,
    checkMediaSupport
  ]);

  // --- API: Disable Video ---
  const disableVideo = useCallback(async () => {
    if (!isVideoEnabledRef.current) return;
    logger.info('[useMediaStream] Disabling Video...');

    // 1. Stop Hardware
    stopTrack('video');
    isVideoEnabledRef.current = false;
    setIsVideoEnabled(false);

    // 2. Update Preview
    updateLocalStream();

    // 3. Close producer so remote peers get producerclose and re-enable creates a fresh producer
    const sfu = sfuManagerRef.current;
    if (sfu) {
      sfu.closeProducer(VIDEO_SOURCE);
    }

    // 4. Sync State
    if (signalingRef.current && stateRef.current.roomId) {
      signalingRef.current.emit('user:media-state', {
        roomId: stateRef.current.roomId,
        audio: isAudioEnabledRef.current,
        video: false,
      });
    }
  }, [setIsVideoEnabled, updateLocalStream, sfuManagerRef, signalingRef, stateRef]);

  // --- API: Toggle Video ---
  const toggleVideo = useCallback(() => {
    if (isVideoEnabledRef.current) {
      disableVideo();
    } else {
      enableVideo();
    }
  }, [disableVideo, enableVideo]);

  // --- Screen Share ---
  const stopScreenShare = useCallback(() => {
    logger.debug('[useMediaStream] Stopping Screen Share');
    const sfu = sfuManagerRef.current;

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    setLocalScreenStream(null);
    setIsScreenSharing(false);
    isScreenSharingRef.current = false;

    if (sfu) {
      sfu.closeProducer(SCREEN_SOURCE);
    }

    if (signalingRef.current && stateRef.current.roomId) {
      signalingRef.current.emit('stop-screen-share', { roomId: stateRef.current.roomId });
    }
  }, [sfuManagerRef, setLocalScreenStream, setIsScreenSharing, signalingRef, stateRef]);

  // --- API: Initial Enable (Consolidated) ---
  // Mostly used for "Join with Mic/Cam on" preferences
  const enableMedia = useCallback(
    async (startAudio = false, startVideo = false) => {
      logger.info(`[useMediaStream] Initializing media: Audio=${startAudio}, Video=${startVideo}`);

      const promises = [];
      if (startAudio) promises.push(enableAudio());
      if (startVideo) promises.push(enableVideo());

      await Promise.all(promises);
    },
    [enableAudio, enableVideo]
  );

  // --- API: Disable All (Cleanup) ---
  const disableMedia = useCallback(() => {
    logger.info('[useMediaStream] Disabling ALL media');
    disableAudio();
    disableVideo();
    // Also stop screen share
    stopScreenShare();
  }, [disableAudio, disableVideo, stopScreenShare]);

  // --- Features: Noise Suppression ---
  const toggleNoiseSuppression = useCallback(async () => {
    const newState = !isNoiseSuppressionEnabledRef.current;
    isNoiseSuppressionEnabledRef.current = newState;
    setIsNoiseSuppressionEnabled(newState);

    if (isAudioEnabledRef.current) {
      // Restart audio to apply processor
      await disableAudio();
      await enableAudio();
    }
  }, [setIsNoiseSuppressionEnabled, disableAudio, enableAudio]);

  // --- Features: Auto Framing ---
  const toggleAutoFraming = useCallback(async () => {
    const newState = !isAutoFramingEnabledRef.current;
    isAutoFramingEnabledRef.current = newState;
    setIsAutoFramingEnabled(newState);

    if (isVideoEnabledRef.current) {
      // Restart video to apply processor
      await disableVideo();
      await enableVideo();
    }
  }, [setIsAutoFramingEnabled, disableVideo, enableVideo]);


  const startScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) return;
    if (!checkMediaSupport()) return;
    
    // Additional check for getDisplayMedia specifically
    if (!navigator.mediaDevices.getDisplayMedia) {
       toast.error("Screen sharing is not supported in this browser or context.");
       return;
    }

    const sfu = sfuManagerRef.current;
    if (!sfu) return;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = displayStream;
      setLocalScreenStream(displayStream);
      setIsScreenSharing(true);
      isScreenSharingRef.current = true;

      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        await sfu.replaceTrack(videoTrack, SCREEN_SOURCE);
      }

      if (signalingRef.current && stateRef.current.roomId) {
        signalingRef.current.emit('start-screen-share', {
          roomId: stateRef.current.roomId,
          streamId: displayStream.id,
        });
      }

      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      logger.error('[useMediaStream] Failed to start screen share', err);
      stopScreenShare(); // Cleanup
    }
  }, [sfuManagerRef, setLocalScreenStream, setIsScreenSharing, stopScreenShare, signalingRef, stateRef, checkMediaSupport]);

  // --- Cleanup Effect ---
  useEffect(() => {
    return () => {
      logger.info('[useMediaStream] Unmounting - Cleaning up tracks');
      stopTrack('audio');
      stopTrack('video');
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    enableMedia,
    disableMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleNoiseSuppression,
    toggleAutoFraming,
  };
}
