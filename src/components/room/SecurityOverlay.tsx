import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface SecurityOverlayProps {
  roomId: string;
  userName: string;
}

export const SecurityOverlay: React.FC<SecurityOverlayProps> = ({ roomId, userName }) => {
  const [ip, setIp] = useState('127.0.0.1'); // Simplified for client-side

  // Disable right-click and copy
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      // Optional: alert('Secure Environment: Copying is disabled.');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);

  // Get rudimentary IP if possible (optional, usually requires API)
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => setIp(data.ip))
      .catch(() => {});
  }, []);

  return (
    <div className='fixed inset-0 pointer-events-none z-[9999] overflow-hidden'>
      {/* 1. HUD BORDER (Red Pulse) */}
      <div className='absolute inset-0 border-[4px] border-red-500/20 animate-pulse' />

      {/* 2. TOP HUD: ROOM STATUS */}
      <div className='absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 backdrop-blur border border-red-500/30 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.3)]'>
        <ShieldAlert className='w-5 h-5 text-red-500 animate-pulse' />
        <span className='text-red-500 font-mono font-bold uppercase tracking-widest text-xs'>
          Ultra Security Protocol Active
        </span>
        <div className='w-1.5 h-1.5 rounded-full bg-red-500 animate-ping' />
      </div>

      {/* 3. WATERMARK TILES (Pattern) */}
      <div
        className='absolute inset-0 opacity-[0.03] select-none'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-family='monospace' font-size='14' fill='white' text-anchor='middle' transform='rotate(-45 100 100)'%3E CONFIDENTIAL %3C/text%3E%3C/svg%3E")`,
        }}
      />

      {/* 4. DYNAMIC USER WATERMARK (Floating) */}
      <motion.div
        animate={{
          x: [0, 100, -100, 0],
          y: [0, -100, 100, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className='absolute inset-0 flex items-center justify-center pointer-events-none'
      >
        <div className='text-white/5 font-black text-6xl uppercase tracking-[1em] rotate-[-30deg] whitespace-nowrap'>
          {roomId}
        </div>
      </motion.div>

      {/* 5. BOTTOM USER INFO */}
      <div className='absolute bottom-4 right-4 text-right'>
        <p className='text-[10px] text-red-500/50 font-mono uppercase'>ID: {userName}</p>
        <p className='text-[10px] text-red-500/30 font-mono uppercase'>IP: {ip}</p>
        <p className='text-[10px] text-red-500/30 font-mono uppercase'>
          SESSION: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* 6. WARNING BANNER (On Copy Attempt - logic handled via toast usually, but visual here) */}
    </div>
  );
};
