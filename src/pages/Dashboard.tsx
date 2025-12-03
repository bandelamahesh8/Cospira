import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Users, LogIn, Lock, Unlock, RefreshCw, Globe, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useOrganization } from '@/contexts/OrganizationContext';
import { CreateOrganizationModal } from '@/components/CreateOrganizationModal';
import { OrganizationSettingsModal } from '@/components/OrganizationSettingsModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Settings } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { isConnected, createRoom, joinRoom, getRecentRooms } = useWebSocket();
  const navigate = useNavigate();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [roomName, setRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [accessType, setAccessType] = useState<'public' | 'password' | 'invite' | 'organization'>('public');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomPassword, setJoinRoomPassword] = useState('');
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isOrgSettingsModalOpen, setIsOrgSettingsModalOpen] = useState(false);

  useEffect(() => {
    if (!isConnected) return;

    // Initial fetch with callback
    getRecentRooms((rooms) => {
      setRecentRooms(rooms as typeof recentRooms);
    });

    // Poll for recent rooms every 3 seconds when connected
    const interval = setInterval(() => {
      if (isConnected) {
        getRecentRooms((rooms) => {
          setRecentRooms(rooms as typeof recentRooms);
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [getRecentRooms, isConnected]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    // Generate a 6-digit random alphanumeric key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Pass a callback to navigate after successful join
    createRoom(roomId, roomName, newRoomPassword, accessType, () => {
      toast.success(`Room created! Key: ${roomId}`);
      navigate(`/room/${roomId}`);
    }, currentOrganization?.id);
  };

  const handleJoinRoom = async (input: string, requiresPassword?: boolean) => {
    let roomId = input;
    let token: string | undefined;

    // Check if input is a URL
    try {
      const url = new URL(input);
      // Extract roomId from path (e.g., /room/123 -> 123)
      const pathParts = url.pathname.split('/');
      const idFromPath = pathParts[pathParts.length - 1];
      if (idFromPath) {
        roomId = idFromPath;
      }
      // Extract token from query params
      const tokenFromUrl = url.searchParams.get('token');
      if (tokenFromUrl) {
        token = tokenFromUrl;
      }
    } catch (e) {
      // Not a URL, treat as plain roomId
    }

    // If we already know the password requirement (e.g., from recent rooms), use it
    if (requiresPassword) {
      setJoinRoomId(roomId);
      setIsJoinDialogOpen(true);
      return;
    }

    // Otherwise, fetch room info to determine if a password is needed
    try {
      // Convert ws:// to http:// for HTTP requests
      const baseUrl = (import.meta.env.VITE_WS_URL || 'http://localhost:3001').replace(/^ws:/, 'http:');
      const response = await fetch(
        `${baseUrl}/api/room-info/${roomId}`
      );
      if (!response.ok) {
        toast.error('Room not found');
        return;
      }
      const data = await response.json();
      if (data.requiresPassword) {
        setJoinRoomId(roomId);
        setIsJoinDialogOpen(true);
      } else {
        joinRoom(roomId, undefined, token, () => {
          navigate(`/room/${roomId}`);
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to check room info');
    }
  };

  const handleJoinWithPassword = () => {
    if (!joinRoomPassword) {
      toast.error('Please enter a password');
      return;
    }

    joinRoom(joinRoomId, joinRoomPassword, undefined, () => {
      navigate(`/room/${joinRoomId}`);
    });

    setIsJoinDialogOpen(false);
    setJoinRoomPassword('');
  };

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />

      <div className='container pb-10 pt-32'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Dashboard</h1>
            <p className='text-muted-foreground'>
              Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
            </p>
          </div>

          <div className='flex gap-2 items-center'>
            <div className="w-[200px]">
              <Select
                value={currentOrganization?.id || 'personal'}
                onValueChange={(value) => {
                  if (value === 'create') {
                    setIsCreateOrgModalOpen(true);
                  } else if (value === 'personal') {
                    setCurrentOrganization(null);
                  } else {
                    const org = organizations.find((o) => o.id === value);
                    setCurrentOrganization(org || null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Personal
                    </div>
                  </SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 mr-2" />
                        {org.name}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="create" className="text-primary font-medium">
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Organization
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {currentOrganization && (
              <Button variant="ghost" size="icon" onClick={() => setIsOrgSettingsModalOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            )}
            <Button variant='outline' onClick={() => getRecentRooms()}>
              <RefreshCw className='w-4 h-4 mr-2' />
              Refresh
            </Button>
          </div>
        </div>

        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {/* Create Room Card */}
          <Card className='bg-primary/5 border-primary/20'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Plus className='w-5 h-5 text-primary' />
                Create New Room
              </CardTitle>
              <CardDescription>Start a new secure collaboration session</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='room-name'>Room Name</Label>
                <Input
                  id='room-name'
                  placeholder='e.g. Project Alpha'
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>

              <div className='space-y-3'>
                <Label className='text-base font-medium'>Access Type</Label>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                  {[
                    {
                      id: 'public',
                      label: 'Public',
                      icon: Globe,
                      desc: 'Open to everyone',
                      color: 'text-blue-400',
                      bg: 'bg-blue-400/10',
                      border: 'border-blue-400/50'
                    },
                    {
                      id: 'password',
                      label: 'Private',
                      icon: Lock,
                      desc: 'Password required',
                      color: 'text-amber-400',
                      bg: 'bg-amber-400/10',
                      border: 'border-amber-400/50'
                    },
                    {
                      id: 'invite',
                      label: 'Invite',
                      icon: LinkIcon,
                      desc: 'Token link only',
                      color: 'text-purple-400',
                      bg: 'bg-purple-400/10',
                      border: 'border-purple-400/50'
                    },
                    ...(currentOrganization ? [{
                      id: 'organization',
                      label: 'Organization',
                      icon: Building2,
                      desc: 'Members only',
                      color: 'text-indigo-400',
                      bg: 'bg-indigo-400/10',
                      border: 'border-indigo-400/50'
                    }] : [])
                  ].map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setAccessType(type.id as 'public' | 'password' | 'invite' | 'organization')}
                      className={`
                        relative cursor-pointer rounded-xl border-2 p-3 transition-all duration-300 ease-in-out
                        hover:scale-105 hover:shadow-lg
                        ${accessType === type.id
                          ? `${type.border} ${type.bg} shadow-md scale-105`
                          : 'border-muted/40 hover:border-muted hover:bg-muted/20'
                        }
                      `}
                    >
                      <div className='flex flex-col items-center text-center gap-2'>
                        <div className={`p-2 rounded-full bg-background/50 ${accessType === type.id ? type.color : 'text-muted-foreground'}`}>
                          <type.icon className='w-5 h-5' />
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${accessType === type.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {type.label}
                          </p>
                          <p className='text-[10px] text-muted-foreground/80 uppercase tracking-wider font-medium mt-0.5'>
                            {type.desc}
                          </p>
                        </div>
                      </div>
                      {accessType === type.id && (
                        <div className='absolute top-2 right-2'>
                          <span className='relative flex h-2 w-2'>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${type.color.replace('text-', 'bg-')}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${type.color.replace('text-', 'bg-')}`}></span>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${accessType === 'password' ? 'max-h-24 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <Label htmlFor='room-pass' className='text-amber-400 flex items-center gap-2'>
                  <Lock className='w-3 h-3' /> Set Room Password
                </Label>
                <Input
                  id='room-pass'
                  type='password'
                  placeholder='Enter a strong password...'
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                  className='border-amber-400/30 focus:border-amber-400 focus:ring-amber-400/20 bg-amber-400/5'
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className='w-full' onClick={handleCreateRoom}>
                Create & Join
              </Button>
            </CardFooter>
          </Card>

          {/* Join Room Card */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <LogIn className='w-5 h-5' />
                Join by ID or Link
              </CardTitle>
              <CardDescription>Enter a room ID or paste a link to join</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='join-id'>Room ID or Link</Label>
                <Input
                  id='join-id'
                  placeholder='Enter Room ID or paste link'
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant='secondary'
                className='w-full'
                onClick={() => handleJoinRoom(joinRoomId)}
              >
                Join Room
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className='mt-12'>
          <h2 className='text-2xl font-semibold mb-6 flex items-center gap-2'>
            <Users className='w-6 h-6' />
            Active Rooms
          </h2>

          {recentRooms.length === 0 ? (
            <div className='text-center py-12 border rounded-lg bg-muted/10 border-dashed'>
              <p className='text-muted-foreground'>
                No active rooms found. Create one to get started!
              </p>
            </div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {recentRooms.map((room) => (
                <Card
                  key={room.id}
                  className='hover:shadow-md transition-shadow cursor-pointer'
                  onClick={() => handleJoinRoom(room.id, room.requiresPassword)}
                >
                  <CardHeader className='pb-2'>
                    <div className='flex justify-between items-start'>
                      <CardTitle className='text-lg font-medium'>{room.name || room.id}</CardTitle>
                      {room.requiresPassword ? (
                        <Lock className='w-4 h-4 text-amber-500' />
                      ) : (
                        <Unlock className='w-4 h-4 text-green-500' />
                      )}
                    </div>
                    <CardDescription>
                      ID: {room.id} • Created{' '}
                      {formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                      <Users className='w-4 h-4' />
                      {room.userCount} participant{room.userCount !== 1 && 's'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Required</DialogTitle>
            <DialogDescription>
              This room is protected. Please enter the password to join.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='join-pass'>Password</Label>
            <Input
              id='join-pass'
              type='password'
              value={joinRoomPassword}
              onChange={(e) => setJoinRoomPassword(e.target.value)}
              className='mt-2'
            />
          </div>
          <DialogFooter>
            <Button onClick={handleJoinWithPassword}>Join Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateOrganizationModal
        open={isCreateOrgModalOpen}
        onOpenChange={setIsCreateOrgModalOpen}
      />

      <OrganizationSettingsModal
        open={isOrgSettingsModalOpen}
        onOpenChange={setIsOrgSettingsModalOpen}
      />
    </div>
  );
};

export default Dashboard;
