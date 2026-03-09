import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Wifi, WifiOff, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from './UserMenu';
import { CospiraLogo } from '@/components/logo/CospiraLogo';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TimeDisplay } from './TimeDisplay';

interface NavbarProps {
  isFixed?: boolean;
}

const Navbar = ({ isFixed = true }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isConnected, isAiActive, toggleAiAssist } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: 'Live Connect', href: '/connect' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/projects' },
  ];

  const handleLinkClick = (href: string) => {
    setIsOpen(false);
    navigate(href);
  };

  if (location.pathname === '/') return null;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`${isFixed ? 'fixed top-0 left-0 w-full' : 'relative w-full'} z-[100] transition-all duration-300 ease-ultra h-16 flex items-center
        bg-[#05070a]/80 backdrop-blur-md border-b border-white/5
      `}
    >
      <div className='w-full px-6 md:px-10 lg:px-12'>
        <div className='flex items-center justify-between'>
          {/* LEFT: Branding & Signal */}
          <div className='flex items-center gap-2 md:gap-4'>
            <Link
              to='/'
              className='flex items-center gap-3 group opacity-90 hover:opacity-100 transition-opacity'
            >
              <CospiraLogo
                size={32}
                className='text-zinc-100 group-hover:text-white transition-colors'
              />

              <span
                className={`font-bold tracking-tight text-white transition-all duration-300 text-sm md:text-base hidden md:block uppercase italic tracking-tighter`}
              >
                Cospira
              </span>
            </Link>

            {/* REAL-TIME SIGNAL LOGO */}
            <div className='flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 ml-2 md:ml-4 group/status relative'>
              <div className='relative'>
                {isConnected ? (
                  <>
                    <Wifi className='w-3.5 h-3.5 text-emerald-400' />
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className='absolute inset-0 bg-emerald-400 rounded-full blur-[2px] opacity-30'
                    />
                  </>
                ) : (
                  <WifiOff className='w-3.5 h-3.5 text-red-400' />
                )}
              </div>
              <div className='flex flex-col'>
                <div className='flex items-center gap-1.5'>
                  <span
                    className={`text-[8px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {isConnected ? 'Signal Active' : 'Offline'}
                  </span>
                  <div className='h-1 w-1 rounded-full bg-white/20' />
                  <span className='text-[8px] font-black uppercase tracking-widest text-indigo-400'>
                    Live Ops
                  </span>
                </div>
                <span className='text-[7px] text-white/30 font-bold uppercase tracking-[0.2em] hidden sm:block'>
                  Real-time Fetching
                </span>
              </div>

              {/* Frequency / Intel Hover Detail */}
              <div className='absolute top-full left-0 mt-2 px-3 py-1.5 bg-[#0A0C14] border border-white/10 rounded-lg opacity-0 group-hover/status:opacity-100 transition-opacity pointer-events-none z-50 min-w-[120px]'>
                <div className='flex items-center justify-between gap-4'>
                  <span className='text-[8px] font-bold text-white/40 uppercase'>Frequency</span>
                  <span className='text-[8px] font-black text-emerald-400'>2.4ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Menu & Actions */}
          <div className='flex items-center gap-4'>
            {/* Activity Pulse / Frequency */}
            {isConnected && (
              <div className='hidden lg:flex items-center gap-3'>
                <button
                  onClick={toggleAiAssist}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all duration-500 ${isAiActive ? 'bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <Activity
                    className={`w-3 h-3 ${isAiActive ? 'text-indigo-400' : 'text-emerald-400'} animate-pulse`}
                  />
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider ${isAiActive ? 'text-indigo-400' : 'text-indigo-400/60'}`}
                  >
                    {isAiActive ? 'AI Active' : 'AI Assist'}
                  </span>
                </button>
                <div className='h-6 w-[1px] bg-white/5' />
                <TimeDisplay />
              </div>
            )}

            {/* Desktop Nav */}
            <div className='hidden md:flex items-center gap-6'>
              {user ? (
                <UserMenu />
              ) : (
                <Link
                  to='/auth'
                  className='text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors'
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className='md:hidden p-2 -mr-2 text-white/60 hover:text-white transition-colors'
            >
              {isOpen ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className='md:hidden overflow-hidden'
            >
              <div className='pt-4 pb-6 flex flex-col gap-2'>
                {user && (
                  <div className='px-2 pb-4 mb-2 border-b border-white/5'>
                    <p className='text-sm font-bold text-white'>{user.email}</p>
                    <p className='text-xs text-white/40'>Logged in</p>
                  </div>
                )}

                {navLinks.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleLinkClick(item.href)}
                    className='text-left px-4 py-3 rounded-xl hover:bg-white/5 text-sm font-bold text-white/80 hover:text-white transition-colors'
                  >
                    {item.label}
                  </button>
                ))}

                <div className='h-px bg-white/5 my-2 mx-4' />

                {user ? (
                  <button
                    onClick={signOut}
                    className='flex items-center gap-2 px-4 py-3 text-red-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors'
                  >
                    <LogOut className='w-4 h-4' /> Sign Out
                  </button>
                ) : (
                  <Link
                    to='/auth'
                    className='block text-center mx-4 mt-2 px-4 py-3 bg-white text-black font-bold uppercase text-xs tracking-widest rounded-xl'
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
