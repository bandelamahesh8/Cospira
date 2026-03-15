import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileData } from '@/types/websocket';

import { X, Download, ExternalLink, Box, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiUrl } from '@/utils/url';

interface FilePresenterProps {
  file: FileData;
  onClose: () => void;
}

export const FilePresenter: React.FC<FilePresenterProps> = ({ file, onClose }) => {
  const [isAssetLoading, setIsAssetLoading] = useState(true);
  const isImage = file.type?.startsWith('image/');
  const isVideo = file.type?.startsWith('video/');
  const isPDF = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  const isOffice =
    /msword|wordprocessingml|ms-excel|spreadsheetml|ms-powerpoint|presentationml|officedocument/.test(
      file.type || ''
    ) || /\.(doc|docx|xls|xlsx|ppt|pptx|pps|ppsx)$/i.test(file.name || '');

  const isDirectOffice = /\.(docx|pptx|xlsx|ppt|pps|ppsx)$/i.test(file.name || '');
  const [viewerType, setViewerType] = useState<'google' | 'microsoft'>(
    isDirectOffice ? 'microsoft' : 'google'
  );
  const [loadError, setLoadError] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MANIFESTATION_TIMEOUT = 12000; // 12 seconds

  useEffect(() => {
    // Skip loading state for direct content/data URLs or non-visual files
    if (file.content?.startsWith('data:') || (!isImage && !isVideo && !isPDF && !isOffice)) {
      setIsAssetLoading(false);
      return;
    }

    setLoadError(false);
    setIsAssetLoading(true);

    // Timeout if asset takes too long (e.g. ngrok issues or viewer lag)
    loadingTimeoutRef.current = setTimeout(() => {
      // Use the set state version with a callback to get the absolute current value
      setIsAssetLoading((current) => {
        if (current) setLoadError(true);
        return current;
      });
    }, MANIFESTATION_TIMEOUT);

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [file.id, file.content, viewerType, isImage, isVideo, isPDF, isOffice]);

  // Automatic "Vision Mode" fallback if onLoad takes too long
  useEffect(() => {
    if (!isAssetLoading) return;

    const timer = setTimeout(() => {
      console.warn(
        '[FilePresenter] Asset manifestation timeout - entering vision mode automatically'
      );
      setIsAssetLoading(false);
    }, 5000); // 5 second hard limit for perceived lag

    return () => clearTimeout(timer);
  }, [isAssetLoading]);

  const getFileUrl = useCallback(() => {
    if (file.content) return file.content;
    if (!file.url) return '';

    let fullUrl = '';
    if (file.url.startsWith('http') || file.url.startsWith('data:')) {
      fullUrl = file.url;
    } else {
      fullUrl = getApiUrl(file.url);

      // Add timestamp to avoid caching issues during dev
      const separator = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${separator}t=${Date.now()}`;
    }

    // Fix for ngrok browser warning: ensure the skip parameter is present
    const isNgrok = fullUrl.includes('ngrok-free.dev') || fullUrl.includes('ngrok.io');
    if (isNgrok && !fullUrl.includes('ngrok-skip-browser-warning')) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      return `${fullUrl}${separator}ngrok-skip-browser-warning=1`;
    }

    return fullUrl;
  }, [file.url, file.content]);

  const isLocalUrl = (url: string) => {
    return (
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('192.168.') ||
      url.includes('10.') ||
      url.includes('172.') ||
      !url.startsWith('https')
    );
  };

  return (
    <div className='w-full h-full flex flex-col relative group overflow-hidden bg-[#0a0a0c]'>
      <AnimatePresence>
        {isAssetLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 z-[100] bg-[#0a0a0c] flex flex-col items-center justify-center gap-6'
          >
            <div className='relative'>
              <div className='w-20 h-20 rounded-full border-2 border-primary/20 animate-pulse' />
              <div className='absolute inset-0 flex items-center justify-center'>
                <Loader2 className='w-10 h-10 text-primary animate-spin' />
              </div>
            </div>
            <div className='flex flex-col items-center gap-4 text-center px-6'>
              <div className='flex flex-col items-center gap-1'>
                <h4 className='text-xs font-black uppercase tracking-[0.3em] text-white/80'>
                  {loadError ? 'Sync Latency Detected' : 'Cluster Manifestation'}
                </h4>
                <p className='text-[10px] font-medium text-white/30 uppercase tracking-widest animate-pulse max-w-xs'>
                  {loadError
                    ? 'External engine delay. Cluster synchronization in progress...'
                    : 'Calibrating view protocols...'}
                </p>
              </div>

              {/* Show force sync button if taking too long */}
              <div className='flex flex-row gap-3'>
                <button
                  onClick={() => {
                    setLoadError(false);
                  }}
                  className='px-4 py-2 luxury-card border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-primary hover:border-primary/30 transition-all'
                >
                  Force Re-sync
                </button>
                <button
                  onClick={() => setIsAssetLoading(false)}
                  className='px-4 py-2 bg-primary/20 border border-primary/40 rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/30 transition-all'
                >
                  Enter Vision Mode
                </button>
              </div>
            </div>
            {loadError && (
              <div className='mt-8 flex flex-col gap-4 w-full max-w-[240px]'>
                {isOffice && (
                  <button
                    onClick={() =>
                      setViewerType((prev) => (prev === 'google' ? 'microsoft' : 'google'))
                    }
                    className='h-12 px-6 bg-primary/20 border border-primary/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/30 transition-all'
                  >
                    Switch to {viewerType === 'google' ? 'Office' : 'Google'} Viewer
                  </button>
                )}
                <a
                  href={getFileUrl()}
                  download={file.name}
                  className='h-12 px-6 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all flex items-center justify-center gap-2'
                >
                  <Download className='w-4 h-4' /> Download Locally
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Background Glow */}
      <div className='absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none' />

      {/* Grid Pattern */}
      <div
        className='absolute inset-0 opacity-[0.03] pointer-events-none'
        style={{
          backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Close Button */}
      <div className='absolute top-10 right-10 z-50'>
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className='w-14 h-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white/60 hover:text-red-400 transition-all shadow-2xl'
        >
          <X className='w-6 h-6' />
        </motion.button>
      </div>

      {/* Content Display */}
      <div className='flex-1 flex items-center justify-center p-0 md:p-1 pt-14'>
        <AnimatePresence mode='wait'>
          {isImage ? (
            <motion.div
              key='image'
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
              className='relative max-w-full max-h-full rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10 group/img'
            >
              <img
                src={getFileUrl()}
                alt={file.name}
                onLoad={() => setIsAssetLoading(false)}
                className='w-full h-full object-contain rounded-xl shadow-2xl z-20 transition-all duration-700'
              />
            </motion.div>
          ) : isVideo ? (
            <motion.div
              key='video'
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className='w-full h-full flex items-center justify-center relative'
            >
              <video
                src={getFileUrl()}
                controls
                autoPlay
                onLoadedData={() => setIsAssetLoading(false)}
                onError={() => setIsAssetLoading(false)}
                className='w-full h-full rounded-xl shadow-2xl z-20'
              />
            </motion.div>
          ) : isPDF ? (
            <motion.div
              key='pdf'
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className='w-full h-full pt-4 px-1 pb-1 flex flex-col'
            >
              <div className='flex-1 luxury-card border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative'>
                <iframe
                  src={`${getFileUrl()}#toolbar=0`}
                  className='w-full h-full'
                  onLoad={() => setIsAssetLoading(false)}
                  title={file.name}
                />
                <div className='absolute top-6 right-6 flex items-center gap-3'>
                  <span className='text-[10px] font-black uppercase tracking-widest text-white/50'>
                    Document Projection Active
                  </span>
                </div>
                <div className='h-4 w-px bg-white/10' />
                <a
                  href={getFileUrl()}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-all flex items-center gap-2 hover:scale-105'
                >
                  <ExternalLink className='w-4 h-4' /> Expand Vision
                </a>
              </div>
            </motion.div>
          ) : isOffice ? (
            <motion.div
              key='office'
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className='w-full h-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] bg-[#F8F9FA] relative'
            >
              {/* Background Glow for White Docs */}
              <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 pointer-events-none' />

              <div className='absolute inset-0 overflow-hidden bg-slate-100 flex items-center justify-center'>
                <iframe
                  src={
                    viewerType === 'google'
                      ? `https://docs.google.com/viewer?url=${encodeURIComponent(getFileUrl())}&embedded=true`
                      : `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(getFileUrl())}&wdOrigin=BROWSERLINK&ms_ext=true`
                  }
                  className='w-full h-full border-none'
                  title={file.name}
                  onLoad={() => {
                    setIsAssetLoading(false);
                    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
                  }}
                />
                <div className='absolute top-6 left-6 flex items-center gap-3 pointer-events-none'>
                  <span className='text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full shadow-sm'>
                    Live Presentation Active
                  </span>
                </div>

                {/* Local Fallback Graphics if white screen is persistent */}
                {(isLocalUrl(getFileUrl()) || loadError) && (
                  <div className='absolute inset-0 pt-14 flex flex-col items-center justify-center p-12 text-center pointer-events-none opacity-20'>
                    <div className='w-24 h-24 rounded-3xl bg-slate-300 animate-pulse mb-6' />
                    <p className='text-sm font-black text-slate-400 uppercase tracking-widest'>
                      {loadError ? 'External Render Failed' : 'External Render Waiting...'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key='fallback'
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='luxury-card p-16 flex flex-col items-center gap-10 max-w-2xl text-center relative overflow-hidden'
            >
              {/* Decorative scanline */}
              <div className='absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-20 w-full animate-scanline pointer-events-none' />

              <div className='w-36 h-36 bg-primary/5 border-2 border-primary/20 rounded-[3rem] flex items-center justify-center relative overflow-hidden group/box shadow-inner'>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className='absolute inset-0 border-2 border-dashed border-primary/10 rounded-[3rem] scale-110'
                />
                <Box className='w-16 h-16 text-primary relative z-10' />
              </div>

              <div className='space-y-4'>
                <h4 className='text-3xl font-black uppercase italic tracking-tighter text-white'>
                  {isOffice ? 'Office Manifestation' : 'Complex Data Stream'}
                </h4>
                <p className='text-sm font-medium text-slate-400 max-w-md mx-auto leading-relaxed'>
                  {isOffice
                    ? 'This office document is formatted for local execution. Projected streams are currently non-renderable. Acquire the asset to view.'
                    : "This object's architecture is too complex for 2D manifestation in this viewport. Acquire the full asset to process locally."}
                </p>
              </div>

              <div className='flex flex-col gap-4 w-full max-w-xs'>
                <a
                  href={getFileUrl()}
                  download={file.name}
                  className='h-16 px-10 bg-white rounded-2xl flex items-center justify-center gap-4 text-black font-black uppercase tracking-[0.2em] text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.1)]'
                >
                  <Download className='w-5 h-5 text-black' /> Acquire Full Asset
                </a>
                <p className='text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]'>
                  Secure Decryption Stream Active
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decal - REMOVED per user request */}
    </div>
  );
};
