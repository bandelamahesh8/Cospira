import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Signal, SignalMedium, SignalLow } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface NetworkInformation extends EventTarget {
    readonly downlink: number;
    readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
    readonly rtt: number;
    readonly saveData: boolean;
    onchange: EventListener | null;
    addEventListener: (type: string, listener: EventListener) => void;
    removeEventListener: (type: string, listener: EventListener) => void;
}

const NetworkQualityIndicator: React.FC = () => {
    const [connection, setConnection] = useState<NetworkInformation | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const nav = navigator as Navigator & {
            connection?: NetworkInformation;
            mozConnection?: NetworkInformation;
            webkitConnection?: NetworkInformation;
        };
        const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

        if (conn) {
            setConnection(conn);
            const updateConnection = () => {
                setConnection({ ...conn }); // Force update
            };
            conn.addEventListener('change', updateConnection);
            return () => conn.removeEventListener('change', updateConnection);
        }
    }, []);

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

    if (!isOnline) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className='flex items-center justify-center h-8 w-8 rounded-full bg-red-500/10 text-red-500'>
                            <WifiOff className='h-4 w-4' />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>You are offline</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (!connection) {
        // Fallback if API not supported
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className='flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10 text-green-500'>
                            <Wifi className='h-4 w-4' />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Online (Details unavailable)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    const getQualityIcon = () => {
        if (connection.rtt > 500 || connection.downlink < 1) {
            return <SignalLow className='h-4 w-4 text-red-500' />;
        }
        if (connection.rtt > 150 || connection.downlink < 5) {
            return <SignalMedium className='h-4 w-4 text-yellow-500' />;
        }
        return <Signal className='h-4 w-4 text-green-500' />;
    };

    const getQualityText = () => {
        if (connection.rtt > 500 || connection.downlink < 1) return 'Poor Connection';
        if (connection.rtt > 150 || connection.downlink < 5) return 'Fair Connection';
        return 'Good Connection';
    };

    const getQualityColor = () => {
        if (connection.rtt > 500 || connection.downlink < 1) return 'bg-red-500/10';
        if (connection.rtt > 150 || connection.downlink < 5) return 'bg-yellow-500/10';
        return 'bg-green-500/10';
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`flex items-center justify-center h-8 w-8 rounded-full ${getQualityColor()} cursor-help transition-colors`}>
                        {getQualityIcon()}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className='text-xs space-y-1'>
                        <p className='font-semibold'>{getQualityText()}</p>
                        <p>Type: {connection.effectiveType?.toUpperCase() || 'UNKNOWN'}</p>
                        <p>Downlink: ~{connection.downlink || 0} Mbps</p>
                        <p>RTT: {connection.rtt || 0} ms</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default NetworkQualityIndicator;
