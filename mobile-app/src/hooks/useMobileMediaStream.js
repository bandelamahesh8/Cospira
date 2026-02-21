import { useState, useRef, useCallback, useEffect } from 'react';
import { mediaDevices } from 'react-native-webrtc';
import { mobileSFUManager } from '../services/MobileSFUManager';

const AUDIO_CONSTRAINTS = {
  audio: true,
  video: false
};

const VIDEO_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { min: 15, ideal: 24, max: 30 },
  }
};

export const useMobileMediaStream = () => {
    const [localStream, setLocalStream] = useState(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [error, setError] = useState(null);
    
    // Track references to avoid re-renders
    const audioTrackRef = useRef(null);
    const videoTrackRef = useRef(null);
    
    // --- Helper to update the stream object for UI ---
    // React Native RTCView needs a full MediaStream object
    const updateStream = useCallback(() => {
        const tracks = [];
        if (audioTrackRef.current) tracks.push(audioTrackRef.current);
        if (videoTrackRef.current) tracks.push(videoTrackRef.current);
        
        if (tracks.length > 0) {
            // Create new stream with current tracks
            const newStream = new MediaStream(tracks);
            setLocalStream(newStream);
        } else {
            setLocalStream(null);
        }
    }, []);

    // --- Enable Audio ---
    const enableAudio = useCallback(async () => {
        if (audioTrackRef.current) {
            // Ensure it's enabled if it exists
            audioTrackRef.current.enabled = true;
            setIsAudioEnabled(true);
            updateStream();
             // Maybe resume producer?
             if (mobileSFUManager.sendTransport) {
                // If we paused the producer instead of closing
                await mobileSFUManager.resumeProducer('mic');
             }
            return; 
        }
        
        try {
            console.log('[useMobileMedia] Requesting Audio...');
            // Check permissions again just in case (optional, but good for robustness)
            // For now, assume getUserMedia handles the prompt
            
            const stream = await mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
            const track = stream.getAudioTracks()[0];
            
            if (track) {
                track.enabled = true;
                audioTrackRef.current = track;
                setIsAudioEnabled(true);
                updateStream();
                
                // If connected, produce to SFU
                if (mobileSFUManager.sendTransport) {
                    await mobileSFUManager.produce(track, 'mic');
                }
            } else {
                throw new Error('No audio track found');
            }
        } catch (err) {
            console.error('[useMobileMedia] Failed to enable audio:', err);
            setError('Failed to access microphone. Check permissions.');
        }
    }, [updateStream]);

    // --- Disable Audio ---
    const disableAudio = useCallback(() => {
        if (audioTrackRef.current) {
            console.log('[useMobileMedia] Stopping Audio Track');
            
            // Should we stop or pause?
            // To release hardware, stop() is better. 
            // BUT for quick toggle, enabling/disabling is faster.
            // Requirement was "release hardware".
            // Let's stick to stop() for now as per previous successful web fix.
            
            audioTrackRef.current.stop();
            audioTrackRef.current = null;
            setIsAudioEnabled(false);
            updateStream();
            
            // Close producer on SFU
            mobileSFUManager.closeProducer('mic');
        }
    }, [updateStream]);

    // --- Enable Video ---
    const enableVideo = useCallback(async (facingMode = 'user') => {
        if (videoTrackRef.current) return;
        
        try {
            console.log('[useMobileMedia] Requesting Video...');
            // Merge defaults with requested facing mode
            const constraints = {
                ...VIDEO_CONSTRAINTS,
                video: { ...VIDEO_CONSTRAINTS.video, facingMode }
            };
            
            const stream = await mediaDevices.getUserMedia(constraints);
            const track = stream.getVideoTracks()[0];
            
            if (track) {
                videoTrackRef.current = track;
                setIsVideoEnabled(true);
                updateStream();
                
                // If connected, produce to SFU
                if (mobileSFUManager.sendTransport) {
                    await mobileSFUManager.produce(track, 'webcam');
                }
            }
        } catch (err) {
            console.error('[useMobileMedia] Failed to enable video:', err);
            setError('Failed to access camera');
        }
    }, [updateStream]);

    // --- Disable Video ---
    const disableVideo = useCallback(() => {
        if (videoTrackRef.current) {
            console.log('[useMobileMedia] Stopping Video Track');
            videoTrackRef.current.stop();
            videoTrackRef.current = null;
            setIsVideoEnabled(false);
            updateStream();
            
            // Close producer on SFU
            mobileSFUManager.closeProducer('webcam');
        }
    }, [updateStream]);

    // --- Toggle Functions ---
    const toggleAudio = useCallback(() => {
        if (isAudioEnabled) disableAudio();
        else enableAudio();
    }, [isAudioEnabled, disableAudio, enableAudio]);

    const toggleVideo = useCallback(() => {
        if (isVideoEnabled) disableVideo();
        else enableVideo();
    }, [isVideoEnabled, disableVideo, enableVideo]);
    
    // --- Switch Camera ---
    const flipCamera = useCallback(async () => {
        if (!videoTrackRef.current) return;
        
        // This is tricky in RN-WebRTC. Usually requires stopping and re-requesting with different facing mode
        // Or using track._switchCamera() if available (implementation dependent)
        
        // Safest: Stop, swap constraints, Start
        const currentFacing = videoTrackRef.current.getConstraints()?.facingMode; // logic might vary
        // ... simplified for now: just toggle logic in UI, but here we assume 'user' vs 'environment'
        
        // For MVP: Just rely on enableVideo taking an arg if we wanted to support it fully
        // But for "Flip" button:
        const newMode = (videoTrackRef.current._constraints?.facingMode === 'environment') ? 'user' : 'environment';
        
        disableVideo();
        setTimeout(() => enableVideo(newMode), 200); // slight delay
        
    }, [disableVideo, enableVideo]);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (audioTrackRef.current) audioTrackRef.current.stop();
            if (videoTrackRef.current) videoTrackRef.current.stop();
        };
    }, []);

    return {
        localStream,
        isAudioEnabled,
        isVideoEnabled,
        toggleAudio,
        toggleVideo,
        flipCamera,
        enableAudio,
        enableVideo,
        disableAudio,
        disableVideo,
        error
    };
};
