import { useState, useEffect } from 'react';

export interface NetworkInformation extends EventTarget {
    readonly downlink: number;
    readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
    readonly rtt: number;
    readonly saveData: boolean;
    onchange: EventListener | null;
    addEventListener: (type: string, listener: EventListener) => void;
    removeEventListener: (type: string, listener: EventListener) => void;
}

export type NetworkQuality = 'good' | 'fair' | 'poor' | 'offline';

interface NetworkStats {
    quality: NetworkQuality;
    downlink: number;
    rtt: number;
    effectiveType: string;
    isOnline: boolean;
    recommendation: string;
}

export const useNetworkQuality = (): NetworkStats => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [stats, setStats] = useState<NetworkStats>({
        quality: 'good',
        downlink: 10,
        rtt: 0,
        effectiveType: '4g',
        isOnline: true,
        recommendation: 'Optimal for HD Video'
    });

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

        const updateConnection = () => {
            if (!isOnline) {
                setStats(prev => ({ ...prev, quality: 'offline', isOnline: false, recommendation: 'Check your internet connection' }));
                return;
            }

            if (!conn) {
                setStats(prev => ({ ...prev, quality: 'good', isOnline: true }));
                return;
            }

            const downlink = conn.downlink || 0;
            const rtt = conn.rtt || 0;
            const effectiveType = conn.effectiveType || '4g';
            
            let quality: NetworkQuality = 'good';
            let recommendation = 'Optimal for HD Video';

            if (rtt > 500 || downlink < 1) {
                quality = 'poor';
                recommendation = 'Audio-only recommended. Video may freeze.';
            } else if (rtt > 150 || downlink < 5) {
                quality = 'fair';
                recommendation = 'Standard definition video recommended.';
            }

            setStats({
                quality,
                downlink,
                rtt,
                effectiveType,
                isOnline: true,
                recommendation
            });
        };

        if (conn) {
            updateConnection();
            conn.addEventListener('change', updateConnection);
            return () => conn.removeEventListener('change', updateConnection);
        } else {
            // Fallback for browsers without Network Information API
            setStats(prev => ({ ...prev, isOnline }));
        }
    }, [isOnline]);

    return stats;
};
