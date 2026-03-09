import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DeviceInfo {
  type: DeviceType;
  width: number;
  height: number;
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
}

/**
 * Stable device type detection hook
 * Prevents infinite loops by using stable breakpoints and state caching
 * Uses container-based detection (not just media queries)
 */
export const useDeviceType = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    return detectDevice();
  });

  const prevTypeRef = useRef<DeviceType>(deviceInfo.type);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  /**
   * Detect device type based on multiple factors
   */
  const detectDevice = useCallback((): DeviceInfo => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    const orientation = width > height ? 'landscape' : 'portrait';

    // Stable breakpoints (no rapid switching)
    // Mobile: < 640px
    // Tablet: 640px - 1024px
    // Desktop: > 1024px
    let type: DeviceType = 'desktop';
    if (width < 640) {
      type = 'mobile';
    } else if (width < 1024) {
      type = 'tablet';
    } else {
      type = 'desktop';
    }

    return {
      type,
      width,
      height,
      isTouchDevice: isTouchDevice(),
      orientation,
    };
  }, []);

  /**
   * Safe state update with debouncing to prevent rapid changes
   */
  const updateDeviceType = useCallback(() => {
    // Debounce resize events (100ms minimum between updates)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const newInfo = detectDevice();

      // Only update if device type actually changed
      if (newInfo.type !== prevTypeRef.current) {
        logger.info(
          `[useDeviceType] Device type changed: ${prevTypeRef.current} → ${newInfo.type}`
        );
        prevTypeRef.current = newInfo.type;
        setDeviceInfo(newInfo);
      } else if (newInfo.width !== deviceInfo.width || newInfo.height !== deviceInfo.height) {
        // Update dimensions even if type didn't change
        setDeviceInfo(newInfo);
      }

      debounceTimerRef.current = null;
    }, 100);
  }, [detectDevice, deviceInfo.width, deviceInfo.height]);

  /**
   * Setup window resize listener
   */
  useEffect(() => {
    window.addEventListener('resize', updateDeviceType);
    window.addEventListener('orientationchange', updateDeviceType);

    return () => {
      window.removeEventListener('resize', updateDeviceType);
      window.removeEventListener('orientationchange', updateDeviceType);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [updateDeviceType]);

  /**
   * Setup ResizeObserver for container-based detection (if needed)
   */
  useEffect(() => {
    const viewport = document.documentElement;
    try {
      resizeObserverRef.current = new ResizeObserver(() => {
        updateDeviceType();
      });
      resizeObserverRef.current.observe(viewport);
    } catch (e) {
      // ResizeObserver not supported, falls back to window resize listener
      logger.warn('[useDeviceType] ResizeObserver not supported');
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [updateDeviceType]);

  return deviceInfo;
};

/**
 * Simple hook to check if current device is mobile
 */
export const useIsMobileDevice = () => {
  const { type } = useDeviceType();
  return type === 'mobile';
};

/**
 * Hook to check if current device is tablet
 */
export const useIsTablet = () => {
  const { type } = useDeviceType();
  return type === 'tablet';
};

/**
 * Hook to check if current device is desktop
 */
export const useIsDesktop = () => {
  const { type } = useDeviceType();
  return type === 'desktop';
};
