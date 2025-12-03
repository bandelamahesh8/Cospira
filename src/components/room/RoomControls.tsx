import React, { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    MonitorOff,
    Share,
    Trash2,
    PhoneOff,
    Minimize,
    Maximize,
    Maximize2,
    LayoutGrid,
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SettingsModal = lazy(() => import('@/components/SettingsModal'));

interface RoomControlsProps {
    roomId: string;
    roomName: string | null;
    participantCount: number;
    isAudioEnabled: boolean;
    toggleAudio: () => void;
    isVideoEnabled: boolean;
    toggleVideo: () => void;
    isScreenSharing: boolean;
    handleToggleScreenShare: () => void;
    canShareScreen: boolean;
    youtubeVideoId: string | null;
    setShowOTTModal: (show: boolean) => void;
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    isHost: boolean;
    setShowDisbandConfirm: (show: boolean) => void;
    handleLeaveRoom: () => void;
    isCinemaMode: boolean;
    setIsCinemaMode: (mode: boolean) => void;
    showChat: boolean;
    setShowChat: (show: boolean) => void;
    showStopShareConfirm: boolean;
    setShowStopShareConfirm: (show: boolean) => void;
    confirmStopShare: () => void;
    showDisbandConfirm: boolean;
    disbandRoom: () => void;
    startBrowserSession: () => void;
    stopBrowserSession: () => void;
}

const RoomControls: React.FC<RoomControlsProps> = ({
    roomId,
    roomName,
    participantCount,
    isAudioEnabled,
    toggleAudio,
    isVideoEnabled,
    toggleVideo,
    isScreenSharing,
    handleToggleScreenShare,
    canShareScreen,
    youtubeVideoId,
    setShowOTTModal,
    isRecording,
    startRecording,
    stopRecording,
    isHost,
    setShowDisbandConfirm,
    handleLeaveRoom,
    isCinemaMode,
    setIsCinemaMode,
    showChat,
    setShowChat,
    showStopShareConfirm,
    setShowStopShareConfirm,
    confirmStopShare,
    showDisbandConfirm,
    disbandRoom,
    startBrowserSession,
    stopBrowserSession,
}) => {
    return (
        <div className='h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t flex items-center justify-between px-4 z-50'>
            <div className='flex items-center gap-4 hidden sm:flex'>
                <div className='text-sm font-medium'>
                    {roomName || roomId}
                    <span className='ml-2 text-xs text-muted-foreground hidden md:inline-block'>
                        {participantCount} participant{participantCount !== 1 && 's'}
                    </span>
                </div>
            </div>

            <TooltipProvider>
                <div className='flex items-center gap-2 absolute left-1/2 -translate-x-1/2'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={isAudioEnabled ? 'outline' : 'destructive'}
                                className='group rounded-full h-10 w-10 hover:w-32 transition-all duration-300 ease-in-out px-0 hover:px-4 overflow-hidden'
                                onClick={toggleAudio}
                                aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                            >
                                <div className='flex items-center justify-center gap-2'>
                                    {isAudioEnabled ? (
                                        <Mic className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
                                    ) : (
                                        <MicOff className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
                                    )}
                                    <span className='w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'>
                                        {isAudioEnabled ? 'Mute' : 'Unmute'}
                                    </span>
                                </div>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={isVideoEnabled ? 'outline' : 'destructive'}
                                className='group rounded-full h-10 w-10 hover:w-32 transition-all duration-300 ease-in-out px-0 hover:px-4 overflow-hidden'
                                onClick={toggleVideo}
                                aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                            >
                                <div className='flex items-center justify-center gap-2'>
                                    {isVideoEnabled ? (
                                        <Video className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
                                    ) : (
                                        <VideoOff className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
                                    )}
                                    <span className='w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'>
                                        {isVideoEnabled ? 'Stop Video' : 'Start Video'}
                                    </span>
                                </div>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Unified Share Button - Only for Host/Co-Host */}
                    {canShareScreen && (
                        <>
                            {isScreenSharing ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant='destructive'
                                            className='group rounded-full h-10 w-10 hover:w-36 transition-all duration-300 ease-in-out px-0 hover:px-4 overflow-hidden animate-pulse'
                                            onClick={handleToggleScreenShare}
                                        >
                                            <div className='flex items-center justify-center gap-2'>
                                                <MonitorOff className='h-4 w-4 flex-shrink-0' />
                                                <span className='w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'>
                                                    Stop Sharing
                                                </span>
                                            </div>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Stop Screen Sharing</p>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={youtubeVideoId ? 'default' : 'outline'}
                                            className={`group rounded-full h-10 w-10 hover:w-36 transition-all duration-300 ease-in-out px-0 hover:px-4 overflow-hidden ${youtubeVideoId ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                                            onClick={() => setShowOTTModal(true)}
                                        >
                                            <div className='flex items-center justify-center gap-2'>
                                                <Share className='h-4 w-4 flex-shrink-0' />
                                                <span className='w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'>
                                                    Share Content
                                                </span>
                                            </div>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Share Screen, YouTube, or File</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}

                            {/* Cloud Browser Button */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant='outline'
                                        className='group rounded-full h-10 w-10 hover:w-36 transition-all duration-300 ease-in-out px-0 hover:px-4 overflow-hidden'
                                        onClick={startBrowserSession}
                                    >
                                        <div className='flex items-center justify-center gap-2'>
                                            <LayoutGrid className='h-4 w-4 flex-shrink-0' />
                                            <span className='w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'>
                                                Cloud Browser
                                            </span>
                                        </div>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Start Cloud Browser</p>
                                </TooltipContent>
                            </Tooltip>
                        </>
                    )}

                    {/* Recording Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={isRecording ? 'destructive' : 'outline'}
                                className={`group rounded-full h-10 w-10 hover:w-36 transition-all duration-300 ease-in-out px-0 hover:px-4 overflow-hidden ${isRecording ? 'animate-pulse' : ''}`}
                                onClick={isRecording ? stopRecording : startRecording}
                            >
                                <div className='flex items-center justify-center gap-2'>
                                    <div
                                        className={`h-3 w-3 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`}
                                    />
                                    <span className='w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'>
                                        {isRecording ? 'Stop Rec' : 'Record'}
                                    </span>
                                </div>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isRecording ? 'Stop Recording' : 'Start Recording'}</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            {isHost ? (
                                <Button
                                    variant='destructive'
                                    className='group rounded-full h-10 w-10 hover:w-28 transition-all duration-300 ease-in-out px-0 hover:px-4 overflow-hidden ml-2'
                                    onClick={() => setShowDisbandConfirm(true)}
                                >
                                    <div className='flex items-center justify-center gap-2'>
                                        <Trash2 className='h-4 w-4 flex-shrink-0' />
                                        <span className='w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'>
                                            Disband
                                        </span>
                                    </div>
                                </Button>
                            ) : (
                                <Button
                                    variant='destructive'
                                    className='group rounded-full h-10 w-10 hover:w-24 transition-all duration-300 ease-in-out px-0 hover:px-4 overflow-hidden ml-2'
                                    onClick={handleLeaveRoom}
                                >
                                    <div className='flex items-center justify-center gap-2'>
                                        <PhoneOff className='h-4 w-4 flex-shrink-0' />
                                        <span className='w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'>
                                            Leave
                                        </span>
                                    </div>
                                </Button>
                            )}
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isHost ? 'Disband Room' : 'Leave Room'}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>

            <div className='flex items-center gap-2'>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => setIsCinemaMode(!isCinemaMode)}
                                aria-label={isCinemaMode ? 'Exit cinema mode' : 'Enter cinema mode'}
                            >
                                {isCinemaMode ? (
                                    <Minimize className='h-5 w-5' aria-hidden='true' />
                                ) : (
                                    <Maximize className='h-5 w-5' aria-hidden='true' />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isCinemaMode ? 'Exit Cinema Mode' : 'Enter Cinema Mode'}</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => setShowChat(!showChat)}
                                aria-label={showChat ? 'Hide chat' : 'Show chat'}
                                aria-expanded={showChat}
                            >
                                {showChat ? (
                                    <Maximize2 className='h-5 w-5' aria-hidden='true' />
                                ) : (
                                    <LayoutGrid className='h-5 w-5' aria-hidden='true' />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{showChat ? 'Hide Chat' : 'Show Chat'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Suspense fallback={null}>
                    <SettingsModal roomId={roomId || ''} isHost={isHost} />
                </Suspense>
            </div>

            <AlertDialog open={showStopShareConfirm} onOpenChange={setShowStopShareConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Stop Screen Sharing?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to stop sharing your screen?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmStopShare}>Stop Sharing</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDisbandConfirm} onOpenChange={setShowDisbandConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disband Room</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to disband this room? All participants will be removed. This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={disbandRoom}
                            className='bg-red-600 hover:bg-red-700 text-white'
                        >
                            Disband Room
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default RoomControls;
