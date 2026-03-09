import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { RoomMode } from '@/services/RoomIntelligence';
import { Gamepad2, Briefcase, Shield, Zap } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ModeConfig {
  id: RoomMode;
  label: string;
  icon: React.ElementType;
  emoji: string;
  features: string;
  color: string;
  glowColor: string;
  description: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'fun',
    label: 'Fun Mode',
    icon: Gamepad2,
    emoji: '🎮',
    features: 'Games • Casual • Chill',
    color: '#7c3aed',
    glowColor: 'rgba(124, 58, 237, 0.4)',
    description: 'Perfect for gaming sessions and casual hangouts',
  },
  {
    id: 'professional',
    label: 'Professional',
    icon: Briefcase,
    emoji: '💼',
    features: 'Work • AI Summary • Focus',
    color: '#00c2ff',
    glowColor: 'rgba(0, 194, 255, 0.4)',
    description: 'Optimized for productive meetings and collaboration',
  },
  {
    id: 'ultra',
    label: 'Ultra Security',
    icon: Shield,
    emoji: '🔐',
    features: 'Encrypted • Restricted • Secure',
    color: '#ff003c',
    glowColor: 'rgba(255, 0, 60, 0.4)',
    description: 'Maximum security with end-to-end encryption',
  },
  {
    id: 'mixed',
    label: 'Mixed Mode',
    icon: Zap,
    emoji: '⚡',
    features: 'Games + AI + Power',
    color: '#9d4edd',
    glowColor: 'rgba(157, 78, 221, 0.4)',
    description: 'Best of all worlds - flexibility and features',
  },
];

interface RoomModeSelectorProps {
  selectedMode?: RoomMode;
  onModeChange?: (mode: RoomMode) => void;
  className?: string;
}

export const RoomModeSelector: React.FC<RoomModeSelectorProps> = ({
  selectedMode: controlledMode,
  onModeChange,
  className = '',
}) => {
  const { playClick, playHover } = useSoundEffects();
  const [activeMode, setActiveMode] = useState<RoomMode>(controlledMode || 'professional');
  const [showUltraAlert, setShowUltraAlert] = useState(false);
  const [isFlickering, setIsFlickering] = useState(false);

  // Sync with controlled mode
  useEffect(() => {
    if (controlledMode) {
      setActiveMode(controlledMode);
    }
  }, [controlledMode]);

  // Load from localStorage on mount
  useEffect(() => {
    if (!controlledMode) {
      const saved = localStorage.getItem('defaultRoomMode') as RoomMode;
      if (saved && MODES.find((m) => m.id === saved)) {
        setActiveMode(saved);
        applyTheme(saved);
      }
    }
  }, [controlledMode]);

  const applyTheme = (mode: RoomMode) => {
    const modeConfig = MODES.find((m) => m.id === mode);
    if (!modeConfig) return;

    const root = document.documentElement;
    root.style.setProperty('--mode-accent', modeConfig.color);
    root.style.setProperty('--mode-glow', modeConfig.glowColor);

    // Apply or remove ultra mode class
    if (mode === 'ultra') {
      document.body.classList.add('ultra-mode');
    } else {
      document.body.classList.remove('ultra-mode');
    }
  };

  const handleModeClick = (mode: RoomMode) => {
    playClick();

    // Ultra Security Mode - Cinematic Effect
    if (mode === 'ultra') {
      // Screen flicker
      setIsFlickering(true);
      setTimeout(() => setIsFlickering(false), 200);

      // Show alert after flicker
      setTimeout(() => {
        setShowUltraAlert(true);
      }, 250);
    }

    setActiveMode(mode);
    applyTheme(mode);
    localStorage.setItem('defaultRoomMode', mode);
    onModeChange?.(mode);
  };

  return (
    <>
      <div className={`mode-selector-wrapper ${className}`}>
        <h3 className='text-white font-semibold text-lg mb-4 tracking-tight'>Select Room Mode</h3>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;

            return (
              <motion.div
                key={mode.id}
                className='mode-card-container'
                onHoverStart={() => playHover()}
                whileHover={{
                  y: -10,
                  rotateX: 8,
                  rotateY: -6,
                  scale: 1.03,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: 1000,
                }}
              >
                <div
                  className={`mode-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleModeClick(mode.id)}
                  style={
                    {
                      '--mode-color': mode.color,
                      '--mode-glow-color': mode.glowColor,
                    } as React.CSSProperties
                  }
                >
                  {/* Glow Layer */}
                  <div className='mode-glow' />

                  {/* Content */}
                  <div className='mode-content'>
                    <div className='flex items-center gap-3 mb-2'>
                      <span className='text-3xl'>{mode.emoji}</span>
                      <Icon className='w-6 h-6 text-white/80' />
                    </div>
                    <h4 className='text-white font-bold text-lg mb-1'>{mode.label}</h4>
                    <p className='text-white/60 text-sm font-medium mb-2'>{mode.features}</p>
                    <p className='text-white/40 text-xs leading-relaxed'>{mode.description}</p>
                  </div>

                  {/* Active Indicator */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className='active-indicator'
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <div className='w-2 h-2 rounded-full bg-white' />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Screen Flicker Effect */}
      <AnimatePresence>
        {isFlickering && (
          <motion.div
            className='fixed inset-0 bg-black z-[9999] pointer-events-none'
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Ultra Security Alert */}
      <AlertDialog open={showUltraAlert} onOpenChange={setShowUltraAlert}>
        <AlertDialogContent className='bg-[#0a0000] border-2 border-red-500/50 shadow-[0_0_50px_rgba(255,0,60,0.5)]'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-500 text-2xl font-black flex items-center gap-3'>
              <Shield className='w-8 h-8 animate-pulse' />
              ⚠️ ULTRA SECURITY MODE ACTIVATED
            </AlertDialogTitle>
            <AlertDialogDescription className='text-white/80 text-base leading-relaxed'>
              Maximum security protocols enabled. All communications will be end-to-end encrypted.
              Sensitive features restricted. Watermarks applied.
              <div className='mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg'>
                <p className='text-red-400 text-sm font-mono'>
                  [CLASSIFIED] Security Level: CRITICAL
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='flex justify-end mt-4'>
            <motion.button
              className='px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors'
              onClick={() => setShowUltraAlert(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ACKNOWLEDGED
            </motion.button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
