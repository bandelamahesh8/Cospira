import React, { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Info,
  X,
  Printer,
  Download,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { MeetingSummary } from '@/contexts/WebSocketContextValue';
import { UI_TEXT } from '@/utils/terminology';
import { motion, AnimatePresence } from 'framer-motion';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose }) => {
  const { socket, roomId, meetingSummary: liveSummary, messages } = useWebSocket();
  const [isGenerating, setIsGenerating] = useState(false);
  const [localSummary, setLocalSummary] = useState<MeetingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = localSummary || liveSummary;

  const handleGenerate = () => {
    if (!socket || !roomId) return;
    setIsGenerating(true);
    setError(null);
    setLocalSummary(null);

    socket.emit(
      'ai:generate-summary',
      { roomId },
      (response: { success: boolean; summary?: MeetingSummary; error?: string }) => {
        setIsGenerating(false);
        if (response.success && response.summary) {
          setLocalSummary(response.summary);
        } else {
          setError(response.error || 'Failed to generate summary');
        }
      }
    );
  };

  const handleExportTXT = () => {
    if (!summary) return;
    const text = `
COSPIRA INTELLIGENCE REPORT
Date: ${new Date().toLocaleString()}
----------------------------------------

SUMMARY
"${summary.summary}"

KEY TAKEAWAYS
${summary.bullets?.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n') || 'None'}

ACTION ITEMS
${summary.actionItems?.map((item) => `- [${item.status || ' '}] ${item.text} (${item.owner || 'Unassigned'})`).join('\n') || 'None'}

DECISIONS
${summary.decisions?.map((d) => `- ${d.decision}`).join('\n') || 'None'}
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cospira-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportRaw = () => {
    const text = messages
      .map((m) => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.userName}: ${m.content}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cospira-raw-log-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white print:static'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/80 backdrop-blur-md print:hidden'
          />

          <style>{`
                        @media print {
                            body * { visibility: hidden; }
                            #printable-summary, #printable-summary * { visibility: visible; }
                            #printable-summary { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; color: black; background: white; }
                            @page { margin: 2cm; }
                        }
                    `}</style>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className='relative w-full max-w-4xl h-[85vh] bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden print:shadow-none print:border-none print:max-h-none print:w-full print:max-w-none print:rounded-none'
          >
            {/* Header */}
            <div className='relative px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 print:hidden z-10 bg-[#0A0A0A]'>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)]'>
                  <Sparkles className='w-6 h-6 text-indigo-400' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <h2 className='text-xl font-black italic uppercase tracking-tighter text-white'>
                      {UI_TEXT.INTELLIGENCE_REPORT}
                    </h2>
                    <div className='px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-widest text-indigo-300'>
                      Confidential
                    </div>
                  </div>
                  <p className='text-[10px] text-white/40 font-mono mt-1 flex items-center gap-2'>
                    <Layers className='w-3 h-3' />
                    AI-Generated Transcript Analysis
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className='w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/50 hover:text-white'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Content */}
            <ScrollArea className='flex-1 print:overflow-visible bg-[#0A0A0A] relative'>
              {/* Background decorations */}
              <div className='absolute inset-0 pointer-events-none opacity-20 print:hidden'>
                <div className='absolute top-0 right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 blur-[150px] rounded-full' />
                <div className='absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-purple-900/20 blur-[150px] rounded-full' />
              </div>

              <div className='p-8 md:p-12 relative z-10' id='printable-summary'>
                {!summary && !isGenerating && !error && (
                  <div className='flex flex-col items-center justify-center py-20 text-center'>
                    <div className='w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse-slow'>
                      <Sparkles className='w-10 h-10 text-white/20' />
                    </div>
                    <h3 className='text-2xl font-bold text-white mb-2'>Awaiting Analysis</h3>
                    <p className='text-white/40 max-w-md mb-8 leading-relaxed'>
                      Initiate the intelligence protocol to extract key decisions, action items, and
                      summaries from the conversation logic.
                    </p>
                    <Button
                      onClick={handleGenerate}
                      className='h-14 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all hover:scale-105'
                    >
                      <Sparkles className='w-4 h-4' />
                      Generate Report
                    </Button>
                  </div>
                )}

                {isGenerating && (
                  <div className='flex flex-col items-center justify-center py-24 space-y-6'>
                    <div className='relative w-20 h-20'>
                      <div className='absolute inset-0 border-4 border-indigo-500/20 rounded-full'></div>
                      <div className='absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin'></div>
                    </div>
                    <div className='text-center'>
                      <p className='text-lg font-bold text-white tracking-wide'>
                        Processing Audio Data
                      </p>
                      <p className='text-xs font-mono text-indigo-400 mt-2 animate-pulse'>
                        Filtering relevant vectors...
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className='bg-red-500/5 border border-red-500/20 p-8 rounded-3xl text-center max-w-lg mx-auto'>
                    <Info className='w-10 h-10 text-red-500 mx-auto mb-4' />
                    <h3 className='text-lg font-bold text-white mb-2'>Analysis Failed</h3>
                    <p className='text-white/60 mb-6'>{error}</p>
                    <div className='flex justify-center gap-3'>
                      <Button
                        variant='outline'
                        onClick={handleExportRaw}
                        className='bg-transparent border-white/10 hover:bg-white/5 text-white'
                      >
                        Download Raw Logs
                      </Button>
                      <Button
                        onClick={handleGenerate}
                        className='bg-white text-black hover:bg-gray-200'
                      >
                        Retry Protocol
                      </Button>
                    </div>
                  </div>
                )}

                {summary && (
                  <div className='space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-500'>
                    {/* Executive Summary */}
                    <div className='relative p-8 rounded-3xl bg-white/5 border border-white/10 overflow-hidden group'>
                      <div className='absolute top-0 right-0 p-4 opacity-50'>
                        <FileText className='w-24 h-24 text-white/5 -rotate-12' />
                      </div>
                      <h3 className='text-xs font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2'>
                        <div className='w-1.5 h-1.5 bg-indigo-500 rounded-full' /> Executive Summary
                      </h3>
                      <p className='text-lg md:text-xl leading-relaxed text-white/90 font-medium relative z-10'>
                        "{summary.summary}"
                      </p>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                      {/* Key Takeaways */}
                      <div className='space-y-6'>
                        <h3 className='text-sm font-bold uppercase tracking-wider text-white flex items-center gap-3 pb-2 border-b border-white/10'>
                          <span className='text-indigo-400'>01</span> Key Takeaways
                        </h3>
                        <ul className='space-y-4'>
                          {(summary.bullets || []).map((bullet: string, i: number) => (
                            <li key={i} className='flex gap-4 group'>
                              <span className='shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-colors'>
                                {i + 1}
                              </span>
                              <span className='text-sm text-white/70 leading-relaxed group-hover:text-white transition-colors'>
                                {bullet}
                              </span>
                            </li>
                          ))}
                          {(!summary.bullets || summary.bullets.length === 0) && (
                            <li className='text-sm text-white/30 italic pl-10'>
                              No key points extracted.
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Action Items & Decisions */}
                      <div className='space-y-10'>
                        {/* Actions */}
                        <div className='space-y-6'>
                          <h3 className='text-sm font-bold uppercase tracking-wider text-white flex items-center gap-3 pb-2 border-b border-white/10'>
                            <span className='text-emerald-400'>02</span> Action Items
                          </h3>
                          <div className='space-y-3'>
                            {(summary.actionItems || []).map((item, i: number) => (
                              <div
                                key={i}
                                className='p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group'
                              >
                                <div className='flex items-start gap-3'>
                                  <div className='mt-0.5 w-4 h-4 rounded border border-white/30 flex items-center justify-center group-hover:border-emerald-500 transition-colors'>
                                    {item.status === 'completed' && (
                                      <div className='w-2 h-2 bg-emerald-500 rounded-[1px]' />
                                    )}
                                  </div>
                                  <div>
                                    <p className='text-sm font-medium text-white/90 group-hover:text-white'>
                                      {item.text}
                                    </p>
                                    {item.owner && (
                                      <p className='text-[10px] text-white/40 mt-1 uppercase tracking-wider'>
                                        Assigned:{' '}
                                        <span className='text-emerald-400 font-bold'>
                                          {item.owner}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(!summary.actionItems || summary.actionItems.length === 0) && (
                              <p className='text-sm text-white/30 italic pl-2'>
                                No tasks assigned.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Decisions */}
                        <div className='space-y-6'>
                          <h3 className='text-sm font-bold uppercase tracking-wider text-white flex items-center gap-3 pb-2 border-b border-white/10'>
                            <span className='text-amber-400'>03</span> Decisions
                          </h3>
                          <div className='space-y-3'>
                            {(summary.decisions || []).map((decision, i: number) => (
                              <div
                                key={i}
                                className='flex gap-3 items-start p-3 rounded-xl bg-amber-500/10 border border-amber-500/20'
                              >
                                <CheckCircle2 className='w-4 h-4 text-amber-500 mt-0.5 shrink-0' />
                                <p className='text-sm font-medium text-amber-200/90'>
                                  {decision.decision}
                                </p>
                              </div>
                            ))}
                            {(!summary.decisions || summary.decisions.length === 0) && (
                              <p className='text-sm text-white/30 italic pl-2'>
                                No decisions recorded.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer - Actions */}
            {summary && (
              <div className='p-6 border-t border-white/10 bg-[#0A0A0A] flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 print:hidden relative z-20'>
                <p className='text-[10px] text-white/30 font-mono hidden md:block uppercase tracking-widest'>
                  Generated {new Date(summary.timestamp || Date.now()).toLocaleString()}
                </p>
                <div className='flex gap-3 w-full md:w-auto'>
                  <Button
                    variant='outline'
                    onClick={handleExportTXT}
                    className='flex-1 md:flex-none bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white h-11 rounded-xl uppercase text-[10px] font-bold tracking-widest gap-2'
                  >
                    <Download className='w-3 h-3' />
                    Save TXT
                  </Button>
                  <Button
                    variant='outline'
                    onClick={handlePrint}
                    className='flex-1 md:flex-none bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white h-11 rounded-xl uppercase text-[10px] font-bold tracking-widest gap-2'
                  >
                    <Printer className='w-3 h-3' />
                    PDF
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    className='flex-1 md:flex-none bg-white text-black hover:bg-gray-200 h-11 rounded-xl uppercase text-[10px] font-black tracking-widest gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  >
                    <RefreshCw className='w-3 h-3' />
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SummaryModal;
