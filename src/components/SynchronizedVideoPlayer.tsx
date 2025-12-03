import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from './ui/button';
import { Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';

interface SynchronizedVideoPlayerProps {
  url: string;
  isHost: boolean;
  socket: Socket | null;
  roomId: string | null;
  fileName: string;
  onClose: () => void;
}

const SynchronizedVideoPlayer = ({
  url,
  isHost,
  socket,
  roomId,
  fileName,
  onClose,
}: SynchronizedVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const onPlay = ({ time }: { time: number }) => {
      if (videoRef.current) {
        const diff = Math.abs(videoRef.current.currentTime - time);
        if (diff > 0.5) {
          videoRef.current.currentTime = time;
        }
        videoRef.current.play().catch((e) => console.error('Auto-play failed:', e));
        setIsPlaying(true);
      }
    };

    const onPause = ({ time }: { time: number }) => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = time;
        setIsPlaying(false);
      }
    };

    const onSeek = ({ time }: { time: number }) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    };

    socket.on('video-played', onPlay);
    socket.on('video-paused', onPause);
    socket.on('video-seeked', onSeek);

    return () => {
      socket.off('video-played', onPlay);
      socket.off('video-paused', onPause);
      socket.off('video-seeked', onSeek);
    };
  }, [socket]);

  // Collaborative controls
  const handlePlay = () => {
    if (socket && roomId && videoRef.current) {
      socket.emit('play-video', { roomId, time: videoRef.current.currentTime });
    }
  };

  const handlePause = () => {
    if (socket && roomId && videoRef.current) {
      socket.emit('pause-video', { roomId, time: videoRef.current.currentTime });
    }
  };

  const handleSeek = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    // Only emit seek if it was a user interaction (hard to distinguish, but we can try)
    // For now, we'll rely on the 'seeked' event which fires after the seek operation completes
  };

  const onSeeked = () => {
    if (socket && roomId && videoRef.current) {
      socket.emit('seek-video', { roomId, time: videoRef.current.currentTime });
    }
  };

  return (
    <div className='relative w-full h-full bg-black flex flex-col justify-center items-center rounded-lg overflow-hidden group'>
      <video
        ref={videoRef}
        src={url}
        className='w-full h-full object-contain'
        controls={true} // Everyone gets controls
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={onSeeked}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {/* Close button - Host only */}
      {isHost && (
        <Button
          variant='destructive'
          size='sm'
          className='absolute top-4 right-4 z-10'
          onClick={onClose}
        >
          Stop Presentation
        </Button>
      )}
    </div>
  );
};

export default SynchronizedVideoPlayer;
