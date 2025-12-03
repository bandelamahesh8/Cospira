import React, { useEffect, useRef } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SynchronizedYouTubePlayerProps {
  videoId: string;
  isHost: boolean;
  initialTime?: number;
}

const SynchronizedYouTubePlayer: React.FC<SynchronizedYouTubePlayerProps> = ({
  videoId,
  isHost,
  initialTime = 0,
}) => {
  const { signaling, stopYoutubeVideo, playYoutubeVideo, pauseYoutubeVideo } = useWebSocket();
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isRemoteUpdate = useRef(false);
  const hasInitialSeek = useRef(false);

  // Socket event listeners
  useEffect(() => {
    if (!signaling) return;

    const onPlay = ({ time }: { time: number }) => {
      if (playerRef.current) {
        isRemoteUpdate.current = true;
        playerRef.current.seekTo(time, true);
        playerRef.current.playVideo();
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 500);
      }
    };

    const onPause = ({ time }: { time: number }) => {
      if (playerRef.current) {
        isRemoteUpdate.current = true;
        playerRef.current.seekTo(time, true);
        playerRef.current.pauseVideo();
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 500);
      }
    };

    const onSeek = ({ time }: { time: number }) => {
      if (playerRef.current) {
        isRemoteUpdate.current = true;
        playerRef.current.seekTo(time, true);
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 500);
      }
    };

    // Use type assertion if needed, or update SignalingEvents interface
    signaling.on('youtube-played', onPlay);
    signaling.on('youtube-paused', onPause);
    signaling.on('youtube-seeked', onSeek);

    return () => {
      signaling.off('youtube-played', onPlay);
      signaling.off('youtube-paused', onPause);
      signaling.off('youtube-seeked', onSeek);
    };
  }, [signaling]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    if (initialTime > 0 && !hasInitialSeek.current) {
      hasInitialSeek.current = true;
      playerRef.current.seekTo(initialTime, true);
    }
  };

  const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
    // Allow anyone to control playback, but ignore remote updates to prevent loops
    if (isRemoteUpdate.current) return;

    const player = event.target;
    const currentTime = player.getCurrentTime();
    const playerState = event.data;

    if (playerState === 1) {
      // Playing
      playYoutubeVideo(currentTime);
    } else if (playerState === 2) {
      // Paused
      pauseYoutubeVideo(currentTime);
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1, // Show controls for everyone
      modestbranding: 1,
      rel: 0,
    },
  };

  return (
    <div className='relative w-full h-full flex flex-col bg-black'>
      {isHost && (
        <div className='absolute top-4 right-4 z-50'>
          <Button
            variant='destructive'
            size='sm'
            onClick={stopYoutubeVideo}
            className='flex items-center gap-2'
          >
            <X className='h-4 w-4' />
            Close YouTube
          </Button>
        </div>
      )}

      <div className='flex-1 w-full h-full'>
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={handleStateChange}
          className='w-full h-full'
          iframeClassName='w-full h-full'
        />
      </div>
    </div>
  );
};

export default SynchronizedYouTubePlayer;
