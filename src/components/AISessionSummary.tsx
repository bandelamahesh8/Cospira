import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AISessionSummary = () => {
  const [expanded, setExpanded] = useState(false);

  // Simulated AI Output
  const summary = {
    title: 'Session Sync & Roadmap Planning',
    keyPoints: [
      'Finalized the auth flow architecture.',
      'Identified 3 edge cases in role transitions.',
      'Agreed to push the UI overhaul to next sprint.',
    ],
    actionItems: [
      { id: '1', task: 'Update Supabase RLS policies for MIXED mode.', assignee: 'Alex' },
      { id: '2', task: 'Draft the AI matchmaking logic.', assignee: 'Sam' },
    ],
    sentiment: 'Productive & Focused',
    generatedAt: 'Just now',
  };

  return (
    <div className='bg-white/[0.02] border border-emerald-500/10 rounded-3xl overflow-hidden mt-6'>
      <button
        onClick={() => setExpanded(!expanded)}
        className='w-full flex items-center justify-between p-5 focus:outline-none hover:bg-white/[0.02] transition-colors'
      >
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20'>
            <Bot size={16} />
          </div>
          <div className='text-left'>
            <h3 className='text-[10px] font-black uppercase tracking-widest text-emerald-400/80 mb-0.5'>
              Auto-Generated Summary
            </h3>
            <p className='text-[9px] text-white/30 uppercase tracking-widest font-bold'>
              Powered by Neural Insights
            </p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-[9px] font-mono text-white/20'>{summary.generatedAt}</span>
          <span className='text-emerald-400/50 transition-transform duration-300'>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className='px-5 pb-5 border-t border-white/5'
          >
            <div className='pt-4 space-y-5'>
              <div>
                <h4 className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 mb-2'>
                  <FileText className='w-3.5 h-3.5' /> Core Directives
                </h4>
                <ul className='space-y-1.5 pl-1'>
                  {summary.keyPoints.map((point, i) => (
                    <li key={i} className='text-xs text-white/70 flex items-start gap-2'>
                      <span className='text-emerald-500/50 mt-1'>•</span>
                      <span className='leading-relaxed'>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 mb-2'>
                  <CheckCircle2 className='w-3.5 h-3.5' /> Action Items
                </h4>
                <div className='space-y-2'>
                  {summary.actionItems.map((item) => (
                    <div
                      key={item.id}
                      className='bg-black/20 rounded-xl p-3 border border-white/5 flex gap-3 items-center'
                    >
                      <div className='w-3 h-3 rounded border border-white/20 flex-shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs text-white/80 truncate'>{item.task}</p>
                      </div>
                      <div className='bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border border-emerald-500/20 whitespace-nowrap'>
                        {item.assignee}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='flex items-center justify-between pt-3 border-t border-white/5'>
                <div className='flex items-center gap-2 text-[10px]'>
                  <span className='text-white/30 font-bold uppercase tracking-widest'>
                    Sentiment:
                  </span>
                  <span className='text-emerald-400 tracking-wide'>{summary.sentiment}</span>
                </div>
                <button className='text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors'>
                  Export to Wiki
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AISessionSummary;
