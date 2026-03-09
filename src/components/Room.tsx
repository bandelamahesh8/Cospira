import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import LiveCaptions from './room/LiveCaptions';
import SummaryModal from './room/SummaryModal';
import AITimer from './room/AITimer';
import AIPoll from './room/AIPoll';
import LateJoinBanner from './room/LateJoinBanner';
import InviteModal from './room/InviteModal';
import FeedbackModal from '@/components/FeedbackModal'; // Adjusted path check
import {
  Paperclip,
  Send,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  FileText,
  Waves,
  Crop,
  UserPlus,
  Heart,
} from 'lucide-react';

const VideoPlayer = ({
  stream,
  muted = false,
  name,
  isAway = false,
}: {
  stream: MediaStream;
  muted?: boolean;
  name: string;
  isAway?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className='relative bg-black rounded-lg overflow-hidden aspect-video shadow-md group'>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isAway ? 'opacity-30 blur-sm' : ''}`}
      />

      {/* Name Tag */}
      <div className='absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur-sm'>
        {name} {muted && '(You)'}
      </div>

      {/* Away Overlay */}
      {isAway && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className='bg-yellow-500/90 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse'>
            💤 Away
          </span>
        </div>
      )}
    </div>
  );
};

const Room: React.FC = () => {
  const {
    isConnected,
    roomId,
    users,
    messages,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendFile,
    error,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    isNoiseSuppressionEnabled,
    toggleNoiseSuppression,
    isAutoFramingEnabled, // Added
    toggleAutoFraming, // Added
    isAway, // Added
    activeTimer,
    activePoll,
    lateJoinSummary,
    socket,
  } = useWebSocket();

  const [message, setMessage] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Catch Up Logic
  const [catchUpSummary, setCatchUpSummary] = useState<string | null>(null);
  const [isCatchUpVisible, setIsCatchUpVisible] = useState(false);
  const hasCheckedCatchUp = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for Late Join / Catch Up Offer
  useEffect(() => {
    if (roomId && isConnected && !hasCheckedCatchUp.current) {
      hasCheckedCatchUp.current = true;
      // Simulate "late join" detection: always show for testing purposes
      setIsCatchUpVisible(true);
      // Auto-hide after 15s
      const timer = setTimeout(() => setIsCatchUpVisible(false), 15000);
      return () => clearTimeout(timer);
    }
  }, [roomId, isConnected]);

  const handleJoinRoom = () => {
    if (roomInput.trim()) {
      joinRoom(roomInput.trim(), showPasswordInput ? password : undefined);
      setShowPasswordInput(false);
      setPassword('');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && roomId) {
      sendMessage(message.trim());
      setMessage('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && roomId) {
      sendFile(file);
    }
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRequestCatchUp = () => {
    if (!roomId || !socket) return;
    setIsCatchUpVisible(false); // Hide prompt

    socket.emit(
      'ai:request-catchup',
      { roomId },
      (res: { success: boolean; summary?: string; error?: string }) => {
        if (res.success && res.summary) {
          setCatchUpSummary(res.summary);
        }
      }
    );
  };

  if (!isConnected) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='text-2xl font-bold mb-2'>Connecting to server...</div>
          <div className='text-muted-foreground'>
            Please wait while we connect to the WebSocket server.
          </div>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className='max-w-md mx-auto mt-10 p-6 bg-card rounded-lg shadow'>
        <h2 className='text-2xl font-bold mb-6 text-center'>Join a Room</h2>
        <div className='space-y-4'>
          <div>
            <label htmlFor='roomId' className='block text-sm font-medium mb-1'>
              Room ID
            </label>
            <Input
              id='roomId'
              type='text'
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder='Enter room ID'
              className='w-full'
            />
          </div>

          {showPasswordInput && (
            <div>
              <label htmlFor='password' className='block text-sm font-medium mb-1'>
                Password
              </label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Enter password'
                className='w-full'
              />
            </div>
          )}

          <div className='flex justify-between items-center'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowPasswordInput(!showPasswordInput)}
              className='text-sm'
            >
              {showPasswordInput ? 'Remove password' : 'Add password'}
            </Button>

            <Button onClick={handleJoinRoom} disabled={!roomInput.trim()}>
              Join Room
            </Button>
          </div>

          {error && (
            <div className='p-3 bg-destructive/10 text-destructive text-sm rounded-md'>{error}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-[calc(100vh-100px)] max-w-7xl mx-auto p-4 gap-4'>
      {/* Header with controls */}
      <div className='flex justify-between items-center bg-card p-4 rounded-lg shadow-sm'>
        <div>
          <h2 className='text-xl font-bold'>Room: {roomId}</h2>
          <div className='text-sm text-muted-foreground'>
            {users.length} {users.length === 1 ? 'user' : 'users'} online
          </div>
        </div>

        {activeTimer && (
          <div className='hidden md:block'>
            <AITimer
              duration={activeTimer.duration}
              startedAt={activeTimer.startedAt}
              label={activeTimer.label}
            />
          </div>
        )}

        <div className='flex items-center gap-2'>
          {/* Catch Up Button (Visible Only Briefly on Join) */}
          {isCatchUpVisible && (
            <Button
              variant='default'
              size='sm'
              onClick={handleRequestCatchUp}
              className='animate-in fade-in slide-in-from-top-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg mr-2'
            >
              ✨ Catch Me Up
            </Button>
          )}

          <Button
            variant={isAudioEnabled ? 'outline' : 'destructive'}
            size='icon'
            onClick={toggleAudio}
            title={isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isAudioEnabled ? <Mic className='h-5 w-5' /> : <MicOff className='h-5 w-5' />}
          </Button>

          <Button
            variant={isNoiseSuppressionEnabled ? 'secondary' : 'ghost'} // Helper state, ghost if off
            size='icon'
            onClick={toggleNoiseSuppression}
            title={
              isNoiseSuppressionEnabled
                ? 'Disable AI Noise Suppression'
                : 'Enable AI Noise Suppression'
            }
            className={isNoiseSuppressionEnabled ? 'text-green-600' : 'text-muted-foreground'}
          >
            <Waves className='h-5 w-5' />
          </Button>

          <Button
            variant={isVideoEnabled ? 'outline' : 'destructive'}
            size='icon'
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoEnabled ? <Video className='h-5 w-5' /> : <VideoOff className='h-5 w-5' />}
          </Button>

          <Button
            variant={isAutoFramingEnabled ? 'secondary' : 'ghost'}
            size='icon'
            onClick={toggleAutoFraming}
            title={isAutoFramingEnabled ? 'Disable Auto Framing' : 'Enable Auto Framing'}
            className={isAutoFramingEnabled ? 'text-blue-600' : 'text-muted-foreground'}
          >
            <Crop className='h-5 w-5' />
          </Button>

          <Button
            variant={isChatOpen ? 'secondary' : 'outline'}
            size='icon'
            onClick={() => setIsChatOpen(!isChatOpen)}
            title={isChatOpen ? 'Close Chat' : 'Open Chat'}
          >
            <MessageSquare className='h-5 w-5' />
          </Button>

          <Button
            variant={isSummaryOpen ? 'secondary' : 'outline'}
            size='icon'
            onClick={() => setIsSummaryOpen(true)}
            title='Meeting Summary'
          >
            <FileText className='h-5 w-5' />
          </Button>

          <Button
            variant='outline'
            size='icon'
            onClick={() => setIsInviteOpen(true)}
            title='Invite People'
            className='text-primary hover:text-primary hover:bg-primary/5'
          >
            <UserPlus className='h-5 w-5' />
          </Button>

          <Button
            variant='outline'
            size='icon'
            onClick={() => setIsFeedbackOpen(true)}
            title='Send Feedback'
            className='text-pink-500 hover:text-pink-600 hover:bg-pink-500/5'
          >
            <Heart className='h-5 w-5' />
          </Button>

          <Button variant='destructive' onClick={leaveRoom} title='Leave Room'>
            <PhoneOff className='h-5 w-5 mr-2' />
            Leave
          </Button>
        </div>
      </div>

      {/* Main content area - Video Grid + Chat */}
      <div className='flex flex-1 gap-4 overflow-hidden'>
        {/* Video Grid */}
        <div className='flex-1 overflow-y-auto'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {/* Local Video */}
            {localStream && (
              <VideoPlayer stream={localStream} muted={true} name='You' isAway={isAway} />
            )}

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const user = users.find((u) => u.id === userId);
              return (
                <VideoPlayer
                  key={userId}
                  stream={stream}
                  name={user?.name || 'Unknown User'}
                  isAway={user?.isAway}
                />
              );
            })}

            {/* Placeholder if no video */}
            {!localStream && remoteStreams.size === 0 && (
              <div className='col-span-full flex items-center justify-center h-64 bg-muted/30 rounded-lg border-2 border-dashed'>
                <div className='text-center text-muted-foreground'>
                  <VideoOff className='h-12 w-12 mx-auto mb-2 opacity-50' />
                  <p>No active video streams</p>
                  <p className='text-sm'>Turn on your camera to see yourself here</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        {isChatOpen && (
          <div className='w-80 flex flex-col bg-card rounded-lg shadow-sm border'>
            <div className='p-3 border-b flex justify-between items-center'>
              <span className='font-semibold'>Chat</span>
              {activeTimer && (
                <div className='md:hidden'>
                  <AITimer
                    duration={activeTimer.duration}
                    startedAt={activeTimer.startedAt}
                    label={activeTimer.label}
                  />
                </div>
              )}
            </div>

            <ScrollArea className='flex-1 p-4'>
              <div className='space-y-4 text-sm'>
                {activePoll && (
                  <div className='mb-6'>
                    <AIPoll
                      id={activePoll.id}
                      question={activePoll.question}
                      options={activePoll.options}
                      expiresAt={activePoll.expiresAt}
                      onVote={(index) =>
                        socket?.emit('room:poll-vote', {
                          roomId,
                          pollId: activePoll.id,
                          optionIndex: index,
                        })
                      }
                      results={activePoll.results}
                      totalVotes={activePoll.totalVotes}
                    />
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.userId === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 text-sm ${
                        msg.userId === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      <div className='text-xs font-medium mb-1 opacity-90'>{msg.userName}</div>
                      <div>{msg.content}</div>
                      <div className='text-[10px] opacity-70 mt-1 text-right'>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className='p-3 border-t'>
              <form onSubmit={handleSendMessage} className='flex gap-2'>
                <div className='relative flex-1'>
                  <Input
                    type='text'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder='Type a message...'
                    className='pr-8'
                  />
                  <input
                    type='file'
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className='hidden'
                    accept='image/*,.pdf,.doc,.docx'
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className='h-4 w-4' />
                  </Button>
                </div>
                <Button type='submit' size='icon' disabled={!message.trim()}>
                  <Send className='h-4 w-4' />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {lateJoinSummary && (
        <LateJoinBanner
          summary={lateJoinSummary.summary}
          bullets={lateJoinSummary.bullets}
          duration={lateJoinSummary.duration}
          onDismiss={() => {
            // Dismiss via socket if we want persistence, or globally for user
          }}
          onExpand={() => {
            setCatchUpSummary(lateJoinSummary.summary);
          }}
        />
      )}

      {/* Live Captions Overlay */}
      <LiveCaptions />

      {/* Summary Modal */}
      <SummaryModal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} />

      {/* Invite Modal */}
      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} roomId={roomId!} />

      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {/* Catch Up Modal (Overview Overlay) */}
      {catchUpSummary && (
        <div className='fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in'>
          <div className='bg-background border border-border rounded-xl shadow-2xl p-6 max-w-md w-full m-4'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-bold'>⚡ Quick Catch Up</h3>
              <button
                onClick={() => setCatchUpSummary(null)}
                className='text-muted-foreground hover:text-foreground'
              >
                ✕
              </button>
            </div>
            <div className='prose prose-sm dark:prose-invert bg-muted/30 p-4 rounded-lg max-h-[60vh] overflow-y-auto'>
              <p className='whitespace-pre-wrap'>{catchUpSummary}</p>
            </div>
            <Button onClick={() => setCatchUpSummary(null)} className='w-full mt-4'>
              Got it, thanks!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
