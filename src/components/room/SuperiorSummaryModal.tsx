import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, BrainCircuit, RefreshCw, AlertTriangle, Sparkles, AlertCircle, Bot, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiUrl } from '@/utils/url';

interface SuperiorSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

interface AdvancedSummary {
  gist: string;
  milestones: string[];
  decisions: string[];
  actionProtocol: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface SummaryResponse {
  status: 'success' | 'locked' | 'blocked' | 'error';
  summary?: string; // This will now be a stringified AdvancedSummary
  message?: string;
  remainingSeconds?: number;
  stats?: {
    msgCount: number;
    wordCount: number;
    participantCount?: number;
  };
}

const SuperiorSummaryModal: React.FC<SuperiorSummaryModalProps> = ({ isOpen, onClose, roomId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [_isServerOffline, setIsServerOffline] = useState(false);


  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setData(null);
    setCountdown(null);
    setIsServerOffline(false);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); 

      const res = await fetch(getApiUrl(`/rooms/${roomId}/summary`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await res.json();

      if (res.status === 423 || result.status === 'locked') {
        setData({
          status: 'locked',
          message: result.message,
          remainingSeconds: result.remainingSeconds,
        });
        if (result.remainingSeconds) setCountdown(result.remainingSeconds);
      } else if (res.status === 400 || result.status === 'blocked') {
        setData({ status: 'blocked', message: result.message, stats: result.stats });
      } else if (res.ok && result.status === 'success') {
        setData(result);
      } else {
        setData({
          status: 'error',
          message: result.error || result.message || `Server error (${res.status})`,
        });
      }
    } catch (error) {
      console.error('[SuperiorSummaryModal] Error:', error);
      setIsServerOffline(true);
      setData({ status: 'error', message: 'Cannot reach the Intelligence Server.' });
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (isOpen && !data) {
      fetchSummary();
    }
  }, [isOpen, data, fetchSummary]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => (prev && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const handleClose = () => {
    setData(null);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const SummaryContent = ({ rawSummary }: { rawSummary: string }) => {
    let parsed: AdvancedSummary | null = null;
    try {
      parsed = JSON.parse(rawSummary);
    } catch (_e) {
      // Fallback for legacy text summaries
      return (
        <div className='p-8 rounded-[2rem] bg-white/5 border border-white/10'>
          {rawSummary.split('\n').filter(p => p.trim()).map((p, i) => (
            <p key={i} className='text-base text-white/80 leading-relaxed mb-4 last:mb-0'>{p}</p>
          ))}
        </div>
      );
    }

    if (!parsed) return null;

    return (
      <div className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700'>
        {/* Executive Gist */}
        <div className='p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20 relative overflow-hidden group hover:bg-primary/10 transition-all'>
          <div className='absolute -top-12 -right-12 w-24 h-24 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/40 transition-all' />
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-2 h-2 rounded-full bg-primary animate-pulse' />
            <h4 className='text-[10px] font-black uppercase tracking-[0.3em] text-primary/80'>Mission Critical Gist</h4>
          </div>
          <p className='text-xl md:text-2xl font-bold text-white leading-tight tracking-tight'>
            {parsed.gist}
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Key Milestones */}
          <section className='space-y-4'>
            <div className='flex items-center gap-3 px-2'>
               <Sparkles className='w-4 h-4 text-amber-400' />
               <h4 className='text-xs font-black uppercase tracking-widest text-white/40'>Neural Milestones</h4>
            </div>
            <div className='space-y-3'>
              {parsed.milestones.map((item, i) => (
                <motion.div 
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.1 }}
                   key={i} 
                   className='p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all'
                >
                  <p className='text-sm text-white/70 leading-snug'>{item}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Decisions */}
          <section className='space-y-4'>
            <div className='flex items-center gap-3 px-2'>
               <BrainCircuit className='w-4 h-4 text-indigo-400' />
               <h4 className='text-xs font-black uppercase tracking-widest text-white/40'>Session Baseline</h4>
            </div>
            <div className='space-y-3'>
              {parsed.decisions.map((item, i) => (
                <motion.div 
                   initial={{ opacity: 0, x: 10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.1 }}
                   key={i} 
                   className='p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10'
                >
                  <p className='text-sm text-indigo-100/80 font-medium leading-snug'>{item}</p>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* Action Protocol */}
        <div className='p-8 rounded-[2rem] bg-white/5 border border-white/5 space-y-6'>
          <div className='flex items-center justify-between'>
            <h4 className='text-xs font-black uppercase tracking-widest text-white/30'>Action Protocol</h4>
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              parsed.sentiment === 'positive' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              parsed.sentiment === 'negative' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              Sentiment: {parsed.sentiment}
            </div>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {parsed.actionProtocol.map((item, i) => (
              <div key={i} className='flex gap-3 items-start group'>
                <div className='mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors' />
                <p className='text-[13px] text-white/60 font-medium leading-relaxed group-hover:text-white transition-colors'>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className='absolute inset-0 bg-black/90 backdrop-blur-xl'
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className='relative w-full max-w-5xl h-[85vh] bg-neutral-950/50 border border-white/10 rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl'
          >
            {/* Header */}
            <div className='px-12 py-10 border-b border-white/5 flex items-center justify-between shrink-0'>
              <div className='flex items-center gap-6'>
                <div className='w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)]'>
                  <Bot className='w-8 h-8 text-primary animate-spin-slow' />
                </div>
                <div>
                  <h2 className='text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-4'>
                    SUPERIOR AI INTELLIGENCE
                    <span className='px-3 py-1 rounded-lg bg-primary text-black text-[11px] font-black tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]'>ELITE V4.0</span>
                  </h2>
                  <p className='text-xs text-white/40 font-black uppercase tracking-[0.1em] mt-1.5 flex items-center gap-2'>
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    Autonomous Room Observer • Contextual Neural Mapping
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className='w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-white/40 hover:text-white hover:scale-110 active:scale-90 border border-white/5'
              >
                <X className='w-7 h-7' />
              </button>
            </div>

            {/* Content Area */}
            <ScrollArea className='flex-1 relative'>
              <div className='p-12 md:p-16'>
                {isLoading ? (
                  <div className='flex flex-col items-center justify-center py-24 space-y-8'>
                    <div className='relative w-24 h-24'>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        className='absolute inset-0 border-b-4 border-l-4 border-primary rounded-full'
                      />
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className='absolute inset-2 border-t-2 border-r-2 border-primary/40 rounded-full'
                      />
                      <Sparkles className='absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse' />
                    </div>
                    <div className='text-center space-y-3'>
                      <p className='text-2xl font-black text-white uppercase tracking-[0.4em]'>Synthesizing Intel</p>
                      <p className='text-xs text-white/20 font-black uppercase tracking-widest'>Analyzing voice vectors, chat nodes, and activity metadata</p>
                    </div>
                  </div>
                ) : data?.status === 'success' ? (
                  <div className='animate-in fade-in duration-1000'>
                    <SummaryContent rawSummary={data.summary || ''} />

                    <div className='mt-12 grid grid-cols-2 md:grid-cols-4 gap-4'>
                      {[
                        { label: 'Activity Points', value: data.stats?.msgCount || 0 },
                        { label: 'Context Depth', value: `${data.stats?.wordCount || 0} words` },
                        { label: 'Collaborators', value: data.stats?.participantCount || 1 },
                        { label: 'Neural Score', value: 'High' }
                      ].map((stat, i) => (
                        <div key={i} className='p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center group hover:bg-white/5 transition-all'>
                          <span className='text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 group-hover:text-primary/60 transition-colors'>{stat.label}</span>
                          <span className='text-xl font-black text-white italic tracking-tighter'>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : data?.status === 'locked' ? (
                   <div className='flex flex-col items-center justify-center py-24 text-center'>
                      <div className='w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(239,68,68,0.1)]'>
                        <Lock className='w-12 h-12 text-red-500' />
                      </div>
                      <h3 className='text-2xl font-black text-white uppercase mb-3 tracking-tight'>Neural Link Locked</h3>
                      <p className='text-white/40 max-w-sm mx-auto mb-10 text-sm font-medium'> 
                        Orpion AI requires at least 5 minutes of session baseline to establish accurate neural mapping. 
                      </p>
                      <div className='px-10 py-5 rounded-3xl bg-white/5 border border-white/10 font-mono text-3xl font-black text-white tabular-nums tracking-tighter shadow-2xl'>
                        {countdown !== null ? formatTime(countdown) : '--:--'}
                      </div>
                   </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-24 text-center'>
                    <div className='w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(245,158,11,0.1)]'>
                      <AlertTriangle className='w-12 h-12 text-amber-500' />
                    </div>
                    <h3 className='text-2xl font-black text-white uppercase mb-3 tracking-tight'>Analysis Blocked</h3>
                    <p className='text-white/40 max-w-md mx-auto mb-10 text-sm font-medium'> {data?.message || 'Insufficient telemetry collected to generate a high-fidelity intelligence report.'} </p>
                    <Button onClick={fetchSummary} variant='outline' className='h-12 px-8 rounded-2xl border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all font-black uppercase text-xs tracking-widest'>
                      <RefreshCw className='w-4 h-4 mr-2' /> Retry Neural Mapping
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer Disclaimer */}
            <div className='px-12 py-10 border-t border-white/5 bg-black/40 shrink-0'>
              <div className='flex flex-col md:flex-row items-center justify-between gap-8'>
                <div className='flex items-center gap-4 bg-amber-500/10 border border-amber-500/25 px-6 py-3 rounded-2xl'>
                  <AlertCircle className='w-5 h-5 text-amber-400' />
                  <p className='text-xs text-amber-200/70 font-black uppercase tracking-widest leading-loose'>
                    AI Intelligence may yield hallucinations. Contact the host for raw metadata.
                  </p>
                </div>
                <div className='flex gap-4 w-full md:w-auto'>
                  <Button
                    onClick={fetchSummary}
                    disabled={isLoading || (data?.status === 'locked' && (countdown || 0) > 0)}
                    className='h-14 px-10 bg-white text-black hover:bg-white/90 font-black uppercase text-xs tracking-[0.2em] rounded-2xl transition-all active:scale-95 shadow-xl disabled:opacity-50'
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Regenerate Intelligence
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SuperiorSummaryModal;
