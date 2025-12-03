import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Save, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
    const { user, updateProfile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [displayName, setDisplayName] = useState('');
    const [gender, setGender] = useState('other');
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setDisplayName(user.user_metadata?.display_name || '');
            setGender(user.user_metadata?.gender || 'other');
            setPhotoUrl(user.user_metadata?.photo_url || '');
            setPhotoFile(null);
            setPhotoPreview('');
        }
    }, [isOpen, user]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
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
            onClose();
        } catch (error) {
            toast.error('Failed to update profile');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const userEmail = user?.email || 'guest@example.com';
    const currentDisplayName = user?.user_metadata?.display_name || userEmail.split('@')[0];

    // Generate gender-specific avatar seed based on current state (preview) or saved state
    const previewGender = gender;
    const previewName = displayName || currentDisplayName;

    const getAvatarSeed = () => {
        if (previewGender === 'male') {
            return `male-${previewName}`;
        } else if (previewGender === 'female') {
            return `female-${previewName}`;
        }
        return previewName;
    };

    const displayPhotoUrl =
        photoPreview ||
        photoUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${getAvatarSeed()}`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Avatar Section */}
                    <div className='flex items-center gap-6'>
                        <div className='relative'>
                            <Avatar className='h-20 w-20 border-2 border-border'>
                                <AvatarImage src={displayPhotoUrl} />
                                <AvatarFallback className='text-xl'>
                                    {previewName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <Button
                                size='icon'
                                variant='secondary'
                                className='absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md'
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className='h-3.5 w-3.5' />
                            </Button>
                            <input
                                ref={fileInputRef}
                                type='file'
                                accept='image/*'
                                onChange={handlePhotoChange}
                                className='hidden'
                            />
                        </div>
                        <div className='flex-1 space-y-2'>
                            <div className="text-sm font-medium">Profile Photo</div>
                            <div className="text-xs text-muted-foreground">
                                Upload a custom photo or use the generated avatar based on your gender.
                            </div>
                            <Button
                                variant='outline'
                                size='sm'
                                className='h-8 text-xs'
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className='w-3 h-3 mr-2' />
                                Upload New
                            </Button>
                        </div>
                    </div>

                    {/* Display Name */}
                    <div className='grid gap-2'>
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
                    </div>

                    {/* Gender Selection */}
                    <div className='grid gap-2'>
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
                    </div>

                    {/* Email (Read-only) */}
                    <div className='grid gap-2'>
                        <Label htmlFor='email' className='flex items-center gap-2'>
                            <Mail className='w-4 h-4' />
                            Email
                        </Label>
                        <Input id='email' value={userEmail} disabled className='bg-muted' />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Save className='w-4 h-4 mr-2 animate-spin' />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className='w-4 h-4 mr-2' />
                                Save Changes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProfileModal;
