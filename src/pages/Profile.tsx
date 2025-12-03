import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Save, Upload, Camera, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { roomId } = useWebSocket();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [gender, setGender] = useState(user?.user_metadata?.gender || 'other');
  const [photoUrl, setPhotoUrl] = useState(user?.user_metadata?.photo_url || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || '');
      setGender(user.user_metadata?.gender || 'other');
      setPhotoUrl(user.user_metadata?.photo_url || '');
    }
  }, [user]);

  // Block access if user is in a room
  if (roomId) {
    return (
      <div className='min-h-screen bg-background'>
        <Navbar />
        <div className='container py-6 mt-24 max-w-2xl'>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              You cannot access your profile while you're in a room. Please leave the room first to
              edit your profile.
            </AlertDescription>
          </Alert>
          <div className='mt-6 flex gap-3'>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            <Button variant='outline' onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error('Photo size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      let uploadedPhotoUrl = photoUrl;

      // If user selected a new photo, upload it
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('userId', user?.id || '');

        const response = await fetch(
          `${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/upload-profile-photo`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to upload photo');
        }

        const data = await response.json();
        uploadedPhotoUrl = data.photoUrl;
      }

      await updateProfile({
        display_name: displayName,
        gender: gender,
        photo_url: uploadedPhotoUrl,
      });

      setPhotoUrl(uploadedPhotoUrl);
      setPhotoFile(null);
      setPhotoPreview('');
      toast.success('Profile updated successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const userEmail = user?.email || 'guest@example.com';
  const currentDisplayName = user?.user_metadata?.display_name || userEmail.split('@')[0];
  const currentGender = user?.user_metadata?.gender || 'other';

  // Generate gender-specific avatar seed
  const getAvatarSeed = () => {
    if (currentGender === 'male') {
      return `male-${currentDisplayName}`;
    } else if (currentGender === 'female') {
      return `female-${currentDisplayName}`;
    }
    return currentDisplayName;
  };

  const displayPhotoUrl =
    photoPreview ||
    photoUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${getAvatarSeed()}`;

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />

      <div className='container py-6 mt-24 max-w-2xl'>
        <Card className='shadow-lg'>
          <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-6'>
            <div className='space-y-1.5'>
              <CardTitle className='text-2xl'>Profile Settings</CardTitle>
              <CardDescription>Manage your account information and preferences</CardDescription>
            </div>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => navigate('/dashboard')}
              className='-mr-2 -mt-2'
            >
              <X className='h-5 w-5' />
            </Button>
          </CardHeader>
          <CardContent className='space-y-6'>
            {/* Avatar Section with Upload */}
            <div className='flex items-center gap-6'>
              <div className='relative'>
                <Avatar className='h-24 w-24'>
                  <AvatarImage src={displayPhotoUrl} />
                  <AvatarFallback className='text-2xl'>
                    {currentDisplayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size='icon'
                  variant='secondary'
                  className='absolute bottom-0 right-0 h-8 w-8 rounded-full'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className='h-4 w-4' />
                </Button>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handlePhotoChange}
                  className='hidden'
                />
              </div>
              <div className='flex-1'>
                <h3 className='text-lg font-semibold'>{currentDisplayName}</h3>
                <p className='text-sm text-muted-foreground'>{userEmail}</p>
                <Button
                  variant='outline'
                  size='sm'
                  className='mt-2 flex items-center gap-2'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className='w-4 h-4' />
                  Upload Photo
                </Button>
              </div>
            </div>

            {/* Display Name */}
            <div className='space-y-2'>
              <Label htmlFor='displayName' className='flex items-center gap-2'>
                <User className='w-4 h-4' />
                Display Name
              </Label>
              <Input
                id='displayName'
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder='Enter your display name'
              />
              <p className='text-xs text-muted-foreground'>
                This is how other users will see you in rooms
              </p>
            </div>

            {/* Gender Selection */}
            <div className='space-y-2'>
              <Label htmlFor='gender'>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id='gender'>
                  <SelectValue placeholder='Select gender' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='male'>Male</SelectItem>
                  <SelectItem value='female'>Female</SelectItem>
                  <SelectItem value='other'>Other</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Your avatar will be customized based on your gender
              </p>
            </div>

            {/* Email (Read-only) */}
            <div className='space-y-2'>
              <Label htmlFor='email' className='flex items-center gap-2'>
                <Mail className='w-4 h-4' />
                Email
              </Label>
              <Input id='email' value={userEmail} disabled className='bg-muted' />
              <p className='text-xs text-muted-foreground'>Email cannot be changed</p>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-3 pt-4'>
              <Button onClick={handleSave} disabled={isLoading} className='flex items-center gap-2'>
                <Save className='w-4 h-4' />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant='outline' onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
