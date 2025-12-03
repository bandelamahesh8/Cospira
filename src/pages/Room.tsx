// Force HMR update
import { lazy, Suspense } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { useRecording } from '@/hooks/useRecording';
import { useRoom } from '@/hooks/useRoom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VideoTile from '@/components/VideoTile';
import RoomControls from '@/components/room/RoomControls';
import VideoGrid from '@/components/room/VideoGrid';
import ChatPanel from '@/components/room/ChatPanel';

import NetworkQualityIndicator from '@/components/NetworkQualityIndicator';
const SynchronizedVideoPlayer = lazy(() => import('@/components/SynchronizedVideoPlayer'));
const SynchronizedYouTubePlayer = lazy(() => import('@/components/SynchronizedYouTubePlayer'));
const OTTGridModal = lazy(() => import('@/components/OTTGridModal'));

const Room = () => {
  const {
    roomId,
    inviteToken,
    newMessage,
    setNewMessage,
    isUploading,
    hasJoined,
    showChat,
    setShowChat,
    activeTab,
    setActiveTab,
    isParticipantsMinimized,
    setIsParticipantsMinimized,
    showOTTModal,
    setShowOTTModal,
    isCinemaMode,
    setIsCinemaMode,
    showStopShareConfirm,
    setShowStopShareConfirm,
    showDisbandConfirm,
    setShowDisbandConfirm,
    activityNotification,
    messagesEndRef,
    fileInputRef,
    handleSendMessage,
    handleFileUpload,
    triggerFileUpload,
    copyRoomLink,
    handleLeaveRoom,
    handleToggleScreenShare,
    confirmStopShare,
  } = useRoom();

  const {
    socket,
    messages,
    users,
    files,
    isHost,
    isConnected,
    roomName,
    disbandRoom,
    promoteToCoHost,
    demoteFromCoHost,
    kickUser,
    muteUser,
    presentFile,
    // Media props
    localStream,
    localScreenStream,
    remoteStreams,
    remoteScreenStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    isPresentingFile,
    presentedFile,
    closePresentedFile,
    youtubeVideoId,
    youtubeCurrentTime,
    startYoutubeVideo,
    isMediaLoading,
    waitingUsers,
    isWaiting,
    admitUser,
    denyUser,
    admitAllWaitingUsers,
    uploadFile,
    startBrowserSession,
    stopBrowserSession,
    sendBrowserInput,
  } = useWebSocket();

  const { user: authUser } = useAuth();
  const { isRecording, startRecording, stopRecording } = useRecording();

  if (!isConnected) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold mb-2'>Connecting...</h2>
          <p className='text-muted-foreground'>Establishing connection to server</p>
        </div>
      </div>
    );
  }

  if (isWaiting) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <Card className='w-full max-w-md mx-4'>
          <CardHeader>
            <CardTitle className='text-center'>Waiting for Host</CardTitle>
            <CardDescription className='text-center'>
              You are in the lobby. The host has been notified and will admit you shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col items-center gap-4'>
            <div className='relative h-16 w-16'>
              <div className='absolute inset-0 rounded-full border-4 border-muted'></div>
              <div className='absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin'></div>
            </div>
            <Button
              variant='outline'
              onClick={() => {
                handleLeaveRoom();
              }}
            >
              Cancel & Leave
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine layout mode
  const hasScreenShare = localScreenStream || remoteScreenStreams.size > 0;
  const hasCloudBrowser = Array.from(remoteStreams.keys()).includes('browser-bot');
  const isPresentationMode = hasScreenShare || isPresentingFile || !!youtubeVideoId || hasCloudBrowser;

  // Filter participants for the strip (Presentation Mode) - Only show if they have video on
  const visibleRemoteStreams = Array.from(remoteStreams.entries()).filter(([userId, stream]) => {
    if (userId === 'browser-bot') return false; // Don't show browser in strip
    const videoTrack = stream.getVideoTracks()[0];
    return videoTrack && videoTrack.enabled;
  });

  // Check permissions
  const currentUser = users.find((u) => u.id === (authUser?.id || socket?.id));
  const canShareScreen = isHost || currentUser?.isCoHost || false;
  const localUserName = currentUser?.name || authUser?.user_metadata?.display_name || 'You';

  const getActivityContent = () => {
    if (activityNotification) {
      return {
        text: activityNotification.message,
        color: 'bg-blue-500',
        animate: true,
      };
    }
    if (isScreenSharing)
      return {
        text: 'You are sharing your screen',
        color: 'bg-red-500 animate-pulse',
        animate: false,
      };
    if (remoteScreenStreams.size > 0) {
      const [userId] = remoteScreenStreams.keys();
      const user = users.find((u) => u.id === userId);
      return {
        text: `${user?.name || 'Someone'} is sharing screen`,
        color: 'bg-red-500 animate-pulse',
        animate: false,
      };
    }
    if (isPresentingFile && presentedFile)
      return {
        text: `Presenting: ${presentedFile.name} `,
        color: 'bg-blue-500 animate-pulse',
        animate: false,
      };
    if (youtubeVideoId) return { text: 'Watching YouTube', color: 'bg-red-600', animate: false };
    return { text: 'Room Active', color: 'bg-green-500', animate: false };
  };

  const activity = getActivityContent();

  return (
    <div className='h-screen bg-background flex flex-col overflow-hidden'>
      {/* Room Navbar */}
      <div className='h-16 border-b border-white/5 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10'>
        {/* Left: Room Code */}
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-sm'>Room Code:</span>
          <div className='flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md border border-white/10'>
            <span className='font-mono text-sm font-medium text-foreground'>{roomId}</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 ml-1 hover:bg-white/10'
              onClick={copyRoomLink}
              title='Copy Room Code'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
                <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
              </svg>
            </Button>
          </div>
        </div>

        {/* Center: Activity Status */}
        <div className='absolute left-1/2 -translate-x-1/2 flex items-center gap-2'>
          <div
            className={`h-2 w-2 rounded-full ${activity.color} ${activity.animate ? 'animate-pulse' : ''
              }`}
          />
          <span className='text-sm font-medium text-muted-foreground'>{activity.text}</span>
        </div>

        {/* Right: User Info */}
        <div className='flex items-center gap-3'>
          <div className='flex flex-col items-end hidden sm:flex'>
            <span className='text-sm font-medium'>{localUserName}</span>
            <span className='text-xs text-muted-foreground'>
              {isHost ? 'Host' : currentUser?.isCoHost ? 'Co-Host' : 'Participant'}
            </span>
          </div>
          <Avatar className='h-8 w-8 border border-primary/20'>
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${localUserName}`}
              alt={localUserName}
            />
            <AvatarFallback className='bg-primary/10 text-primary font-medium'>
              {localUserName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <NetworkQualityIndicator />
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 flex overflow-hidden relative'>
        {/* Video Grid / Presentation Area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${showChat ? 'mr-0 md:mr-80' : 'mr-0'
            }`}
        >
          {isPresentationMode ? (
            <div className='flex-1 flex flex-col min-h-0'>
              {/* Presentation Stage */}
              <div className='flex-1 bg-black relative p-4 flex items-center justify-center overflow-hidden'>
                {/* Screen Share View */}
                {hasScreenShare && (
                  <div className='w-full h-full flex items-center justify-center'>
                    {localScreenStream && (
                      <video
                        autoPlay
                        muted
                        playsInline
                        ref={(video) => {
                          if (video) video.srcObject = localScreenStream;
                        }}
                        className='max-w-full max-h-full object-contain rounded-lg shadow-2xl'
                      />
                    )}
                    {Array.from(remoteScreenStreams.entries()).map(([userId, stream]) => (
                      <video
                        key={userId}
                        autoPlay
                        playsInline
                        ref={(video) => {
                          if (video) video.srcObject = stream;
                        }}
                        className='max-w-full max-h-full object-contain rounded-lg shadow-2xl'
                      />
                    ))}
                  </div>
                )}

                {/* Cloud Browser View */}
                {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                  if (userId === 'browser-bot') {
                    return (
                      <div
                        key={userId}
                        className='w-full h-full flex items-center justify-center relative group'
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (isHost) {
                            e.preventDefault();
                            sendBrowserInput({ type: 'keydown', key: e.key });
                          }
                        }}
                        onKeyUp={(e) => {
                          if (isHost) {
                            e.preventDefault();
                            sendBrowserInput({ type: 'keyup', key: e.key });
                          }
                        }}
                      >
                        <video
                          autoPlay
                          playsInline
                          ref={(video) => {
                            if (video) {
                              console.log('[Room] Browser video ref callback, stream active:', stream.active, 'tracks:', stream.getTracks());
                              video.srcObject = stream;
                              // Ensure we can capture key events
                              video.parentElement?.focus();
                            }
                          }}
                          onLoadedMetadata={() => console.log('[Room] Browser video loaded metadata')}
                          onCanPlay={() => console.log('[Room] Browser video can play')}
                          onWaiting={() => console.log('[Room] Browser video waiting')}
                          onError={(e) => console.error('[Room] Browser video error', e)}
                          className='max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-crosshair'
                          onMouseMove={(e) => {
                            if (!isHost) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = Math.floor(e.clientX - rect.left);
                            const y = Math.floor(e.clientY - rect.top);
                            // Scale to 1280x720
                            const scaleX = 1280 / rect.width;
                            const scaleY = 720 / rect.height;
                            sendBrowserInput({
                              type: 'mousemove',
                              x: Math.floor(x * scaleX),
                              y: Math.floor(y * scaleY)
                            });
                          }}
                          onClick={(e) => {
                            if (!isHost) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = Math.floor(e.clientX - rect.left);
                            const y = Math.floor(e.clientY - rect.top);
                            const scaleX = 1280 / rect.width;
                            const scaleY = 720 / rect.height;
                            sendBrowserInput({
                              type: 'click',
                              x: Math.floor(x * scaleX),
                              y: Math.floor(y * scaleY)
                            });
                          }}
                        />
                        {isHost && (
                          <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs pointer-events-none">
                            Cloud Browser Control Active
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}

                {/* File Presentation View */}
                {isPresentingFile && presentedFile && (
                  <div className='w-full h-full flex flex-col items-center justify-center bg-zinc-900 rounded-lg overflow-hidden relative'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white'
                      onClick={closePresentedFile}
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='24'
                        height='24'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <line x1='18' y1='6' x2='6' y2='18' />
                        <line x1='6' y1='6' x2='18' y2='18' />
                      </svg>
                    </Button>
                    {presentedFile.type.startsWith('video/') ? (
                      <SynchronizedVideoPlayer
                        url={
                          presentedFile.url.startsWith('http')
                            ? presentedFile.url
                            : `${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}${presentedFile.url
                            }`
                        }
                        fileName={presentedFile.name}
                        onClose={closePresentedFile}
                        socket={socket}
                        roomId={roomId!}
                        isHost={isHost || !!currentUser?.isCoHost}
                      />
                    ) : (
                      <iframe
                        src={
                          presentedFile.url.startsWith('http')
                            ? presentedFile.url
                            : `${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}${presentedFile.url
                            }`
                        }
                        className='w-full h-full border-0 bg-white'
                        title={presentedFile.name}
                      />
                    )}
                  </div>
                )}

                {/* YouTube Player */}
                {youtubeVideoId && (
                  <div className='w-full h-full flex items-center justify-center'>
                    <SynchronizedYouTubePlayer
                      videoId={youtubeVideoId}
                      initialTime={youtubeCurrentTime}
                      isHost={isHost || !!currentUser?.isCoHost}
                    />
                  </div>
                )}
              </div>

              {/* Participants Strip */}
              <div className='h-32 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-4 px-4 overflow-x-auto custom-scrollbar shrink-0'>
                {/* Local User Mini Tile */}
                <div className='relative h-24 aspect-video bg-zinc-900 rounded-lg border border-zinc-800 shadow-sm overflow-hidden shrink-0 group'>
                  {localStream ? (
                    <VideoTile
                      stream={localStream}
                      username='You'
                      isLocal={true}
                      isMuted={!isAudioEnabled}
                      className='w-full h-full'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center bg-muted/20'>
                      <Avatar className='h-16 w-16 border-2 border-primary/20'>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${localUserName}`}
                          alt={localUserName}
                        />
                        <AvatarFallback className='bg-primary/10 text-primary text-xl font-medium'>
                          {localUserName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className='absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-medium'>
                    You
                  </div>
                </div>

                {/* Remote Users Mini Tiles */}
                {visibleRemoteStreams.map(([userId, stream]) => {
                  const user = users.find((u) => u.id === userId);
                  return (
                    <div
                      key={userId}
                      className='relative h-24 aspect-video bg-zinc-900 rounded-lg border border-zinc-800 shadow-sm overflow-hidden shrink-0'
                    >
                      <VideoTile
                        stream={stream}
                        username={user?.name || 'Unknown'}
                        isLocal={false}
                        className='w-full h-full'
                      />
                      <div className='absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-medium truncate max-w-[80px]'>
                        {user?.name || 'Unknown'}
                      </div>
                    </div>
                  );
                })}

                {/* Other Participants Count */}
                {users.length - visibleRemoteStreams.length - 1 > 0 && (
                  <div className='h-24 aspect-video bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20 flex flex-col items-center justify-center shrink-0'>
                    <span className='text-lg font-bold text-muted-foreground'>
                      +{users.length - visibleRemoteStreams.length - 1}
                    </span>
                    <span className='text-xs text-muted-foreground'>others</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Grid Mode
            <VideoGrid
              localStream={localStream}
              localUserName={localUserName}
              isAudioEnabled={isAudioEnabled}
              isMediaLoading={isMediaLoading}
              remoteStreams={remoteStreams}
              users={users}
            />
          )}
        </div>

        {/* Room Controls */}
        <div
          className={`fixed bottom-0 left-0 right-0 transition-all duration-300 z-50 ${showChat ? 'mr-0 md:mr-80' : 'mr-0'
            }`}
        >
          <RoomControls
            roomId={roomId!}
            roomName={roomName}
            participantCount={users.length}
            isAudioEnabled={isAudioEnabled}
            toggleAudio={toggleAudio}
            isVideoEnabled={isVideoEnabled}
            toggleVideo={toggleVideo}
            isScreenSharing={isScreenSharing}
            handleToggleScreenShare={handleToggleScreenShare}
            canShareScreen={canShareScreen}
            youtubeVideoId={youtubeVideoId}
            setShowOTTModal={setShowOTTModal}
            isRecording={isRecording}
            startRecording={startRecording}
            stopRecording={stopRecording}
            isHost={isHost}
            setShowDisbandConfirm={setShowDisbandConfirm}
            handleLeaveRoom={handleLeaveRoom}
            isCinemaMode={isCinemaMode}
            setIsCinemaMode={setIsCinemaMode}
            showChat={showChat}
            setShowChat={setShowChat}
            showStopShareConfirm={showStopShareConfirm}
            setShowStopShareConfirm={setShowStopShareConfirm}
            confirmStopShare={confirmStopShare}
            showDisbandConfirm={showDisbandConfirm}
            disbandRoom={disbandRoom}
            startBrowserSession={startBrowserSession}
            stopBrowserSession={stopBrowserSession}
          />
        </div>

        {/* Chat Panel */}
        <ChatPanel
          showChat={showChat}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          messages={messages}
          files={files}
          users={users}
          currentUser={currentUser}
          isHost={isHost}
          waitingUsers={waitingUsers}
          admitUser={admitUser}
          denyUser={denyUser}
          admitAllWaitingUsers={admitAllWaitingUsers}
          promoteToCoHost={promoteToCoHost}
          demoteFromCoHost={demoteFromCoHost}
          muteUser={muteUser}
          kickUser={kickUser}
          messagesEndRef={messagesEndRef}
          handleSendMessage={handleSendMessage}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          triggerFileUpload={triggerFileUpload}
          isUploading={isUploading}
          presentFile={presentFile}
        />
      </div>

      <Suspense fallback={null}>
        {showOTTModal && (
          <OTTGridModal
            isOpen={showOTTModal}
            onOpenChange={setShowOTTModal}
            onStartYouTube={startYoutubeVideo}
            onFileUpload={(file) => {
              uploadFile(file);
              setShowOTTModal(false);
            }}
            onStartScreenShare={handleToggleScreenShare}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Room;
