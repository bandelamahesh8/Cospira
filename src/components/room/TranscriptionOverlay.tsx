
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { RoomMode } from "@/services/RoomIntelligence";
import { Bot, Lock } from "lucide-react";

interface TranscriptionOverlayProps {
    text: string;
    isFinal: boolean;
    mode: RoomMode;
    enabled: boolean;
}

export const TranscriptionOverlay = ({ text, isFinal, mode, enabled }: TranscriptionOverlayProps) => {
    const [history, setHistory] = useState<{ id: string, text: string }[]>([]);

    const { playHover } = useSoundEffects();

    useEffect(() => {
        if (!text) return;
        
        // Play typing sound on text update (live typing effect)
        if (!isFinal) {
             // Randomize pitch slightly if possible, or just play the tick
             playHover();
        }

        if (isFinal) {
            setHistory(prev => {
                const newHistory = [...prev, { id: crypto.randomUUID(), text }];
                return newHistory.slice(-2); // Keep last 2 lines
            });
        }
    }, [text, isFinal, playHover]);

    if (!enabled) return null;

    const getTheme = () => {
        switch (mode) {
            case 'ultra': return 'bg-red-500/10 border-red-500/20 text-red-400';
            case 'fun': return 'bg-purple-500/10 border-purple-500/20 text-purple-300';
            case 'professional': return 'bg-slate-900/80 border-slate-700/50 text-slate-200';
            default: return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300';
        }
    };

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-6 pointer-events-none flex flex-col items-center gap-2">
            <AnimatePresence mode="popLayout">
                {history.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 0.6, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`px-4 py-2 rounded-xl backdrop-blur-md border text-sm font-medium ${getTheme()}`}
                    >
                        {item.text}
                    </motion.div>
                ))}
            </AnimatePresence>
            
            {/* Live Text */}
            <AnimatePresence>
                {text && !isFinal && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`px-6 py-3 rounded-2xl backdrop-blur-xl border-2 shadow-2xl flex items-center gap-3 ${getTheme()}`}
                    >
                        {mode === 'ultra' ? <Lock className="w-4 h-4 animate-pulse" /> : <Bot className="w-4 h-4" />}
                        <span className="font-bold text-lg md:text-xl tracking-tight drop-shadow-md">
                            {text}
                        </span>
                        <div className="flex gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                             <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce delay-100" />
                             <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce delay-200" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
