import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Brain, Shield, Activity as ActivityIcon } from 'lucide-react';

interface IntelligencePanelProps {
  children?: ReactNode;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const IntelligencePanel = ({
  children,
  isCollapsed = false,
  onToggle,
}: IntelligencePanelProps) => {
  return (
    <div className={`h-full flex flex-col ${isCollapsed ? 'p-2' : 'p-6'} transition-all`}>
      {/* Panel Header */}
      <div
        className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between mb-6'}`}
      >
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='flex items-center gap-2'
          >
            <h2 className='text-sm font-black uppercase tracking-widest text-white/40'>
              Intelligence
            </h2>
            <div className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
          </motion.div>
        )}

        <button
          onClick={onToggle}
          className='p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors'
        >
          {isCollapsed ? <ChevronLeft className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
        </button>
      </div>

      {/* Panel Content */}
      <div className='flex-1 overflow-y-auto'>
        {isCollapsed ? (
          <div className='flex flex-col items-center gap-4 mt-4'>
            <div
              className='w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 cursor-pointer hover:bg-cyan-500/20 transition-colors'
              title='AI Summary'
            >
              <Brain className='w-5 h-5' />
            </div>
            <div
              className='w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 cursor-pointer hover:text-white hover:bg-white/10 transition-colors'
              title='Security'
            >
              <Shield className='w-5 h-5' />
            </div>
            <div
              className='w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 cursor-pointer hover:text-white hover:bg-white/10 transition-colors'
              title='Activity'
            >
              <ActivityIcon className='w-5 h-5' />
            </div>
          </div>
        ) : (
          <div className='space-y-6'>{children}</div>
        )}
      </div>
    </div>
  );
};
