import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from './ui/button';

interface SynchronizedVideoPlayerProps {
  url: string;
  isHost: boolean;
  socket: Socket | null;
  roomId: string | null;
  _fileName: string;
  onClose: () => void;
}

const SynchronizedVideoPlayer = ({
  url,
  isHost,
  socket,
  roomId,
  _fileName,
  onClose,
}: SynchronizedVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const onPlay = ({ time }: { time: number }) => {
      if (videoRef.current) {
        const diff = Math.abs(videoRef.current.currentTime - time);
        if (diff > 0.5) {
          videoRef.current.currentTime = time;
        }
        // eslint-disable-next-line no-console
        videoRef.current.play().catch(() => {});
      }
    };

    const onPause = ({ time }: { time: number }) => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = time;
      }
    };

    const onSeek = ({ time }: { time: number }) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
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
        onTimeUpdate={() => {}} // Placeholder or remove if not needed
        onLoadedMetadata={() => {}} // Placeholder or remove if not needed
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
