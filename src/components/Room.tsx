import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Send, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

const VideoPlayer = ({ stream, muted = false, name }: { stream: MediaStream; muted?: boolean; name: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className='relative bg-black rounded-lg overflow-hidden aspect-video shadow-md'>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className='w-full h-full object-cover'
      />
      <div className='absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium'>
        {name}
      </div>
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
  } = useWebSocket();

  const [message, setMessage] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

        <div className='flex items-center gap-2'>
          <Button
            variant={isAudioEnabled ? 'outline' : 'destructive'}
            size='icon'
            onClick={toggleAudio}
            title={isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isAudioEnabled ? <Mic className='h-5 w-5' /> : <MicOff className='h-5 w-5' />}
          </Button>

          <Button
            variant={isVideoEnabled ? 'outline' : 'destructive'}
            size='icon'
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoEnabled ? <Video className='h-5 w-5' /> : <VideoOff className='h-5 w-5' />}
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
              <VideoPlayer
                stream={localStream}
                muted={true}
                name='You'
              />
            )}

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const user = users.find(u => u.id === userId);
              return (
                <VideoPlayer
                  key={userId}
                  stream={stream}
                  name={user?.name || 'Unknown User'}
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
        <div className='w-80 flex flex-col bg-card rounded-lg shadow-sm border'>
          <div className='p-3 border-b font-semibold'>Chat</div>

          <ScrollArea className='flex-1 p-4'>
            <div className='space-y-4'>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.userId === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.userId === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                  >
                    <div className='text-xs font-medium mb-1 opacity-90'>{msg.userName}</div>
                    <div>{msg.content}</div>
                    <div className='text-[10px] opacity-70 mt-1 text-right'>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      </div>
    </div>
  );
};

export default Room;
