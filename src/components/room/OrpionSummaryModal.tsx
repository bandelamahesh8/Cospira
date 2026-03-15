import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Lock, BrainCircuit, RefreshCw, AlertTriangle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getApiUrl } from '@/utils/url';

interface OrpionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

interface SummaryResponse {
  status: 'success' | 'locked' | 'blocked' | 'error';
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
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [isCertError, setIsCertError] = useState(false);


  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setData(null);
    setCountdown(null);
    setIsServerOffline(false);
    setIsCertError(false);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(getApiUrl(`/rooms/${roomId}/summary`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Parse the JSON regardless of HTTP status —
      // 423 = locked, 400 = blocked, 200 = success, 500 = error
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
        // Any other non-OK response (404, 500, etc.)
        setData({
          status: 'error',
          message: result.error || result.message || `Server error (${res.status})`,
        });
      }
    } catch (error) {
      console.error('[OrpionSummaryModal] Error:', error);
      const errName = (error as Error)?.name;
      const isAborted = errName === 'AbortError';
      const isNetworkError = error instanceof TypeError;

      // SSL cert errors: TypeError on an https:// URL (not a timeout)
      const looksLikeCertError = isNetworkError && getApiUrl('/').startsWith('https://') && !isAborted;

      if (looksLikeCertError) {
        setIsCertError(true);
        setIsServerOffline(true);
        setData({ status: 'error', message: 'SSL certificate not trusted.' });
      } else if (isNetworkError || isAborted) {
        setIsServerOffline(true);
        setData({ status: 'error', message: 'Cannot reach the Orpion Intelligence server.' });
      } else {
        setData({
          status: 'error',
          message: (error as Error)?.message || 'An unexpected error occurred.',
        });
        toast.error('Orpion Error', { description: 'Could not reach Orpion Intelligence.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Auto-fetch on open (only if no existing data)
  useEffect(() => {
    if (isOpen && !data) {
      fetchSummary();
    }
  }, [isOpen, data, fetchSummary]);

  // Countdown Timer logic
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => (prev && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const handleClose = () => {
    setData(null); // Reset so next open fetches fresh
    onClose();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Simple parser for markdown sections
  const renderSummaryContent = (text: string) => {
    const sections = text.split('##').filter((s) => s.trim());
    return sections.map((section, idx) => {
      const [title, ...content] = section.split('\n');
      return (
        <div key={idx} className='mb-8'>
          <h3 className='text-xs font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2'>
            <div className='w-1.5 h-1.5 bg-indigo-500 rounded-full' />
            {title.trim()}
          </h3>
          <div className='text-sm md:text-base text-white/80 leading-relaxed pl-4 border-l border-white/10'>
            {content
              .join('\n')
              .trim()
              .split('\n')
              .map((line, i) => (
                <p
                  key={i}
                  className={`mb-2 ${line.trim().startsWith('-') || line.trim().startsWith('•') ? 'pl-2' : ''}`}
                >
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
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className='absolute inset-0 bg-black/90 backdrop-blur-md'
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className='relative w-full max-w-3xl h-[80vh] bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden'
          >
            {/* Header */}
            <div className='px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0A0A0A] z-10 relative'>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)]'>
                  <BrainCircuit className='w-6 h-6 text-indigo-400' />
                </div>
                <div>
                  <h2 className='text-xl font-black italic uppercase tracking-tighter text-white'>
                    ORPION INTELLIGENCE
                  </h2>
                  <p className='text-[10px] text-white/30 font-medium mt-0.5 max-w-[280px] leading-relaxed hidden md:block'>
                    AI-powered room conversation analyzer — extracts key decisions, action items
                    &amp; sentiment from your session.
                  </p>
                  <div className='flex items-center gap-2 mt-1'>
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : isServerOffline ? 'bg-red-500' : 'bg-emerald-500'}`}
                    />
                    <p className='text-[10px] text-white/40 font-mono uppercase tracking-wider'>
                      {isLoading
                        ? 'Processing Neural Stream'
                        : isServerOffline
                          ? 'Server Offline'
                          : 'System Ready'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className='w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/50 hover:text-white'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Content Area */}
            <ScrollArea className='flex-1 bg-[#0A0A0A] relative'>
              {/* Background decorations */}
              <div className='absolute inset-0 pointer-events-none opacity-20'>
                <div className='absolute top-0 right-[-10%] w-[400px] h-[400px] bg-indigo-900/20 blur-[120px] rounded-full' />
                <div className='absolute bottom-0 left-[-10%] w-[400px] h-[400px] bg-emerald-900/20 blur-[120px] rounded-full' />
              </div>

              <div className='p-8 md:p-12 relative z-10 min-h-full flex flex-col'>
                {/* Loading */}
                {isLoading && (
                  <div className='flex-1 flex flex-col items-center justify-center space-y-8'>
                    <div className='relative w-24 h-24'>
                      <div className='absolute inset-0 border-4 border-indigo-500/20 rounded-full'></div>
                      <div className='absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin'></div>
                      <BrainCircuit className='absolute inset-0 m-auto w-8 h-8 text-indigo-500/50 animate-pulse' />
                    </div>
                    <div className='text-center space-y-2'>
                      <h3 className='text-xl font-bold text-white tracking-tight'>
                        Analyzing Conversation
                      </h3>
                      <p className='text-sm text-white/40 font-mono'>
                        Extracting key decisions and patterns...
                      </p>
                    </div>
                  </div>
                )}

                {/* Server Offline / SSL Cert Error */}
                {!isLoading && isServerOffline && (
                  <div className='flex-1 flex flex-col items-center justify-center text-center space-y-6'>
                    <div className='w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20'>
                      <WifiOff className='w-8 h-8 text-red-400' />
                    </div>
                    <div>
                      <h3 className='text-xl font-bold text-white mb-2'>
                        {isCertError ? 'SSL Certificate Not Trusted' : 'Backend Unreachable'}
                      </h3>
                      <p className='text-white/40 max-w-sm mx-auto text-sm leading-relaxed'>
                        {isCertError ? (
                          <>
                            Your browser is blocking the request because the backend has a{' '}
                            <span className='text-amber-300'>self-signed SSL certificate</span>. You
                            need to accept it once.
                          </>
                        ) : (
                          <>
                            Orpion Intelligence requires the Cospira backend server to be running.
                          </>
                        )}
                        <span className='text-white/25 font-mono text-xs mt-2 block'>
                          {getApiUrl('/')}
                        </span>
                      </p>
                    </div>

                    {isCertError ? (
                      <div className='flex flex-col items-center gap-3 w-full max-w-xs'>
                        <a
                          href={`${getApiUrl('/health')}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 transition-colors text-sm font-bold'
                        >
                          🔗 Open Backend in New Tab to Accept Certificate
                        </a>
                        <p className='text-[10px] text-white/30 text-center'>
                          Click "Advanced" → "Proceed to {getApiUrl('/').replace('https://', '').replace(/\/$/, '')}{' '}
                          (unsafe)" in your browser, then come back and retry.
                        </p>
                        <Button
                          onClick={fetchSummary}
                          variant='ghost'
                          className='text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-xl mt-2'
                        >
                          <RefreshCw className='w-3.5 h-3.5 mr-2' /> I've Accepted — Retry
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className='flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20'>
                          <AlertTriangle className='w-4 h-4 text-amber-400 shrink-0' />
                          <p className='text-[10px] text-amber-300 font-bold uppercase tracking-widest'>
                            Start the backend server to enable AI analysis
                          </p>
                        </div>
                        <Button
                          onClick={fetchSummary}
                          variant='ghost'
                          className='text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-xl'
                        >
                          <RefreshCw className='w-3.5 h-3.5 mr-2' /> Retry Connection
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Locked */}
                {!isLoading && !isServerOffline && data?.status === 'locked' && (
                  <div className='flex-1 flex flex-col items-center justify-center text-center space-y-8'>
                    <div className='w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 relative'>
                      <Lock className='w-10 h-10 text-red-500' />
                      <svg
                        className='absolute inset-0 w-full h-full -rotate-90 text-red-500/20'
                        viewBox='0 0 100 100'
                      >
                        <circle
                          cx='50'
                          cy='50'
                          r='48'
                          fill='none'
                          strokeWidth='2'
                          stroke='currentColor'
                        />
                        <circle
                          cx='50'
                          cy='50'
                          r='48'
                          fill='none'
                          strokeWidth='2'
                          stroke='currentColor'
                          strokeDasharray='301'
                          strokeDashoffset={((300 - (countdown || 0)) / 300) * 301}
                          className='text-red-500 transition-all duration-1000'
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className='text-2xl font-black uppercase text-white mb-2'>
                        Analysis Locked
                      </h3>
                      <p className='text-white/40 max-w-sm mx-auto mb-6'>
                        High-level intelligence requires at least 5 minutes of conversation data to
                        ensure accuracy.
                      </p>
                      <div className='inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 border border-white/10'>
                        <span className='text-[10px] uppercase tracking-widest text-white/50 font-bold'>
                          Unlocks In
                        </span>
                        <span className='text-xl font-mono font-bold text-white tabular-nums'>
                          {countdown !== null ? formatTime(countdown) : '--:--'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Blocked — No conversation data yet */}
                {!isLoading && !isServerOffline && data?.status === 'blocked' && (
                  <div className='flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8'>
                    <div className='w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20'>
                      <BrainCircuit className='w-8 h-8 text-indigo-400' />
                    </div>
                    <div className='max-w-sm mx-auto space-y-3'>
                      <h3 className='text-xl font-bold text-white'>Warming Up</h3>
                      <p className='text-white/50 text-sm leading-relaxed'>
                        Orpion needs at least a few minutes of active conversation to generate
                        meaningful insights.
                      </p>
                      <p className='text-white/30 text-xs leading-relaxed'>
                        Keep the session going — Orpion monitors chat messages and discussions in
                        real time. Once enough data is collected, it will surface key decisions,
                        action items and sentiment trends.
                      </p>
                    </div>
                    <div className='flex flex-col items-center gap-3'>
                      <div className='flex items-center gap-3 px-5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20'>
                        <div className='w-2 h-2 rounded-full bg-indigo-400 animate-pulse' />
                        <span className='text-[11px] text-indigo-300 font-bold uppercase tracking-widest'>
                          Listening for conversation data...
                        </span>
                      </div>
                      <Button
                        onClick={fetchSummary}
                        variant='ghost'
                        className='text-white/40 hover:text-white text-xs'
                      >
                        <RefreshCw className='w-3.5 h-3.5 mr-2' /> Check Again
                      </Button>
                    </div>
                  </div>
                )}

                {/* Generic Error */}
                {!isLoading && !isServerOffline && data?.status === 'error' && (
                  <div className='flex-1 flex flex-col items-center justify-center text-center space-y-6'>
                    <div className='w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20'>
                      <AlertTriangle className='w-8 h-8 text-red-400' />
                    </div>
                    <div>
                      <h3 className='text-xl font-bold text-white'>Analysis Failed</h3>
                      <p className='text-white/40 max-w-sm mx-auto mt-2 text-sm'>
                        {data.message || 'An unexpected error occurred.'}
                      </p>
                    </div>
                    <Button
                      onClick={fetchSummary}
                      variant='ghost'
                      className='text-white/50 hover:text-white'
                    >
                      <RefreshCw className='w-3.5 h-3.5 mr-2' /> Try Again
                    </Button>
                  </div>
                )}

                {/* Success */}
                {!isLoading && !isServerOffline && data?.status === 'success' && data.summary && (
                  <div className='animate-in fade-in slide-in-from-bottom-4 duration-500'>
                    {renderSummaryContent(data.summary)}
                    <div className='mt-12 p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between'>
                      <div className='space-y-1'>
                        <p className='text-xs font-bold text-white/50 uppercase tracking-wider'>
                          Messages Analyzed
                        </p>
                        <p className='text-2xl font-black text-white'>
                          {data.stats?.msgCount || 0}
                        </p>
                      </div>
                      <div className='space-y-1 text-right'>
                        <p className='text-xs font-bold text-white/50 uppercase tracking-wider'>
                          Total Words
                        </p>
                        <p className='text-2xl font-black text-white'>
                          {data.stats?.wordCount || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className='p-6 border-t border-white/10 bg-[#0A0A0A] flex justify-between items-center z-10 shrink-0'>
              <div className='flex items-center gap-2'>
                {isServerOffline ? (
                  <div className='flex items-center gap-1.5 text-[10px] text-red-400/60 font-mono'>
                    <WifiOff className='w-3 h-3' /> Offline
                  </div>
                ) : (
                  <p className='text-[10px] text-white/20 font-mono hidden md:block'>
                    POWERED BY GEMINI PRO • END-TO-END ENCRYPTED
                  </p>
                )}
              </div>
              <div className='flex gap-3 w-full md:w-auto justify-end'>
                <Button
                  onClick={fetchSummary}
                  disabled={isLoading || (data?.status === 'locked' && (countdown || 0) > 0)}
                  className='bg-white text-black hover:bg-gray-200 h-10 rounded-xl uppercase text-[10px] font-black tracking-widest gap-2'
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
