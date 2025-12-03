import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { SFUManager } from '@/lib/SFUManager';

interface UseMediaStreamProps {
    sfuManagerRef: React.MutableRefObject<SFUManager | null>;
    setLocalStream: (stream: MediaStream | null) => void;
    setLocalScreenStream: (stream: MediaStream | null) => void;
    setIsAudioEnabled: (enabled: boolean) => void;
    setIsVideoEnabled: (enabled: boolean) => void;
    setIsScreenSharing: (sharing: boolean) => void;
    setIsMediaLoading: (loading: boolean) => void;
}

export const useMediaStream = ({
    sfuManagerRef,
    setLocalStream,
    setLocalScreenStream,
    setIsAudioEnabled,
    setIsVideoEnabled,
    setIsScreenSharing,
    setIsMediaLoading,
}: UseMediaStreamProps) => {
    const localStreamRef = useRef<MediaStream | null>(null);
    const localScreenStreamRef = useRef<MediaStream | null>(null);
    const isAudioEnabledRef = useRef(false);
    const isVideoEnabledRef = useRef(false);

    const getLocalStream = useCallback(() => {
        if (!localStreamRef.current) {
            const stream = new MediaStream();
            localStreamRef.current = stream;
            setLocalStream(stream);
        }
        return localStreamRef.current;
    }, [setLocalStream]);

    const startAudio = useCallback(async () => {
        let stream: MediaStream | null = null;
        try {
            const audioDeviceId = localStorage.getItem('preferredAudioDeviceId');
            const constraints = {
                audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            const audioTrack = stream.getAudioTracks()[0];

            const localStream = getLocalStream();
            localStream.addTrack(audioTrack);

            setIsAudioEnabled(true);
            isAudioEnabledRef.current = true;

            if (sfuManagerRef.current) {
                if (!sfuManagerRef.current.isTransportReady()) {
                    console.log('startAudio: Transport not ready, waiting...');
                    const ready = await sfuManagerRef.current.waitForTransportReady(10000);
                    if (!ready) {
                        console.error('startAudio: Transport wait timed out');
                        throw new Error('Connection to media server failed (Debug: Audio Transport Timeout). Please refresh.');
                    }
                }
                console.log('startAudio: Producing...');
                await sfuManagerRef.current.produce(audioTrack, 'mic');
                console.log('startAudio: Produced');
            }
        } catch (err) {
            console.error('Failed to start audio:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
            toast({ title: 'Error', description: errorMessage, variant: 'destructive' });

            // Cleanup
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
            if (localStreamRef.current) {
                const audioTracks = localStreamRef.current.getAudioTracks();
                audioTracks.forEach(t => {
                    t.stop();
                    localStreamRef.current?.removeTrack(t);
                });
            }
            setIsAudioEnabled(false);
            isAudioEnabledRef.current = false;
        }
    }, [getLocalStream, setIsAudioEnabled, sfuManagerRef]);

    const stopAudio = useCallback(() => {
        const stream = localStreamRef.current;
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.stop();
                stream.removeTrack(audioTrack);
                setIsAudioEnabled(false);
                isAudioEnabledRef.current = false;
                sfuManagerRef.current?.closeProducer('mic');
            }
        }
    }, [setIsAudioEnabled, sfuManagerRef]);

    const startVideo = useCallback(async () => {
        let stream: MediaStream | null = null;
        try {
            setIsMediaLoading(true);
            const videoDeviceId = localStorage.getItem('preferredVideoDeviceId');
            const constraints = {
                video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            const videoTrack = stream.getVideoTracks()[0];

            const localStream = getLocalStream();
            localStream.addTrack(videoTrack);

            setIsVideoEnabled(true);
            isVideoEnabledRef.current = true;

            if (sfuManagerRef.current) {
                if (!sfuManagerRef.current.isTransportReady()) {
                    console.log('startVideo: Transport not ready, waiting...');
                    const ready = await sfuManagerRef.current.waitForTransportReady(15000);
                    if (!ready) {
                        console.error('startVideo: Transport wait timed out');
                        throw new Error('Connection to media server failed (Debug: Video Transport Timeout). Please refresh.');
                    }
                }
                console.log('startVideo: Producing...');
                await sfuManagerRef.current.produce(videoTrack, 'webcam');
                console.log('startVideo: Produced');
            }
        } catch (err) {
            console.error('Failed to start video:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
            toast({ title: 'Error', description: errorMessage, variant: 'destructive' });

            // Cleanup
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
            if (localStreamRef.current) {
                const videoTracks = localStreamRef.current.getVideoTracks();
                videoTracks.forEach(t => {
                    t.stop();
                    localStreamRef.current?.removeTrack(t);
                });
            }
            setIsVideoEnabled(false);
            isVideoEnabledRef.current = false;
        } finally {
            setIsMediaLoading(false);
        }
    }, [getLocalStream, setIsMediaLoading, setIsVideoEnabled, sfuManagerRef]);

    const stopVideo = useCallback(() => {
        const stream = localStreamRef.current;
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.stop();
                stream.removeTrack(videoTrack);
                setIsVideoEnabled(false);
                isVideoEnabledRef.current = false;
                sfuManagerRef.current?.closeProducer('webcam');
            }
        }
    }, [setIsVideoEnabled, sfuManagerRef]);

    const enableMedia = useCallback(async () => {
        // Initialize empty stream on join
        getLocalStream();
        setIsMediaLoading(false);

        // Ensure state matches refs (default OFF)
        setIsAudioEnabled(false);
        setIsVideoEnabled(false);
        isAudioEnabledRef.current = false;
        isVideoEnabledRef.current = false;
    }, [getLocalStream, setIsAudioEnabled, setIsVideoEnabled, setIsMediaLoading]);

    const toggleAudio = useCallback(() => {
        if (isAudioEnabledRef.current) {
            stopAudio();
        } else {
            startAudio();
        }
    }, [startAudio, stopAudio]);

    const toggleVideo = useCallback(() => {
        if (isVideoEnabledRef.current) {
            stopVideo();
        } else {
            startVideo();
        }
    }, [startVideo, stopVideo]);

    const stopScreenShare = useCallback(() => {
        if (localScreenStreamRef.current) {
            localScreenStreamRef.current.getTracks().forEach((track) => track.stop());
            setLocalScreenStream(null);
            localScreenStreamRef.current = null;
            setIsScreenSharing(false);
            // SFU cleanup for screen share producers should be handled by SFUManager or by closing the producer
            // Ideally SFUManager should have a method to stop producing specific sources
        }
    }, [setLocalScreenStream, setIsScreenSharing]);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            setLocalScreenStream(stream);
            localScreenStreamRef.current = stream;
            setIsScreenSharing(true);

            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

            if (sfuManagerRef.current) {
                for (const track of stream.getTracks()) {
                    const source = track.kind === 'video' ? 'screen' : 'screen-audio';
                    await sfuManagerRef.current.produce(track, source);
                }
            }
        } catch (err) {
            console.error('Screen share error:', err);
            toast({
                title: 'Screen Share Error',
                description: 'Failed to start screen share.',
                variant: 'destructive',
            });
        }
    }, [sfuManagerRef, setLocalScreenStream, setIsScreenSharing, stopScreenShare]);

    return {
        enableMedia,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
    };
};
