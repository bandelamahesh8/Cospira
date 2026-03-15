import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface FullscreenEnforcement {
  isFullscreen: boolean;
  chances: number;
  keyChances: number;
  isBlocked: boolean;
  isKeyWarningVisible: boolean;
  pressedKey: string | null;
  requestFullscreen: () => void;
  resetChances: () => void;
  dismissKeyWarning: () => void;
}

export const useFullscreenEnforcement = (
  isActive: boolean,
  onKeyLimitExceeded?: (key: string) => void
): FullscreenEnforcement => {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [chances, setChances] = useState(3);
  const [keyChances, setKeyChances] = useState(3);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isKeyWarningVisible, setIsKeyWarningVisible] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const requestFullscreen = useCallback(() => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
        toast.error('Security Protocol Failure', {
          description:
            'Failed to engage fullscreen. Please enable it manually or check your browser settings.',
        });
      });
    }
  }, []);

  const dismissKeyWarning = useCallback(() => {
    setIsKeyWarningVisible(false);
    setPressedKey(null);
  }, []);

  const resetChances = useCallback(() => {
    setChances(3);
    setIsBlocked(false);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    if (!isActive) return;

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);

      if (!isFull && !isBlocked) {
        setChances((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setIsBlocked(true);
            return 0;
          }
          return next;
        });

        toast.warning('Security Alert: Connection Exposed', {
          description: 'You have exited the secure fullscreen environment. Re-engage immediately.',
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isActive, isBlocked]);

  // Listen for special keys
  useEffect(() => {
    if (!isActive || isBlocked) return;

    let warningTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Extensive list of system/screenshot keys
      const systemKeys = [
        'Alt',
        'Meta',
        'PrintScreen',
        'Tab',
        'ContextMenu',
        'Control',
        'Shift',
        'Escape',
        'OS',
      ];
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44 || e.key === 'Snapshot';
      const isWinShiftS = e.metaKey && e.shiftKey && e.key === 'S';
      const isAltPrtSc = e.altKey && isPrintScreen;

      if (
        systemKeys.includes(e.key) ||
        isPrintScreen ||
        isWinShiftS ||
        isAltPrtSc ||
        (e.ctrlKey && e.key === 't') ||
        (e.ctrlKey && e.key === 'n')
      ) {
        const keyLabel = isWinShiftS ? 'Win+Shift+S' : e.key || 'System Key';
        setPressedKey(keyLabel);
        setIsKeyWarningVisible(true);

        setKeyChances((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            onKeyLimitExceeded?.(keyLabel);
            return 0;
          }
          return next;
        });

        if (warningTimer) clearTimeout(warningTimer);

        warningTimer = setTimeout(() => {
          setIsKeyWarningVisible(false);
          setPressedKey(null);
        }, 3000);

        toast.error('Security Breach Warning', {
          description: `Accessing system functions (${keyLabel}) is restricted. ${keyChances > 1 ? `Warnings remaining: ${keyChances - 1}` : 'Security protocol notified.'}`,
          duration: 4000,
        });

        // Prevention: Try to stop propagation
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (warningTimer) clearTimeout(warningTimer);
    };
  }, [isActive, isBlocked, keyChances, onKeyLimitExceeded]);

  // Enhanced focus/blur detection to catch app switching (gestures)
  useEffect(() => {
    if (!isActive || isBlocked) return;

    const handleBlur = () => {
      if (!isBlocked) {
        setChances((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setIsBlocked(true);
            return 0;
          }
          return next;
        });

        toast.warning('Security Alert: App Switched', {
          description: 'Context switch detected. Multitasking is restricted in this mode.',
        });
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, isBlocked]);

  return {
    isFullscreen,
    chances,
    keyChances,
    isBlocked: isActive && (!isFullscreen || isBlocked),
    isKeyWarningVisible,
    pressedKey,
    requestFullscreen,
    resetChances,
    dismissKeyWarning,
  };
};
