import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Maximize2, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UltraSecureBlockerProps {
  isVisible: boolean;
  chances: number;
  onRequestFullscreen: () => void;
}

export const UltraSecureBlocker: React.FC<UltraSecureBlockerProps> = ({
  isVisible,
  chances,
  onRequestFullscreen,
}) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black"
      >
        {/* Security Scan Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='white' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E")` 
          }}
        />
        
        {/* Moving Laser Line */}
        <motion.div 
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 right-0 h-px bg-red-500/30 blur-sm pointer-events-none"
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative max-w-lg w-full mx-4 p-10 rounded-[2.5rem] bg-gradient-to-b from-red-950/20 to-black/80 border border-red-500/20 shadow-[0_0_100px_rgba(239,68,68,0.15)] text-center"
        >
          {/* HUD Brackets */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-red-500/40 rounded-tl-xl" />
          <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-red-500/40 rounded-tr-xl" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-red-500/40 rounded-bl-xl" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-red-500/40 rounded-br-xl" />

          <div className="mb-8 relative flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-red-500 animate-pulse" />
            </div>
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-4">
            Security Protocol Breach
          </h1>
          
          <p className="text-white/50 font-medium mb-8 text-sm leading-relaxed">
            The Secure environment requires a persistent fullscreen connection. 
            External window interactions have been locked to prevent data leaks.
          </p>

          <div className="flex flex-col gap-6 p-6 rounded-2xl bg-white/[0.03] border border-white/5 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Remaining Chances
                </span>
              </div>
              <span className={`text-xl font-mono font-black ${chances <= 1 ? 'text-red-500' : 'text-orange-400'}`}>
                {chances} / 3
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(chances / 3) * 100}%` }}
                className={`h-full ${chances <= 1 ? 'bg-red-500' : 'bg-orange-500'}`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={onRequestFullscreen}
              className="w-full h-14 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.2)]"
            >
              <Maximize2 className="w-4 h-4" />
              Re-engage Fullscreen
            </Button>
            
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
              Protocol UID: {Math.random().toString(36).substring(7).toUpperCase()}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
