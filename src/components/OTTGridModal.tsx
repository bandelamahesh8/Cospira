import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { Youtube, Upload, Monitor, X, ArrowLeft, Zap, Globe } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { FirstTimeFlags, hasSeenFirstTime, markFirstTimeSeen } from '@/utils/firstTimeHelpers';

interface OTTGridModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartYouTube: (videoId: string) => void;
  onFileUpload: (file: File) => void;
  onStartScreenShare: () => void;
  onStartVirtualBrowser: () => void;
}

const OTTGridModal: React.FC<OTTGridModalProps> = ({
  isOpen,
  onOpenChange,
  onStartYouTube,
  onFileUpload,
  onStartScreenShare,
  onStartVirtualBrowser,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManifestTooltip, setShowManifestTooltip] = useState(false);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const videoId = extractVideoId(youtubeUrl);
    if (videoId) {
      onStartYouTube(videoId);
      setYoutubeUrl('');
      setShowYoutubeInput(false);
      onOpenChange(false);
    } else {
      setError('Invalid signal detected. Verify link.');
    }
  };
  
  // Show Manifest Content tooltip on first open
  useEffect(() => {
    if (isOpen && !hasSeenFirstTime(FirstTimeFlags.MANIFEST_CONTENT)) {
      setShowManifestTooltip(true);
    }
  }, [isOpen]);
  
  const handleDismissTooltip = () => {
    if (showManifestTooltip) {
      setShowManifestTooltip(false);
      markFirstTimeSeen(FirstTimeFlags.MANIFEST_CONTENT);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md luxury-glass border-white/5 bg-black/80 backdrop-blur-3xl p-0 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-gradient [&>button]:hidden'>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,200,255,0.05)_0%,transparent_70%)] pointer-events-none" />
        
        <DialogHeader className="p-6 pb-0 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Stream Protocol</span>
                <TooltipProvider>
                  <Tooltip 
                    open={showManifestTooltip}
                    onOpenChange={(open) => {
                      if (!open && showManifestTooltip) {
                        handleDismissTooltip();
                      }
                    }}
                  >
                    <TooltipTrigger asChild>
                      <DialogTitle 
                        className='text-2xl font-black uppercase italic tracking-tighter text-white cursor-help'
                        onMouseEnter={handleDismissTooltip}
                      >
                          MANIFEST <span className="text-luxury">CONTENT</span>
                      </DialogTitle>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs bg-black/90 border-white/10 text-white/60">
                      Share videos, files, or your screen
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </div>
            <button 
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
            >
                <X className="w-4 h-4" />
            </button>
          </div>
          <DialogDescription className='text-slate-400 font-medium pt-2 text-xs'>
            Select a subspace projection source.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 relative z-10">
          <AnimatePresence mode="wait">
            {!showYoutubeInput ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className='space-y-4'
              >
                <div className='grid grid-cols-2 gap-3'>
                  <button
                    onClick={() => setShowYoutubeInput(true)}
                    className='group relative aspect-square w-full rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all duration-500 flex flex-col items-center justify-center gap-2 overflow-hidden'
                  >
                    <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-red-500 transition-all duration-500">
                      <Youtube className='w-5 h-5 text-red-500 group-hover:text-white transition-colors' />
                    </div>
                    <span className='text-[9px] font-black uppercase tracking-widest text-center group-hover:text-white transition-colors'>YouTube</span>
                  </button>

                  <div className='relative group aspect-square w-full'>
                    <input type='file' className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20' onChange={(e) => {
                      const f = e.target.files?.[0];
                      if(f) { onFileUpload(f); onOpenChange(false); }
                    }} />
                    <button className='w-full h-full rounded-2xl bg-white/5 border border-white/10 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all duration-500 flex flex-col items-center justify-center gap-2 overflow-hidden'>
                      <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-500">
                        <Upload className='w-5 h-5 text-primary group-hover:text-background transition-colors' />
                      </div>
                      <span className='text-[9px] font-black uppercase tracking-widest text-center group-hover:text-white transition-colors'>Upload</span>
                    </button>
                  </div>

                  <button
                    onClick={() => { onStartScreenShare(); onOpenChange(false); }}
                    className='group relative aspect-square w-full rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-500 flex flex-col items-center justify-center gap-2 overflow-hidden'
                  >
                    <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 transition-all duration-500">
                      <Monitor className='w-5 h-5 text-emerald-500 group-hover:text-white transition-colors' />
                    </div>
                    <span className='text-[9px] font-black uppercase tracking-widest text-center group-hover:text-white transition-colors'>Screen</span>
                  </button>

                  <button
                    onClick={() => { 
                      onStartVirtualBrowser(); 
                      onOpenChange(false); 
                    }}
                    className='group relative aspect-square w-full rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all duration-500 flex flex-col items-center justify-center gap-2 overflow-hidden'
                  >
                    <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 transition-all duration-500">
                      <Globe className='w-5 h-5 text-blue-500 group-hover:text-white transition-colors' />
                    </div>
                    <span className='text-[9px] font-black uppercase tracking-widest text-center group-hover:text-white transition-colors'>Browser</span>
                  </button>
                </div>
                

              </motion.div>
            ) : (
              <motion.div
                key="youtube"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className='space-y-8'
              >
                <button
                  onClick={() => setShowYoutubeInput(false)}
                  className='flex items-center gap-3 text-white/40 hover:text-white transition-all group'
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Return to Matrix</span>
                </button>
                
                <form onSubmit={handleYoutubeSubmit} className='space-y-8'>
                    <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
                            <Youtube className="w-5 h-5 text-red-500" />
                        </div>
                        <input
                            autoFocus
                            placeholder="TRANSMIT YOUTUBE URL..."
                            value={youtubeUrl}
                            onChange={(e) => { setYoutubeUrl(e.target.value); setError(null); }}
                            className="w-full h-20 bg-white/5 border border-white/5 rounded-3xl px-20 text-lg font-bold tracking-tight focus:border-red-500/50 outline-none transition-all placeholder:text-white/5"
                        />
                        <button type="submit" className="absolute right-4 top-4 h-12 px-8 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition-all shadow-[0_5px_20px_rgba(239,68,68,0.4)] active:scale-95">Establish Link</button>
                    </div>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-400">
                             <Zap className="w-4 h-4" />
                             <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                        </motion.div>
                    )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTTGridModal;
