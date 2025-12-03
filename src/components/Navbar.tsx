import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileModal from './ProfileModal';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const userEmail = user?.email || 'guest@example.com';
  const displayName = user?.user_metadata?.display_name || userEmail.split('@')[0];

  // Generate avatar based on user's display name
  const photoUrl = user?.user_metadata?.photo_url;

  // Use uploaded photo or generate one based on display name
  const displayPhotoUrl = photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

  return (
    <nav className='fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40'>
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between h-16'>
          <div className='flex items-center'>
            <Link to='/' className='flex items-center gap-2 group'>
              <div className='w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center transform transition-transform group-hover:scale-110'>
                <Shield className='w-6 h-6 text-background' />
              </div>
              <span className='text-xl font-bold glow-text'>ShareUs</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center space-x-8'>
            <Link to='/' className='text-foreground/80 hover:text-foreground transition-colors'>
              Home
            </Link>
            <Link to='/about' className='text-foreground/80 hover:text-foreground transition-colors'>
              About
            </Link>
          </div>

          {/* Desktop Auth Buttons */}
          <div className='hidden md:flex items-center space-x-4'>
            {user ? (
              <>
                <Button
                  variant="ghost"
                  className="relative h-10 w-auto rounded-full hover:bg-transparent px-2 flex items-center gap-2"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <Avatar className='h-8 w-8 border border-zinc-700 hover:border-primary/50 transition-colors cursor-pointer'>
                    <AvatarImage src={displayPhotoUrl} alt={displayName} />
                    <AvatarFallback className='bg-primary/10 text-primary font-medium'>
                      {displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden lg:block">{displayName}</span>
                </Button>

                <AnimatedButton variant='outline' onClick={signOut} size='sm'>
                  <LogOut className='w-4 h-4 mr-2' />
                  Logout
                </AnimatedButton>
              </>
            ) : (
              <>
                <AnimatedButton variant='ghost' asChild>
                  <Link to='/auth'>Login</Link>
                </AnimatedButton>
                <AnimatedButton className='glow-button' asChild>
                  <Link to='/auth'>Get Started</Link>
                </AnimatedButton>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden flex items-center'>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className='text-foreground p-2'
            >
              {isOpen ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className='md:hidden bg-background/95 backdrop-blur-sm'>
            <div className='px-2 pt-2 pb-3 space-y-1'>
              <Link
                to='/'
                className='block px-3 py-2 rounded-md text-base font-medium text-foreground'
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                to='/about'
                className='block px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground'
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              {user && (
                <>
                  <Link
                    to='/dashboard'
                    className='block px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground'
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    className='block w-full text-left px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground'
                    onClick={() => {
                      setIsOpen(false);
                      setIsProfileOpen(true);
                    }}
                  >
                    Profile
                  </button>
                </>
              )}

              {user ? (
                <>
                  <div className='px-3 py-2 text-sm text-muted-foreground border-t mt-4'>
                    {user.email}
                  </div>
                  <AnimatedButton
                    className='w-full mt-2'
                    variant='outline'
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className='w-4 h-4 mr-2' />
                    Logout
                  </AnimatedButton>
                </>
              ) : (
                <>
                  <AnimatedButton className='w-full mt-4' variant='ghost' asChild>
                    <Link to='/auth' onClick={() => setIsOpen(false)}>
                      Login
                    </Link>
                  </AnimatedButton>
                  <AnimatedButton className='w-full mt-2 glow-button' asChild>
                    <Link to='/auth' onClick={() => setIsOpen(false)}>
                      Get Started
                    </Link>
                  </AnimatedButton>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </nav>
  );
};

export default Navbar;
