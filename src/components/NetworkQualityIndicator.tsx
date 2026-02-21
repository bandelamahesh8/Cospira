import React from 'react';
import { WifiOff, Signal, SignalMedium, SignalLow } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';

const NetworkQualityIndicator: React.FC = () => {
    const { quality, downlink, rtt, effectiveType, isOnline, recommendation } = useNetworkQuality();

    if (!isOnline) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className='flex items-center justify-center h-8 w-8 rounded-full bg-red-500/10 text-red-500'>
                            <WifiOff className='h-4 w-4' />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-black/90 border-red-500/30 text-white">
                        <p className="font-bold">You are offline</p>
                        <p className="text-[10px] opacity-70">Check your internet connection</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    const getIcon = () => {
        switch (quality) {
            case 'poor': return <SignalLow className='h-4 w-4 text-red-500' />;
            case 'fair': return <SignalMedium className='h-4 w-4 text-yellow-500' />;
            default: return <Signal className='h-4 w-4 text-green-500' />;
        }
    };

    const getColor = () => {
        switch (quality) {
            case 'poor': return 'bg-red-500/10 text-red-500';
            case 'fair': return 'bg-yellow-500/10 text-yellow-500';
            default: return 'bg-green-500/10 text-green-500';
        }
    };

    const getLabel = () => {
        switch (quality) {
            case 'poor': return 'Poor Connection';
            case 'fair': return 'Fair Connection';
            default: return 'Good Connection';
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`flex items-center justify-center h-8 w-8 rounded-full ${getColor()} cursor-help transition-all duration-500`}>
                        {getIcon()}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-white backdrop-blur-xl">
                    <div className='text-xs space-y-1 p-1'>
                        <div className="flex items-center gap-2 mb-2">
                            {getIcon()}
                            <p className='font-black uppercase tracking-widest'>{getLabel()}</p>
                        </div>
                        <p className="text-[10px] text-white/70 italic border-l-2 border-white/20 pl-2 my-2">{recommendation}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-white/50 font-mono mt-2">
                            <span>Type:</span> <span className="text-white">{effectiveType.toUpperCase()}</span>
                            <span>Speed:</span> <span className="text-white">~{downlink} Mbps</span>
                            <span>Ping:</span> <span className="text-white">{rtt} ms</span>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default NetworkQualityIndicator;
