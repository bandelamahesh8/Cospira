import React from 'react';
import VideoTile from '@/components/VideoTile';
import { User } from '@/types/websocket';

interface VideoGridProps {
    localStream: MediaStream | null;
    localUserName: string;
    isAudioEnabled: boolean;
    isMediaLoading: boolean;
    remoteStreams: Map<string, MediaStream>;
    users: User[];
}

const VideoGrid: React.FC<VideoGridProps> = ({
    localStream,
    localUserName,
    isAudioEnabled,
    isMediaLoading,
    remoteStreams,
    users,
}) => {
    const totalParticipants = 1 + remoteStreams.size;

    return (
        <div className='flex-1 relative p-4 overflow-y-auto custom-scrollbar flex items-center justify-center'>
            <div
                className={`grid gap-4 w-full transition-all duration-500 ease-in-out ${totalParticipants === 1
                        ? 'grid-cols-1 max-w-4xl mx-auto'
                        : totalParticipants <= 2
                            ? 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto'
                            : totalParticipants <= 4
                                ? 'grid-cols-2 max-w-6xl mx-auto'
                                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}
            >
                {/* Local User */}
                <div className='relative aspect-video bg-zinc-900 rounded-xl border-zinc-800 shadow-lg overflow-hidden'>
                    {localStream ? (
                        <VideoTile
                            stream={localStream}
                            username={`${localUserName} (You)`}
                            isLocal={true}
                            isMuted={!isAudioEnabled}
                            className='w-full h-full'
                        />
                    ) : (
                        <div className='w-full h-full flex items-center justify-center bg-muted/20'>
                            <div className='text-center'>
                                <p className='text-muted-foreground text-sm'>No video stream</p>
                            </div>
                        </div>
                    )}
                    {isMediaLoading && (
                        <div className='absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10'>
                            <div className='flex flex-col items-center gap-2'>
                                <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
                                <span className='text-sm font-medium text-white'>Starting Camera...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Remote Users */}
                {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                    const user = users.find((u) => u.id === userId);
                    return (
                        <VideoTile
                            key={userId}
                            stream={stream}
                            username={user?.name || 'Unknown'}
                            isLocal={false}
                            className='aspect-video bg-zinc-900 rounded-xl border-zinc-800 shadow-lg'
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default VideoGrid;
