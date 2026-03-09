import React from 'react';
import { FileData } from '@/types/websocket';

import { X, FileText, Download, ExternalLink, Box, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilePresenterProps {
  file: FileData;
  onClose: () => void;
}

export const FilePresenter: React.FC<FilePresenterProps> = ({ file, onClose }) => {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isPDF = file.type === 'application/pdf';

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className='w-full h-full flex flex-col relative group overflow-hidden'>
      {/* Background Glow */}
      <div className='absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none opacity-50' />

      {/* Meta Header */}
      <div className='absolute top-8 left-8 z-30 flex flex-col'>
        <div className='flex items-center gap-3 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl mb-2 w-fit'>
          <Box className='w-4 h-4 text-primary' />
          <span className='text-[10px] font-black uppercase tracking-[0.2em] text-primary'>
            Manifested Object
          </span>
        </div>
        <h3 className='text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-2xl'>
          {file.name}
        </h3>
        <div className='flex items-center gap-4 mt-2'>
          <span className='text-[10px] font-black uppercase tracking-widest text-white/40'>
            Size: {formatSize(file.size)}
          </span>
          <span className='text-[10px] font-black uppercase tracking-widest text-white/40'>|</span>
          <span className='text-[10px] font-black uppercase tracking-widest text-white/40'>
            Subject: {file.userName}
          </span>
        </div>
      </div>

      {/* Close Button (Host/Presenter only) */}
      <div className='absolute top-8 right-8 z-50'>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className='w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500 transition-all hover:text-white shadow-xl'
        >
          <X className='w-6 h-6' />
        </motion.button>
      </div>

      {/* Content Display */}
      <div className='flex-1 flex items-center justify-center p-20 pt-32'>
        <AnimatePresence mode='wait'>
          {isImage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              className='relative max-w-full max-h-full rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10'
            >
              <img
                src={file.content}
                alt={file.name}
                className='max-w-full max-h-full object-contain'
              />
            </motion.div>
          ) : isVideo ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className='w-full max-w-4xl aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] bg-black'
            >
              <video src={file.content} controls className='w-full h-full' autoPlay />
            </motion.div>
          ) : isPDF ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className='w-full h-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] bg-[#1a1c1e]'
            >
              <iframe
                src={`${file.content}#toolbar=0&navpanes=0`}
                className='w-full h-full border-none'
                title={file.name}
              />
              {/* Overlay for premium feel */}
              <div className='absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 luxury-glass border border-white/10 rounded-full flex items-center gap-4 pointer-events-auto'>
                <div className='flex items-center gap-2'>
                  <FileText className='w-3 h-3 text-primary' />
                  <span className='text-[8px] font-black uppercase tracking-widest text-white/60'>
                    PDF Projection
                  </span>
                </div>
                <div className='h-3 w-px bg-white/10' />
                <a
                  href={file.content}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-[8px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1'
                >
                  <ExternalLink className='w-2.5 h-2.5' /> Full Vision
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className='lux-card p-12 flex flex-col items-center gap-8 max-w-xl text-center'
            >
              <div className='w-32 h-32 bg-primary/10 border-2 border-primary/20 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group'>
                <div className='absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500' />
                <Box className='w-14 h-14 text-primary relative z-10' />
              </div>
              <div className='space-y-4'>
                <h4 className='text-xl font-black uppercase italic tracking-tighter text-white'>
                  Encrypted Data Stream
                </h4>
                <p className='text-sm font-medium text-slate-400'>
                  This object is currently non-renderable in this viewport. Acquire the asset to
                  view locally.
                </p>
              </div>
              <div className='flex gap-4'>
                <a
                  href={file.content}
                  download={file.name}
                  className='h-14 px-8 bg-primary rounded-2xl flex items-center gap-3 text-background font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg'
                >
                  <Download className='w-4 h-4 text-background' /> Acquire Asset
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decal / Grid */}
      <div className='absolute bottom-10 left-10 pointer-events-none'>
        <div className='flex items-center gap-4 text-[9px] font-black text-white/5 uppercase tracking-[0.5em]'>
          <Terminal className='w-3 h-3' /> System Projection Active
        </div>
      </div>
    </div>
  );
};
