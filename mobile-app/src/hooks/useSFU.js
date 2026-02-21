import { useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules } from 'react-native';
import { socketService } from '../services/socket.service';
import { authStore } from '../store/authStore';

const hasNativeWebRTC = !!NativeModules.WebRTCModule;

export const useSFU = (roomId, joinedAsUserId = null) => {
  // State
  const [joined, setJoined] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [cameraType, setCameraType] = useState('front');

  // Refs
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef(new Map()); // kind -> producer
  const consumersRef = useRef(new Map()); // consumerId -> consumer
  const consumedProducersRef = useRef(new Set());
  
  // CRITICAL: Separate refs for each track to prevent cross-contamination
  const videoTrackRef = useRef(null);
  const audioTrackRef = useRef(null);
  const localStreamRef = useRef(null);
  const isCleaningUpRef = useRef(false);

  // Use server-assigned id so remoteStreams keys match room.users[].id for VideoGrid lookup
  const userId = joinedAsUserId || authStore.user?.id || (socketService.socket?.id) || ('guest-' + Math.floor(Math.random() * 10000));

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    if (!roomId) return;
    initSFU();
    return () => {
      cleanup();
    };
  }, [roomId]);

  // ============================================
  // ARCHITECTURAL FIX: CONSOLIDATED MEDIA ACQUISITION
  // ============================================
  const initSFU = async () => {
    if (isInitializing || deviceRef.current) {
      console.log('[SFU] Already initialized');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);
      
      if (!hasNativeWebRTC) {
        throw new Error('WebRTC not supported');
      }

      console.log('[SFU] === INIT START (Consolidated) ===');

      // 1. Get Router RTP Capabilities
      const routerRtpCapabilities = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
        socketService.emit('sfu:getRouterRtpCapabilities', { roomId }, (data) => {
          clearTimeout(timeout);
          if (!data || data.error) reject(new Error(data?.error || 'No response'));
          else resolve(data);
        });
      });

      // 2. Load Device
      const { Device } = require('mediasoup-client');
      const device = new Device();
      await device.load({ routerRtpCapabilities });
      deviceRef.current = device;

      // 3. Create Transports
      await Promise.all([
        createSendTransport(roomId),
        createRecvTransport(roomId)
      ]);

      setupSocketListeners();
      requestExistingProducers();

      setJoined(true);
      setIsInitializing(false);
      console.log('[SFU] === INIT COMPLETE (Consolidated) ===');
    } catch (err) {
      console.error('[SFU] Init error:', err);
      setError(err.message);
      setIsInitializing(false);
      cleanup();
    }
  };

  /**
   * lazyAcquireMedia
   * Acquires the actual hardware tracks only when requested (e.g. toggle on)
   */
  const lazyAcquireMedia = async (kind) => {
    const md = global.mediaDevices || (global.navigator && global.navigator.mediaDevices);
    if (!md) throw new Error('mediaDevices not available');

    // Optimization: Request both if possible to prevent "stealing" hardware focus
    // If we already have one, we try to preserve it.
    
    if (kind === 'audio' && !audioTrackRef.current) {
        console.log('[SFU] Lazy acquiring audio...');
        const stream = await md.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: !!videoTrackRef.current // Keep video active if it was on
        });
        audioTrackRef.current = stream.getAudioTracks()[0];
        if (videoTrackRef.current && stream.getVideoTracks()[0]) {
             // If we got a new video track, update it
             videoTrackRef.current.stop();
             videoTrackRef.current = stream.getVideoTracks()[0];
        }
        audioTrackRef.current.enabled = true; 
        updateLocalStream(audioTrackRef.current);
    }

    if (kind === 'video' && !videoTrackRef.current) {
        console.log('[SFU] Lazy acquiring video...');
        const stream = await md.getUserMedia({
            audio: !!audioTrackRef.current, // Keep audio active if it was on
            video: { facingMode: cameraType, width: 640, height: 480, frameRate: 24 }
        });
        videoTrackRef.current = stream.getVideoTracks()[0];
        if (audioTrackRef.current && stream.getAudioTracks()[0]) {
             audioTrackRef.current.stop();
             audioTrackRef.current = stream.getAudioTracks()[0];
        }
        videoTrackRef.current.enabled = true;
        updateLocalStream(videoTrackRef.current);
    }
  };

  const updateLocalStream = (track) => {
    if (!localStreamRef.current) {
        localStreamRef.current = new global.MediaStream();
        setLocalStream(localStreamRef.current);
    }
    
    // Remove old tracks of same kind
    const existing = localStreamRef.current.getTracks().find(t => t.kind === track.kind);
    if (existing) localStreamRef.current.removeTrack(existing);
    
    localStreamRef.current.addTrack(track);
    // Trigger state update
    setLocalStream(new global.MediaStream(localStreamRef.current.getTracks()));
  };

  const updateLocalStreamAfterTrackRemoved = (kind) => {
    if (!localStreamRef.current) return;
    const tracks = localStreamRef.current.getTracks().filter(t => t.kind !== kind);
    if (tracks.length === 0) {
      localStreamRef.current = null;
      setLocalStream(null);
    } else {
      localStreamRef.current = new global.MediaStream(tracks);
      setLocalStream(new global.MediaStream(tracks));
    }
  };

  // ============================================
  // TRANSPORT CREATION
  // ============================================
  const createSendTransport = async (roomId) => {
    const transportParams = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
      socketService.emit('sfu:createWebRtcTransport', 
        { roomId, forceTcp: true, producing: true }, 
        (data) => {
          clearTimeout(timeout);
          if (data.error) reject(new Error(data.error));
          else resolve(data);
        }
      );
    });

    const transport = deviceRef.current.createSendTransport({
      ...transportParams,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    sendTransportRef.current = transport;

    transport.on('connectionstatechange', (state) => {
      console.log(`[SFU] Send transport: ${state}`);
      if (state === 'failed') {
        setError('Connection failed');
      }
    });

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      socketService.emit('sfu:connectWebRtcTransport', {
        roomId,
        transportId: transport.id,
        dtlsParameters,
      }, (response) => {
        if (response.error) errback(new Error(response.error));
        else callback();
      });
    });

    transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
      socketService.emit('sfu:produce', {
        roomId,
        transportId: transport.id,
        kind,
        rtpParameters,
        appData: { ...appData, userId },
      }, (response) => {
        if (response.error) errback(new Error(response.error));
        else callback({ id: response.id });
      });
    });

    console.log('[SFU] Send transport created');
  };

  const createRecvTransport = async (roomId) => {
    const transportParams = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
      socketService.emit('sfu:createWebRtcTransport', 
        { roomId, forceTcp: true, producing: false }, 
        (data) => {
          clearTimeout(timeout);
          if (data.error) reject(new Error(data.error));
          else resolve(data);
        }
      );
    });

    const transport = deviceRef.current.createRecvTransport({
      ...transportParams,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    recvTransportRef.current = transport;

    transport.on('connectionstatechange', (state) => {
      console.log(`[SFU] Recv transport: ${state}`);
    });

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      socketService.emit('sfu:connectWebRtcTransport', {
        roomId,
        transportId: transport.id,
        dtlsParameters,
      }, (response) => {
        if (response.error) errback(new Error(response.error));
        else callback();
      });
    });

    console.log('[SFU] Recv transport created');
  };

  // ============================================
  // SOCKET LISTENERS
  // ============================================
  const setupSocketListeners = () => {
    socketService.off('sfu:newProducer');
    
    socketService.on('sfu:newProducer', async (data) => {
      console.log('[SFU] New producer:', data.producerId, data.kind);
      
      if (data.socketId === socketService.socket.id) {
        console.log('[SFU] Ignoring own producer');
        return;
      }
      
      await consumeProducer(data.producerId, data.userId, data.kind);
    });
  };

  // ============================================
  // TOGGLE LOGIC (Visual State Only)
  // ============================================
  const createProducer = async (kind, track) => {
    if (!sendTransportRef.current) return null;
    
    console.log(`[SFU] Creating ${kind} producer...`);
    let producer;
    
    if (kind === 'audio') {
        producer = await sendTransportRef.current.produce({ 
            track, 
            appData: { source: 'mic' } 
        });
    } else {
        producer = await sendTransportRef.current.produce({ 
            track, 
            encodings: [{ rid: 'r0', maxBitrate: 900000, scaleResolutionDownBy: 1.0 }],
            codecOptions: { videoGoogleStartBitrate: 1000 },
            appData: { source: 'webcam' } 
        });
    }
    
    producersRef.current.set(kind, producer);
    return producer;
  };

  const toggleAudio = useCallback(async () => {
    try {
      const newState = !isAudioEnabled;
      console.log('[SFU] === TOGGLE AUDIO:', newState, '===');

      // 1. Lazy Acquire Hardware
      if (newState) {
          await lazyAcquireMedia('audio');
      }

      let audioTrack = audioTrackRef.current;
      let audioProducer = producersRef.current.get('audio');

      // 2. Lazy Create Producer
      if (newState && audioTrack && !audioProducer) {
          audioProducer = await createProducer('audio', audioTrack);
      }

      if (!audioTrack || !audioProducer) {
          console.warn('[SFU] Audio track or producer missing');
          if (newState) setError('Audio not available');
          return;
      }

      // 3. Toggle Track Enabled
      audioTrack.enabled = newState;
      
      // 4. Toggle Producer Pause/Resume, or when OFF: stop track and close producer (release hardware)
      if (newState) {
          if (audioProducer.paused) {
              await audioProducer.resume();
              await syncProducerResume(audioProducer.id);
          }
      } else {
          if (!audioProducer.paused) {
              await audioProducer.pause();
              await syncProducerPause(audioProducer.id);
          }
          audioProducer.close();
          producersRef.current.delete('audio');
          if (audioTrackRef.current) {
              audioTrackRef.current.stop();
              audioTrackRef.current = null;
          }
          updateLocalStreamAfterTrackRemoved('audio');
      }

      setIsAudioEnabled(newState);
      socketService.emit('user:media-state', { 
          roomId, 
          audio: newState, 
          video: isVideoEnabled 
      });
    } catch (error) {
      console.error('[SFU] Toggle audio error:', error);
      setError('Failed to toggle audio');
      setIsAudioEnabled(false);
    }
  }, [isAudioEnabled, roomId]);


  const toggleVideo = useCallback(async () => {
    try {
      const newState = !isVideoEnabled;
      console.log('[SFU] === TOGGLE VIDEO:', newState, '===');

      // 1. Lazy Acquire Hardware
      if (newState) {
          await lazyAcquireMedia('video');
      }

      let videoTrack = videoTrackRef.current;
      let videoProducer = producersRef.current.get('video');

      // 2. Lazy Create Producer
      if (newState && videoTrack && !videoProducer) {
          videoProducer = await createProducer('video', videoTrack);
      }

      if (!videoTrack || !videoProducer) {
          console.warn('[SFU] Video track or producer missing');
          if (newState) setError('Video not available');
          return;
      }

      // 3. Toggle Track Enabled
      videoTrack.enabled = newState;

      // 4. Toggle Producer Pause/Resume
      if (newState) {
          if (videoProducer.paused) {
              await videoProducer.resume();
              await syncProducerResume(videoProducer.id);
          }
      } else {
          if (!videoProducer.paused) {
              await videoProducer.pause();
              await syncProducerPause(videoProducer.id);
          }
          videoProducer.close();
          producersRef.current.delete('video');
          if (videoTrackRef.current) {
              videoTrackRef.current.stop();
              videoTrackRef.current = null;
          }
          updateLocalStreamAfterTrackRemoved('video');
      }

      setIsVideoEnabled(newState);
      socketService.emit('user:media-state', { 
          roomId, 
          audio: isAudioEnabled, 
          video: newState 
      });
    } catch (error) {
       console.error('[SFU] Toggle video error:', error);
       setError('Failed to toggle video');
       setIsVideoEnabled(false);
    }
  }, [isVideoEnabled, roomId]);

  // ============================================
  // PRODUCER SYNC
  // ============================================
  const syncProducerPause = async (producerId) => {
    return new Promise((resolve) => {
      socketService.emit('sfu:pauseProducer', 
        { roomId, producerId }, 
        () => {
          console.log('[SFU] Server paused:', producerId);
          resolve();
        }
      );
    });
  };

  const syncProducerResume = async (producerId) => {
    return new Promise((resolve) => {
      socketService.emit('sfu:resumeProducer', 
        { roomId, producerId }, 
        () => {
          console.log('[SFU] Server resumed:', producerId);
          resolve();
        }
      );
    });
  };

  // ============================================
  // CONSUMER HANDLING
  // ============================================
  const consumeProducer = async (producerId, producerUserId, kind) => {
    if (consumedProducersRef.current.has(producerId)) {
      return;
    }
    consumedProducersRef.current.add(producerId);

    // Wait for transport
    const waitForTransport = async (attempts = 10) => {
      for (let i = 0; i < attempts; i++) {
        if (recvTransportRef.current && !recvTransportRef.current.closed) {
          return true;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return false;
    };

    if (!(await waitForTransport())) {
      console.error('[SFU] Recv transport not available');
      consumedProducersRef.current.delete(producerId);
      return;
    }

    try {
      console.log('[SFU] Consuming:', producerId, kind);

      const { rtpCapabilities } = deviceRef.current;
      
      const data = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
        
        socketService.emit('sfu:consume', {
          roomId,
          transportId: recvTransportRef.current.id,
          producerId,
          rtpCapabilities,
        }, (response) => {
          clearTimeout(timeout);
          if (response.error) reject(new Error(response.error));
          else resolve(response);
        });
      });

      const consumer = await recvTransportRef.current.consume({
        id: data.id,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      });

      consumersRef.current.set(consumer.id, consumer);

      // CRITICAL: Enable track immediately
      if (consumer.track) {
        consumer.track.enabled = true;
      }

      // Resume consumer
      await new Promise((resolve) => {
        socketService.emit('sfu:resumeConsumer', 
          { roomId, consumerId: consumer.id }, 
          () => resolve()
        );
      });

      // Request key frame for video
      if (kind === 'video') {
        setTimeout(() => {
          socketService.emit('sfu:requestKeyFrame', 
            { roomId, consumerId: consumer.id }
          );
        }, 500);
      }

      await new Promise(r => setTimeout(r, 200));

      // Update remote streams
      updateRemoteStream(producerUserId, consumer.track);

      consumer.on('transportclose', () => {
        removeRemoteTrack(producerUserId, consumer.track);
      });

      consumer.on('producerclose', () => {
        removeRemoteTrack(producerUserId, consumer.track);
      });

      console.log('[SFU] Consumer created:', consumer.id);
    } catch (err) {
      console.error('[SFU] Consume error:', err);
      consumedProducersRef.current.delete(producerId);
    }
  };

  const updateRemoteStream = (userId, track) => {
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      const MediaStreamClass = global.MediaStream;
      
      if (MediaStreamClass) {
        let stream = newMap.get(userId);
        
        if (!stream) {
          stream = new MediaStreamClass();
          newMap.set(userId, stream);
        }
        
        // Remove existing track of same kind
        const existingTrack = stream.getTracks().find(t => t.kind === track.kind);
        if (existingTrack) {
          stream.removeTrack(existingTrack);
        }
        
        stream.addTrack(track);
      }
      
      return newMap;
    });
  };

  const removeRemoteTrack = (userId, track) => {
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      const stream = newMap.get(userId);
      
      if (stream) {
        stream.removeTrack(track);
        
        if (stream.getTracks().length === 0) {
          newMap.delete(userId);
        }
      }
      
      return newMap;
    });
  };

  const requestExistingProducers = () => {
    socketService.emit('sfu:getProducers', { roomId }, (producers) => {
      if (Array.isArray(producers)) {
        console.log('[SFU] Existing producers:', producers.length);
        
        producers.forEach(p => {
          if (p.socketId !== socketService.socket.id) {
            consumeProducer(p.producerId, p.userId || p.socketId, p.kind);
          }
        });
      }
    });
  };

  // ============================================
  // CLEANUP
  // ============================================
  const cleanup = async () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;
    
    console.log('[SFU] === CLEANUP ===');

    try {
      // Close producers
      producersRef.current.forEach((p) => {
        if (!p.closed) p.close();
      });
      producersRef.current.clear();

      // Close consumers
      consumersRef.current.forEach((c) => {
        if (!c.closed) c.close();
      });
      consumersRef.current.clear();
      consumedProducersRef.current.clear();

      // Close transports
      if (sendTransportRef.current && !sendTransportRef.current.closed) {
        sendTransportRef.current.close();
      }
      sendTransportRef.current = null;

      if (recvTransportRef.current && !recvTransportRef.current.closed) {
        recvTransportRef.current.close();
      }
      recvTransportRef.current = null;

      // Stop tracks
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current = null;
      }
      
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }

      setLocalStream(null);
      setRemoteStreams(new Map());
      setJoined(false);
      deviceRef.current = null;

      socketService.off('sfu:newProducer');
    } finally {
      isCleaningUpRef.current = false;
    }
  };

  const switchCamera = useCallback(() => {
    if (videoTrackRef.current && videoTrackRef.current._switchCamera) {
      videoTrackRef.current._switchCamera();
      setCameraType(prev => prev === 'front' ? 'back' : 'front');
    }
  }, []);

  return {
    joined,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    switchCamera,
    isInitializing,
    error,
    cameraType,
    startScreenShare: () => {},
    stopScreenShare: () => {},
    isScreenSharing: false,
    localScreenStream: null
  };
};
