import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import ChatPanel from '@/components/ChatPanel';
import { useAuth } from '@/hooks/useAuth';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  Users,
  MessageSquare,
  Monitor,
  MoreVertical,
  Loader2,
} from 'lucide-react';

const RoomDemo = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const participants = [
    { id: '1', name: 'You (Host)', email: user.email || '' },
    { id: '2', name: 'Alice Chen', email: 'alice@example.com' },
    { id: '3', name: 'Bob Smith', email: 'bob@example.com' },
  ];

  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <Navbar />

      <div className='flex-1 flex pt-16'>
        {/* Main Content Area */}
        <div className='flex-1 flex flex-col p-4'>
          {/* Room Info Bar */}
          <Card className='glass-card p-4 mb-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-bold'>Team Collaboration Room</h2>
                <p className='text-sm text-muted-foreground'>Secure • Encrypted • Ephemeral</p>
              </div>
              <div className='flex items-center gap-2'>
                <Button variant='ghost' size='icon'>
                  <Settings className='w-5 h-5' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setShowParticipants(!showParticipants)}
                >
                  <Users className='w-5 h-5' />
                </Button>
                <Button variant='ghost' size='icon' onClick={() => setShowChat(!showChat)}>
                  <MessageSquare className='w-5 h-5' />
                </Button>
              </div>
            </div>
          </Card>

          {/* Video Area */}
          <div className='flex-1 flex gap-4'>
            {/* Main Video */}
            <Card className='flex-1 glass-card relative overflow-hidden'>
              <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10'>
                <div className='text-center'>
                  <div className='w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 animate-glow'>
                    <Monitor className='w-12 h-12 text-background' />
                  </div>
                  <h3 className='text-2xl font-semibold mb-2'>Virtual Browser Session</h3>
                  <p className='text-muted-foreground'>
                    Cloud-rendered desktop in ephemeral container
                  </p>
                </div>
              </div>

              {/* Controls Overlay */}
              <div className='absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/80 to-transparent'>
                <div className='flex items-center justify-center gap-3'>
                  <Button
                    variant={isMuted ? 'destructive' : 'secondary'}
                    size='icon'
                    className='rounded-full w-12 h-12'
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <MicOff className='w-5 h-5' /> : <Mic className='w-5 h-5' />}
                  </Button>

                  <Button
                    variant={isVideoOff ? 'destructive' : 'secondary'}
                    size='icon'
                    className='rounded-full w-12 h-12'
                    onClick={() => setIsVideoOff(!isVideoOff)}
                  >
                    {isVideoOff ? <VideoOff className='w-5 h-5' /> : <Video className='w-5 h-5' />}
                  </Button>

                  <Button variant='secondary' size='icon' className='rounded-full w-12 h-12'>
                    <Monitor className='w-5 h-5' />
                  </Button>

                  <Button variant='secondary' size='icon' className='rounded-full w-12 h-12'>
                    <MoreVertical className='w-5 h-5' />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Participants Panel */}
            {showParticipants && (
              <Card className='w-64 glass-card p-4'>
                <h3 className='font-semibold mb-4'>Participants ({participants.length})</h3>
                <div className='space-y-3'>
                  {participants.map((participant) => (
                    <div key={participant.id} className='flex items-center gap-3'>
                      <Avatar>
                        <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium truncate'>{participant.name}</p>
                        <p className='text-xs text-muted-foreground truncate'>
                          {participant.email}
                        </p>
                      </div>
                      <div className='w-2 h-2 bg-green-500 rounded-full' />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className='w-80 h-[calc(100vh-4rem)] pt-16'>
            <Card className='glass-card h-full overflow-hidden'>
              <ChatPanel roomId='demo' />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomDemo;
