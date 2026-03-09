import React from 'react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Zap } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getAllModes, getModeConfig, type RoomMode } from '@/services/RoomIntelligence';

interface RoomModeIndicatorProps {
  roomId: string;
  isHost: boolean;
}

/**
 * Room Mode Indicator Component
 * Shows current room mode and allows mode changes (host only)
 */
export const RoomModeIndicator: React.FC<RoomModeIndicatorProps> = ({ roomId, isHost }) => {
  const { roomMode, applyRoomMode } = useWebSocket();

  const currentMode = (roomMode || 'casual') as RoomMode;
  const config = getModeConfig(currentMode);
  const availableModes = getAllModes();

  const handleModeChange = async (mode: RoomMode) => {
    if (!isHost) return;
    await applyRoomMode(mode, roomId);
  };

  const TriggerButton = ({ isInteractive }: { isInteractive: boolean }) => (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      disabled={!isInteractive}
      className={`
            relative flex items-center gap-3 pl-3 pr-4 py-2 rounded-2xl border transition-all overflow-hidden group
            ${
              isInteractive
                ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer'
                : 'bg-white/5 border-white/5 cursor-default'
            }
        `}
    >
      {/* Glow effect for host */}
      {isInteractive && (
        <div className='absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
      )}

      <div className='relative z-10 flex items-center gap-3'>
        <span className='text-lg filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'>
          {config.icon}
        </span>
        <div className='flex flex-col items-start gap-0.5'>
          <span className='text-[9px] font-bold uppercase tracking-widest text-white/40'>
            Current Protocol
          </span>
          <span className='text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5'>
            {config.label}
            {isInteractive && (
              <ChevronDown className='w-3 h-3 text-white/30 group-hover:text-white transition-colors' />
            )}
          </span>
        </div>
      </div>
    </motion.button>
  );

  if (!isHost) {
    return <TriggerButton isInteractive={false} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <TriggerButton isInteractive={true} />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className='w-72 bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 p-2 rounded-[1.5rem] shadow-2xl z-[200]'
        align='start'
        sideOffset={8}
      >
        <div className='px-4 py-3 border-b border-white/5 mb-2'>
          <div className='flex items-center gap-2 text-primary mb-1'>
            <Zap className='w-3 h-3' />
            <span className='text-[10px] font-black uppercase tracking-widest'>
              Protocol Override
            </span>
          </div>
          <p className='text-[10px] text-white/40 leading-relaxed'>
            Select a room mode to optimize UI and AI behavior for your session type.
          </p>
        </div>

        <div className='space-y-1 max-h-[400px] overflow-y-auto px-1 custom-scrollbar'>
          {availableModes.map((mode) => {
            const modeConfig = getModeConfig(mode);
            const isActive = mode === currentMode;

            return (
              <DropdownMenuItem
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`
                  relative overflow-hidden rounded-xl p-3 cursor-pointer transition-all outline-none group
                  ${
                    isActive
                      ? 'bg-primary/20 border border-primary/30'
                      : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                  }
                `}
              >
                <div className='flex items-start gap-3 relative z-10'>
                  <div
                    className={`
                    w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0
                    ${isActive ? 'bg-primary/20 text-white' : 'bg-white/5 text-white/50 group-hover:text-white group-hover:bg-white/10'}
                  `}
                  >
                    {modeConfig.icon}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between mb-0.5'>
                      <span
                        className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}
                      >
                        {modeConfig.label}
                      </span>
                      {isActive && (
                        <div className='w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]' />
                      )}
                    </div>
                    <p
                      className={`text-[10px] leading-relaxed line-clamp-2 ${isActive ? 'text-primary-foreground/80' : 'text-white/40 group-hover:text-white/60'}`}
                    >
                      {modeConfig.description}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoomModeIndicator;
