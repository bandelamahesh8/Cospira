import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProfilePopup } from '@/components/profile/ProfilePopup';

interface TopBarProps {
  currentView?: 'live' | 'analytics';
  onViewChange?: (view: 'live' | 'analytics') => void;
  onViewActivity?: () => void;
}

export const TopBar = ({ currentView = 'live', onViewChange, onViewActivity }: TopBarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <>
      <div className='h-full px-5 flex items-center justify-between'>
        {/* LEFT - Logo & Mode */}
        <div className='flex items-center gap-6'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => navigate(-1)}
              className='w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors'
            >
              <ArrowLeft className='w-4 h-4 text-white/60' />
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className='text-xl font-black text-white tracking-tight hover:text-white/80 transition-colors'
            >
              Cospira
            </button>
          </div>

          <div className='h-6 w-px bg-white/10 hidden md:block' />
        </div>

        {/* RIGHT - View Toggle & User */}
        <div className='flex items-center gap-4'>
          {/* View Toggle */}
          <div className='h-9 p-1 bg-white/5 border border-white/10 rounded-lg flex items-center hidden md:flex'>
            <button
              onClick={() => onViewChange?.('live')}
              className={`h-full px-3 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'live' ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white'}`}
            >
              Live Ops
            </button>
            <button
              onClick={() => onViewChange?.('analytics')}
              className={`h-full px-3 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'analytics' ? 'bg-[#00c2ff] text-black shadow-[0_0_10px_rgba(0,194,255,0.3)]' : 'text-white/40 hover:text-white'}`}
            >
              Intel
            </button>
          </div>

          <div className='h-6 w-px bg-white/10 hidden md:block' />

          {/* User Menu */}
          <Popover>
            <PopoverTrigger asChild>
              <button className='w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform'>
                <img
                  src={
                    user?.user_metadata?.photo_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`
                  }
                  alt='Profile'
                  className='w-full h-full object-cover'
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className='bg-[#0A0A0A] border-white/10 p-2 w-auto mr-4'
              align='end'
              sideOffset={8}
            >
              <ProfilePopup onViewActivity={onViewActivity} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
};
