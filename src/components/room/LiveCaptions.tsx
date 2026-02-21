import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

const LiveCaptions: React.FC = () => {
    const { lastTranscript, users } = useWebSocket();
    const [displayProps, setDisplayProps] = useState<{ text: string; userId: string; userName: string; visible: boolean }>({
        text: '',
        userId: '',
        userName: '',
        visible: false
    });

    useEffect(() => {
        if (lastTranscript) {
            const user = users.find(u => u.id === lastTranscript.userId);
            const userName = user ? user.name : 'Unknown';
            
            setDisplayProps({
                text: lastTranscript.text,
                userId: lastTranscript.userId,
                userName,
                visible: true
            });

            // Auto-hide after 5 seconds of silence
            const timer = setTimeout(() => {
                setDisplayProps(prev => ({ ...prev, visible: false }));
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [lastTranscript, users]);

    return (
        <AnimatePresence>
            {displayProps.visible && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4 z-50 pointer-events-none"
                >
                    <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-4 group">
                         {/* Speaker Indicator */}
                        <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                                    {displayProps.userName}
                                </span>
                                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                            </div>
                            <p className="text-base font-medium leading-relaxed text-white drop-shadow-md">
                                {displayProps.text}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LiveCaptions;
