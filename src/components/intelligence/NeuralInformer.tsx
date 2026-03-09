import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';

interface NeuralInformerProps {
  children: React.ReactNode;
  title: string;
  description: string;
  delay?: number; // milliseconds
  className?: string;
}

export const NeuralInformer: React.FC<NeuralInformerProps> = ({
  children,
  title,
  description,
  delay = 2000,
  className = 'relative inline-block',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsVisible(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{
              position: 'fixed',
              left: mousePos.x + 15,
              top: mousePos.y + 15,
              zIndex: 10000,
              pointerEvents: 'none',
            }}
            className='w-64 bg-[#0c1016]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5 shadow-[0_0_40px_rgba(99,102,241,0.2)] overflow-hidden'
          >
            {/* Ambient Glow */}
            <div className='absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 blur-[30px]' />

            <div className='relative z-10'>
              <div className='flex items-center gap-2 mb-3'>
                <div className='p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/20'>
                  <Bot className='w-3.5 h-3.5 text-indigo-400' />
                </div>
                <span className='text-[9px] font-black uppercase tracking-[0.2em] text-white/40'>
                  AI Intelligence Insight
                </span>
              </div>

              <h4 className='text-xs font-black text-white uppercase italic mb-2 tracking-tight group-hover:text-indigo-400 transition-colors'>
                {title}
              </h4>

              <p className='text-[10px] text-white/50 leading-relaxed font-medium'>{description}</p>

              <div className='mt-4 pt-3 border-t border-white/5 flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  <Sparkles className='w-2.5 h-2.5 text-indigo-400' />
                  <span className='text-[8px] font-black text-indigo-400/50 uppercase tracking-widest'>
                    Neural Link Active
                  </span>
                </div>
                <span className='text-[8px] font-mono text-white/10 uppercase'>v4.0</span>
              </div>
            </div>

            {/* Animated Border Gradient (Bottom) */}
            <div className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent' />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
