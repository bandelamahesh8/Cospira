import { LogOut, ShieldAlert, FastForward } from 'lucide-react'; // Added FastForward
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SocialRoomControlsProps {
  onReport: () => void;
  onDisconnect: () => void;
  onSkip?: () => void;
}

const SocialRoomControls: React.FC<SocialRoomControlsProps> = ({
  onReport,
  onDisconnect,
  onSkip,
}) => {
  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.5 }}
        className='absolute bottom-8 left-8 flex items-center gap-4 z-50 pointer-events-auto'
      >
        {/* Disconnect Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDisconnect}
              className='group relative w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-xl border border-red-500/30 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-all duration-300'
            >
              <div className='absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity' />
              <div className='absolute -inset-full bg-gradient-to-r from-transparent via-red-500/10 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700' />

              <LogOut className='w-6 h-6 text-red-500 relative z-10 group-hover:scale-110 transition-transform' />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent
            side='right'
            sideOffset={20}
            className='bg-black/90 border border-red-500/20 text-white p-3 rounded-xl shadow-2xl backdrop-blur-xl'
          >
            <div className='flex flex-col'>
              <span className='text-[10px] uppercase font-black tracking-widest text-red-500 mb-0.5'>
                Emergency
              </span>
              <span className='text-xs font-bold font-mono'>SEVER CONNECTION</span>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* SKIP Control */}
        {onSkip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSkip}
                className='group relative w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-xl border border-emerald-500/30 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_50px_rgba(16,185,129,0.4)] transition-all duration-300'
              >
                <div className='absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity' />
                <FastForward className='w-6 h-6 text-emerald-500 relative z-10 group-hover:translate-x-0.5 transition-transform' />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent
              side='right'
              sideOffset={20}
              className='bg-black/90 border border-emerald-500/20 text-white p-3 rounded-xl shadow-2xl backdrop-blur-xl'
            >
              <div className='flex flex-col'>
                <span className='text-[10px] uppercase font-black tracking-widest text-emerald-500 mb-0.5'>
                  Next Match
                </span>
                <span className='text-xs font-bold font-mono'>INITIATE JUMP</span>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Report Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onReport}
              className='group relative w-12 h-12 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl hover:border-amber-500/50 transition-all duration-300'
            >
              <div className='absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity' />
              <ShieldAlert className='w-5 h-5 text-white/40 group-hover:text-amber-500 transition-colors' />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent
            side='right'
            sideOffset={20}
            className='bg-black/90 border border-white/10 text-white p-3 rounded-xl shadow-2xl backdrop-blur-xl'
          >
            <div className='flex flex-col'>
              <span className='text-[10px] uppercase font-black tracking-widest text-white/50 mb-0.5'>
                Safety Protocol
              </span>
              <span className='text-xs font-bold font-mono'>REPORT VIOLATION</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
};

export default SocialRoomControls;
