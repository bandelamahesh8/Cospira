import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string; // Optional custom URL if we have it in the future
  gender?: string; // For gender-variant dicebear avatars
  className?: string;
  fallbackClassName?: string;
  showFallbackIcon?: boolean; // Whether to show a User icon instead of initials
  seed?: string; // Explicit seed for deterministic avatars (e.g. userId)
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  gender,
  className = '',
  fallbackClassName = '',
  showFallbackIcon = false,
  seed,
}) => {
  // Ensure name is safe
  const safeName = name || 'Unknown';

  // Generate gender-specific avatar seed
  // Use the explicit seed prop if provided, otherwise derived from name/gender
  let avatarSeed = seed || safeName;

  if (!seed) {
    const g = gender?.toLowerCase();
    if (g === 'male') {
      avatarSeed = `male-${safeName}`;
    } else if (g === 'female') {
      avatarSeed = `female-${safeName}`;
    }
  }

  // Generate initials
  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Avatar className={className}>
      <AvatarImage
        src={
          avatarUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`
        }
        alt={`${safeName}'s avatar`}
      />
      <AvatarFallback className={fallbackClassName}>
        {showFallbackIcon ? (
          <User className='w-1/2 h-1/2' aria-hidden='true' />
        ) : (
          getInitials(safeName)
        )}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
