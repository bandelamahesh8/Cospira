import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MeetingSummary } from '@/services/ai/AISummaryService';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, Sparkles, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MeetingSummaryModalProps {
  open: boolean;
  onClose: () => void;
  summary: MeetingSummary | null;
  loading: boolean;
}

export const MeetingSummaryModal = ({
  open,
  onClose,
  summary,
  loading,
}: MeetingSummaryModalProps) => {
  // Theme selection based on mode (if summary exists)
  const mode = summary?.mode || 'professional';

  const getTheme = () => {
    if (mode === 'ultra')
      return {
        bg: 'bg-[#050000]',
        accent: 'text-red-500',
        border: 'border-red-900/50',
        icon: ShieldCheck,
      };
    if (mode === 'fun')
      return {
        bg: 'bg-[#1a0b2e]',
        accent: 'text-pink-500',
        border: 'border-pink-500/30',
        icon: Sparkles,
      };
    return {
      bg: 'bg-[#0f172a]',
      accent: 'text-indigo-400',
      border: 'border-slate-700',
      icon: FileText,
    };
  };

  const theme = getTheme();
  const Icon = theme.icon;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-2xl ${theme.bg} ${theme.border} text-white p-0 overflow-hidden border-2`}
      >
        <div className='p-8 max-h-[85vh] overflow-y-auto custom-scrollbar'>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-20 space-y-4'>
              <div
                className={`w-12 h-12 border-4 ${theme.border} border-t-current ${theme.accent} rounded-full animate-spin`}
              />
              <p className='text-white/40 font-mono text-sm uppercase tracking-widest animate-pulse'>
                Analyzing Session Data...
              </p>
            </div>
          ) : summary ? (
            <div className='space-y-8 animate-in fade-in zoom-in-95 duration-300'>
              {/* Header */}
              <div className='flex items-start justify-between'>
                <div>
                  <div className={`flex items-center gap-2 ${theme.accent} mb-2`}>
                    <Icon className='w-5 h-5' />
                    <span className='text-xs font-black uppercase tracking-[0.2em]'>
                      {summary.mode} MODE
                    </span>
                  </div>
                  <h2 className='text-3xl font-black tracking-tighter uppercase'>
                    {summary.title}
                  </h2>
                  <p className='text-white/40 text-sm mt-1 font-mono'>
                    ID: {summary.id.slice(0, 8)} • {summary.duration}
                  </p>
                </div>
                {mode === 'ultra' && (
                  <div className='px-3 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-[10px] font-black uppercase tracking-widest'>
                    Top Secret
                  </div>
                )}
              </div>

              {/* Highlights */}
              <div className='space-y-4'>
                <h3
                  className={`text-sm font-bold uppercase tracking-widest ${theme.accent} border-b ${theme.border} pb-2`}
                >
                  Key Highlights
                </h3>
                <div className='grid gap-3'>
                  {(summary.highlights || []).map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className='bg-white/5 border border-white/5 p-4 rounded-xl flex items-start gap-3'
                    >
                      <div
                        className={`mt-1 w-1.5 h-1.5 rounded-full ${theme.accent.replace('text-', 'bg-')}`}
                      />
                      <p className='text-sm text-white/80 leading-relaxed'>{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Action Items */}
              <div className='space-y-4'>
                <h3
                  className={`text-sm font-bold uppercase tracking-widest ${theme.accent} border-b ${theme.border} pb-2`}
                >
                  Action Protocol
                </h3>
                <div className='space-y-2'>
                  {(summary.actionItems || []).map((item, i) => (
                    <div
                      key={i}
                      className='flex items-center gap-3 p-2 group cursor-pointer hover:bg-white/5 rounded-lg transition-colors'
                    >
                      <CheckCircle2
                        className={`w-5 h-5 ${theme.accent} opacity-50 group-hover:opacity-100`}
                      />
                      <span className='text-sm font-medium text-white/60 group-hover:text-white transition-colors decoration-white/20 group-hover:decoration-white/40'>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className='flex justify-end gap-3 pt-6 border-t border-white/5'>
                <Button
                  variant='ghost'
                  onClick={onClose}
                  className='text-white/40 hover:text-white'
                >
                  Dismiss
                </Button>
                <Button
                  className={`${theme.accent.replace('text-', 'bg-').replace('400', '600')} hover:bg-opacity-80 text-white border-0`}
                >
                  <Download className='w-4 h-4 mr-2' /> Export
                </Button>
              </div>
            </div>
          ) : (
            <div className='text-center py-20 text-white/40'>
              Failed to generate intelligence report.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
