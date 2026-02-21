import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, X, Lock, BrainCircuit, RefreshCw, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface OrpionSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
}

interface SummaryResponse {
    status: 'success' | 'locked' | 'blocked';
    summary?: string;
    message?: string;
    remainingSeconds?: number;
    stats?: {
        msgCount: number;
        wordCount: number;
    };
}

const OrpionSummaryModal: React.FC<OrpionSummaryModalProps> = ({ isOpen, onClose, roomId }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<SummaryResponse | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    const fetchSummary = async () => {
        setIsLoading(true);
        setData(null);
        setCountdown(null);

        try {
            const res = await fetch(`${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/api/rooms/${roomId}/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            
            setData(result);
            
            if (result.status === 'locked' && result.remainingSeconds) {
                setCountdown(result.remainingSeconds);
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection Failed', { description: 'Could not reach Orpion Intelligence.' });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-fetch on open
    useEffect(() => {
        if (isOpen && !data) {
            fetchSummary();
        }
    }, [isOpen]);

    // Countdown Timer logic
    useEffect(() => {
        if (countdown !== null && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(prev => (prev && prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [countdown]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Simple parser for the markdown sections to make it look nice
    const renderSummaryContent = (text: string) => {
        const sections = text.split('##').filter(s => s.trim());
        return sections.map((section, idx) => {
            const [title, ...content] = section.split('\n');
            return (
                <div key={idx} className="mb-8">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 
                        {title.trim()}
                    </h3>
                    <div className="text-sm md:text-base text-white/80 leading-relaxed pl-4 border-l border-white/10">
                        {content.join('\n').trim().split('\n').map((line, i) => (
                            <p key={i} className={`mb-2 ${line.trim().startsWith('-') || line.trim().startsWith('•') ? 'pl-2' : ''}`}>
                                {line.trim()}
                            </p>
                        ))}
                    </div>
                </div>
            );
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-3xl h-[80vh] bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0A0A0A] z-10 relative">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                                    <BrainCircuit className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
                                        ORPION INTELLIGENCE
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                                            {isLoading ? 'Processing Neural Stream' : 'System Ready'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/50 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <ScrollArea className="flex-1 bg-[#0A0A0A] relative">
                             {/* Background decorations */}
                             <div className="absolute inset-0 pointer-events-none opacity-20">
                                <div className="absolute top-0 right-[-10%] w-[400px] h-[400px] bg-indigo-900/20 blur-[120px] rounded-full" />
                                <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] bg-emerald-900/20 blur-[120px] rounded-full" />
                             </div>

                            <div className="p-8 md:p-12 relative z-10 min-h-full flex flex-col">
                                
                                {isLoading && (
                                    <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                                        <div className="relative w-24 h-24">
                                            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            <BrainCircuit className="absolute inset-0 m-auto w-8 h-8 text-indigo-500/50 animate-pulse" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-xl font-bold text-white tracking-tight">Analyzing Conversation</h3>
                                            <p className="text-sm text-white/40 font-mono">Extracting key decisions and patterns...</p>
                                        </div>
                                    </div>
                                )}

                                {!isLoading && data?.status === 'locked' && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                                        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 relative">
                                            <Lock className="w-10 h-10 text-red-500" />
                                            {/* Circular Progress (Fake) */}
                                            <svg className="absolute inset-0 w-full h-full -rotate-90 text-red-500/20" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="48" fill="none" strokeWidth="2" stroke="currentColor" />
                                                <circle cx="50" cy="50" r="48" fill="none" strokeWidth="2" stroke="currentColor" strokeDasharray="301" strokeDashoffset={((300 - (countdown || 0)) / 300) * 301} className="text-red-500 transition-all duration-1000" />
                                            </svg>
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-2xl font-black uppercase text-white mb-2">Analysis Locked</h3>
                                            <p className="text-white/40 max-w-sm mx-auto mb-6">
                                                High-level intelligence requires at least 5 minutes of conversation data to ensure accuracy.
                                            </p>
                                            
                                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 border border-white/10">
                                                <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Unlocks In</span>
                                                <span className="text-xl font-mono font-bold text-white tabular-nums">
                                                    {countdown !== null ? formatTime(countdown) : '--:--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isLoading && data?.status === 'blocked' && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Insufficient Data</h3>
                                            <p className="text-white/40 max-w-sm mx-auto mt-2">
                                                {data.message}
                                            </p>
                                        </div>
                                        <Button onClick={fetchSummary} variant="ghost" className="text-white/50 hover:text-white">
                                            Check Again
                                        </Button>
                                    </div>
                                )}

                                {!isLoading && data?.status === 'success' && data.summary && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {renderSummaryContent(data.summary)}
                                        
                                        <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Messages Analyzed</p>
                                                <p className="text-2xl font-black text-white">{data.stats?.msgCount || 0}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Total Words</p>
                                                <p className="text-2xl font-black text-white">{data.stats?.wordCount || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </ScrollArea>
                        
                         {/* Footer */}
                         <div className="p-6 border-t border-white/10 bg-[#0A0A0A] flex justify-between items-center z-10 shrink-0">
                            <p className="text-[10px] text-white/20 font-mono hidden md:block">
                                POWERED BY GEMINI PRO • END-TO-END ENCRYPTED
                            </p>
                            <div className="flex gap-3 w-full md:w-auto justify-end">
                                <Button 
                                    onClick={fetchSummary}
                                    disabled={isLoading || (data?.status === 'locked' && (countdown || 0) > 0)}
                                    className="bg-white text-black hover:bg-gray-200 h-10 rounded-xl uppercase text-[10px] font-black tracking-widest gap-2"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                                    {data?.status === 'success' ? 'Regenerate' : 'Refresh'}
                                </Button>
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default OrpionSummaryModal;
