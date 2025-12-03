import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Globe, Video, Gamepad2, FileText, Shield, Lock, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CreateRoom = () => {
  const { user } = useAuth();
  const { createRoom } = useWebSocket();
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('browser');
  const [capacity, setCapacity] = useState('10');
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState({
    micAllowed: true,
    cameraAllowed: true,
    fileUpload: true,
    chat: true,
    externalLinks: false,
    drmSafe: false,
    ghostProtocol: false,
    complianceMode: false,
  });

  const roomTypes = [
    { id: 'browser', icon: Video, label: 'Virtual Browser' },
    { id: 'watch', icon: Globe, label: 'Watch Party' },
    { id: 'game', icon: Gamepad2, label: 'Game Room' },
    { id: 'presentation', icon: FileText, label: 'Presentation' },
    { id: 'secure', icon: Shield, label: 'Secure Corporate' },
  ];

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a room name',
        variant: 'destructive',
      });
      return;
    }

    // Generate a 6-digit random alphanumeric key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Determine access type based on password
    const accessType = password ? 'password' : 'public';

    createRoom(roomId, roomName, password, accessType, () => {
      toast({
        title: 'Success',
        description: `Room created! Key: ${roomId}`,
      });
      navigate(`/room/${roomId}`);
    });
  };

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />

      <main className='container mx-auto px-4 pt-24 pb-12'>
        <div className='max-w-4xl mx-auto'>
          <div className='mb-8'>
            <Link
              to='/dashboard'
              className='inline-flex items-center text-muted-foreground hover:text-foreground mb-4'
            >
              <ArrowLeft className='w-4 h-4 mr-2' />
              Back to Dashboard
            </Link>
            <h1 className='text-4xl font-bold mb-2'>Create New Room</h1>
            <p className='text-muted-foreground text-lg'>
              Configure your secure collaboration space
            </p>
          </div>

          {/* Room Type Selection */}
          <Card className='glass-card mb-6'>
            <CardHeader>
              <CardTitle>Room Type</CardTitle>
              <CardDescription>Select the type of collaboration space</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-5 gap-3'>
                {roomTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setRoomType(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${roomType === type.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                      }`}
                  >
                    <type.icon className='w-8 h-8 mx-auto mb-2 text-primary' />
                    <p className='text-sm font-medium text-center'>{type.label}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Basic Settings */}
          <Card className='glass-card mb-6'>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='roomName'>Room Name</Label>
                <Input
                  id='roomName'
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder='My Collaboration Room'
                />
              </div>

              <div>
                <Label htmlFor='capacity'>Max Capacity</Label>
                <Select value={capacity} onValueChange={setCapacity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='5'>5 participants</SelectItem>
                    <SelectItem value='10'>10 participants</SelectItem>
                    <SelectItem value='25'>25 participants</SelectItem>
                    <SelectItem value='50'>50 participants</SelectItem>
                    <SelectItem value='100'>100 participants</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='password'>Room Password (Optional)</Label>
                <Input
                  id='password'
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='Leave empty for no password'
                />
              </div>
            </CardContent>
          </Card>

          {/* Host Controls */}
          <Card className='glass-card mb-6'>
            <CardHeader>
              <CardTitle>Host Controls</CardTitle>
              <CardDescription>Configure what participants can do</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <Label>Microphone Access</Label>
                <Switch
                  checked={settings.micAllowed}
                  onCheckedChange={(checked) => setSettings({ ...settings, micAllowed: checked })}
                />
              </div>

              <div className='flex items-center justify-between'>
                <Label>Camera Access</Label>
                <Switch
                  checked={settings.cameraAllowed}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, cameraAllowed: checked })
                  }
                />
              </div>

              <div className='flex items-center justify-between'>
                <Label>File Upload</Label>
                <Switch
                  checked={settings.fileUpload}
                  onCheckedChange={(checked) => setSettings({ ...settings, fileUpload: checked })}
                />
              </div>

              <div className='flex items-center justify-between'>
                <Label>Chat</Label>
                <Switch
                  checked={settings.chat}
                  onCheckedChange={(checked) => setSettings({ ...settings, chat: checked })}
                />
              </div>

              <div className='flex items-center justify-between'>
                <Label>External Links</Label>
                <Switch
                  checked={settings.externalLinks}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, externalLinks: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Security */}
          <Card className='glass-card mb-6'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Lock className='w-5 h-5 text-primary' />
                Advanced Security
              </CardTitle>
              <CardDescription>Enterprise-grade security features</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <Label>DRM-Safe Mode</Label>
                  <p className='text-sm text-muted-foreground'>
                    Enable hardware DRM for content protection
                  </p>
                </div>
                <Switch
                  checked={settings.drmSafe}
                  onCheckedChange={(checked) => setSettings({ ...settings, drmSafe: checked })}
                />
              </div>

              <Separator />

              <div className='flex items-center justify-between'>
                <div>
                  <Label>Ghost Protocol</Label>
                  <p className='text-sm text-muted-foreground'>AI-powered intrusion detection</p>
                </div>
                <Switch
                  checked={settings.ghostProtocol}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, ghostProtocol: checked })
                  }
                />
              </div>

              <Separator />

              <div className='flex items-center justify-between'>
                <div>
                  <Label>Compliance Mode</Label>
                  <p className='text-sm text-muted-foreground'>
                    Enable audit logging and blockchain verification
                  </p>
                </div>
                <Switch
                  checked={settings.complianceMode}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, complianceMode: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Create Button */}
          <div className='flex gap-4'>
            <Button variant='outline' asChild className='flex-1'>
              <Link to='/dashboard'>Cancel</Link>
            </Button>
            <Button onClick={handleCreateRoom} className='flex-1 glow-button'>
              Create Room
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateRoom;
