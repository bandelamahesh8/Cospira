import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  className?: string;
}

const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = React.useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      // Force play to ensure video updates
      videoRef.current.play().catch(console.error);
    } else if (videoRef.current && !stream) {
      videoRef.current.srcObject = null;
    }
  }, [stream, hasVideo]);

  useEffect(() => {
    const checkVideo = () => {
      const videoTrack = stream?.getVideoTracks()[0];
      // Relaxed check: just check if track exists and is enabled
      const isEnabled = !!videoTrack && videoTrack.enabled;

      // Debug logging
      if (videoTrack) {
        console.log(`VideoTile check for ${username}: enabled=${videoTrack.enabled}, readyState=${videoTrack.readyState}, muted=${videoTrack.muted}`);
      } else {
        console.log(`VideoTile check for ${username}: No video track found`);
      }

      setHasVideo(isEnabled);
    };

    checkVideo();

    const videoTrack = stream?.getVideoTracks()[0];
    if (videoTrack) {
      // Listen to track state changes
      const handleEnabledChange = () => {
        console.log(`VideoTile track change for ${username}: enabled=${videoTrack.enabled}`);
        setHasVideo(videoTrack.enabled);
      };

      videoTrack.addEventListener('mute', () => {
        console.log(`VideoTile track muted for ${username}`);
        // Don't hide video on mute, just log it. Some browsers mute video when tab is backgrounded.
        // setHasVideo(false); 
      });
      videoTrack.addEventListener('unmute', () => {
        console.log(`VideoTile track unmuted for ${username}`);
        setHasVideo(true);
      });
      videoTrack.addEventListener('ended', () => {
        console.log(`VideoTile track ended for ${username}`);
        setHasVideo(false);
      });

      // Also listen to enabled property changes via polling
      const interval = setInterval(checkVideo, 1000); // Poll every second

      return () => {
        videoTrack.removeEventListener('mute', () => { });
        videoTrack.removeEventListener('unmute', () => { });
        videoTrack.removeEventListener('ended', () => { });
        clearInterval(interval);
      };
    }
  }, [stream, username]);

  return (
    <Card
      className={`relative overflow-hidden bg-black/90 border-0 ${className}`}
      role='region'
      aria-label={`Video feed for ${username}${isLocal ? ' (You)' : ''}. ${isMuted ? 'Microphone muted' : 'Microphone active'}`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video to prevent echo
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
          aria-label={`Video of ${username}`}
        />
      ) : (
        <div
          className='w-full h-full flex items-center justify-center bg-muted/20'
          aria-label='No video available'
        >
          <Avatar className='h-20 w-20'>
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
              alt={`${username}'s avatar`}
            />
            <AvatarFallback>
              <User className='w-10 h-10' aria-hidden='true' />
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className='absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none'>
        <div className='bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-white text-xs font-medium truncate max-w-[80%]'>
          {username} {isLocal && '(You)'}
        </div>
        <div
          className={`p-1.5 rounded-full ${isMuted ? 'bg-destructive text-white' : 'bg-black/50 text-white'}`}
          aria-label={isMuted ? 'Microphone muted' : 'Microphone active'}
          role='status'
        >
          {isMuted ? (
            <MicOff className='w-3 h-3' aria-hidden='true' />
          ) : (
            <Mic className='w-3 h-3' aria-hidden='true' />
          )}
        </div>
      </div>
    </Card>
  );
};

export default VideoTile;
