import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, BarChart3, Globe, Lock, Building2, HelpCircle, Check, History, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PollData } from '@/types/websocket';

interface ManualPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    question: string;
    options: string[];
    scope: 'CURRENT' | 'ALL' | 'SPECIFIC';
    onlySelectOption: boolean;
    duration: number;
    type: 'POLL' | 'QUIZ';
    correctOption?: number;
  }) => void;
  isSuperHost: boolean;
  pollHistory?: PollData[];
  onFetchHistory?: () => void;
}

const ManualPollModal: React.FC<ManualPollModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSuperHost,
  pollHistory = [],
  onFetchHistory,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [scope, setScope] = useState<'CURRENT' | 'ALL' | 'SPECIFIC'>('CURRENT');
  const [onlySelectOption, setOnlySelectOption] = useState(false);
  const [duration, setDuration] = useState(5); // Default 5 minutes
  const [pollType, setPollType] = useState<'POLL' | 'QUIZ'>('POLL');
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [isShowingHistory, setIsShowingHistory] = useState(false);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({ title: 'Error', description: 'Please enter a question', variant: 'destructive' });
      return;
    }
    const filteredOptions = options.map(o => o.trim()).filter(o => o !== '');
    if (filteredOptions.length < 2) {
      toast({ title: 'Error', description: 'Please provide at least 2 options', variant: 'destructive' });
      return;
    }
    if (pollType === 'QUIZ' && correctOption === null) {
      toast({ title: 'Error', description: 'Please select a correct answer for the quiz', variant: 'destructive' });
      return;
    }
    onSubmit({ 
      question, 
      options: filteredOptions, 
      scope, 
      onlySelectOption, 
      duration,
      type: pollType,
      correctOption: pollType === 'QUIZ' ? correctOption! : undefined
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className='bg-[#0F0F0F]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden w-full max-w-5xl'
          >
            {/* Header */}
            <div className='bg-white/5 p-6 border-b border-white/5 relative'>
              <div className='absolute inset-0 bg-[url("/grid.svg")] opacity-[0.03]' />
              <div className='relative flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  <div className='w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5'>
                    {isShowingHistory ? <History className='w-5 h-5 text-purple-400' /> : <BarChart3 className='w-5 h-5 text-indigo-400' />}
                  </div>
                  <div>
                    <h2 className='text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60'>
                      {isShowingHistory ? 'Protocol Archive' : 'Create Protocol Poll'}
                    </h2>
                    <p className='text-[9px] text-white/40 uppercase tracking-[0.2em] font-black mt-0.5'>
                      Consensus Infrastructure • v2.7
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  {!isShowingHistory && (
                    <button
                      onClick={() => {
                        setIsShowingHistory(true);
                        onFetchHistory?.();
                      }}
                      className='px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-lg'
                    >
                      <History className='w-3.5 h-3.5' />
                      History
                    </button>
                  )}
                  {isShowingHistory && (
                    <button
                      onClick={() => setIsShowingHistory(false)}
                      className='px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/20 transition-all'
                    >
                      <ArrowLeft className='w-3.5 h-3.5' />
                      Back
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className='w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors group'
                  >
                    <X className='w-4 h-4 text-white/40 group-hover:text-white transition-colors' />
                  </button>
                </div>
              </div>
            </div>

            {isShowingHistory ? (
              /* History View */
              <div className='p-8 min-h-[400px] flex flex-col'>
                <div className='flex items-center justify-between mb-6 px-2'>
                  <label className='text-[10px] font-black text-white/40 uppercase tracking-widest'>
                    Session Records
                  </label>
                  <span className='text-[9px] font-bold text-white/20 uppercase tracking-widest'>
                    {pollHistory.length} Polls Broadcasted
                  </span>
                </div>

                <div className='flex-1 space-y-3 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar'>
                  {pollHistory.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-20 text-white/20'>
                      <History className='w-12 h-12 mb-4 opacity-10' />
                      <p className='text-xs font-bold uppercase tracking-widest'>No archival data found</p>
                    </div>
                  ) : (
                    [...pollHistory].reverse().map((poll, idx) => (
                      <div 
                        key={poll.id || idx}
                        className='group bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/[0.08] hover:border-white/10 transition-all cursor-default'
                      >
                        <div className='flex items-start justify-between gap-4'>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 mb-2'>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                                poll.type === 'QUIZ' 
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {poll.type || 'POLL'}
                              </span>
                              <span className='text-[8px] font-bold text-white/20 uppercase tracking-widest'>
                                {new Date(parseInt(poll.id.split('-')[1])).toLocaleTimeString()}
                              </span>
                            </div>
                            <h4 className='text-sm font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors line-clamp-2'>
                              {poll.question}
                            </h4>
                            <div className='flex flex-wrap gap-2'>
                              {poll.options.map((opt: string, i: number) => (
                                <span key={i} className='text-[9px] bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-white/40 font-medium'>
                                  {opt}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className='text-right shrink-0'>
                            <div className='text-xl font-black text-white/10 group-hover:text-white/20 transition-colors'>
                              #{(pollHistory.length - idx).toString().padStart(2, '0')}
                            </div>
                            <div className='text-[10px] font-bold text-indigo-400/40 mt-1 uppercase tracking-tighter'>
                                {poll.totalVotes || 0} Votes
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Creation Form */
              <form onSubmit={handleSubmit} className='p-0 flex flex-col md:flex-row divide-x divide-white/5'>
                {/* Left Column: Configuration */}
                <div className='flex-1 p-8 space-y-8 bg-white/[0.01]'>
                  {/* Question Area */}
                  <div className='space-y-3'>
                    <label className='text-[10px] font-black text-white/40 uppercase tracking-widest block px-1'>
                      System Query
                    </label>
                    <textarea
                      autoFocus
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder='Enter your consensus query here...'
                      rows={3}
                      className='w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all resize-none'
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Poll Type */}
                    <div className='space-y-3 col-span-2'>
                      <label className='text-[10px] font-black text-white/40 uppercase tracking-widest block px-1'>
                        Protocol Mode
                      </label>
                      <div className='flex bg-white/5 p-1 rounded-2xl border border-white/5'>
                        <button
                          type='button'
                          onClick={() => {
                            setPollType('POLL');
                            setCorrectOption(null);
                          }}
                          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                            pollType === 'POLL' ? 'bg-indigo-500/20 text-indigo-400 shadow-inner' : 'text-white/40 hover:text-white/60'
                          }`}
                        >
                          <BarChart3 className='w-3.5 h-3.5' />
                          <span className='text-[9px] font-bold uppercase tracking-wider'>Consensus</span>
                        </button>
                        <button
                          type='button'
                          onClick={() => setPollType('QUIZ')}
                          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                            pollType === 'QUIZ' ? 'bg-purple-500/20 text-purple-400 shadow-inner' : 'text-white/40 hover:text-white/60'
                          }`}
                        >
                          <HelpCircle className='w-3.5 h-3.5' />
                          <span className='text-[9px] font-bold uppercase tracking-wider'>Quiz / Q&A</span>
                        </button>
                      </div>
                    </div>

                    {/* Broadcast Scope */}
                    <div className='space-y-3'>
                      <label className='text-[10px] font-black text-white/40 uppercase tracking-widest px-1'>
                        Broadcast Scope
                      </label>
                      <div className='flex bg-white/5 p-1 rounded-xl border border-white/5'>
                        <button
                          type='button'
                          onClick={() => setScope('CURRENT')}
                          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                            scope === 'CURRENT' ? 'bg-indigo-500/20 text-indigo-400 shadow-inner' : 'text-white/40 hover:text-white/60'
                          }`}
                        >
                          <Building2 className='w-3 h-3' />
                          <span className='text-[8px] font-bold uppercase'>Room</span>
                        </button>
                        {isSuperHost && (
                            <button
                              type='button'
                              onClick={() => setScope('ALL')}
                              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                                scope === 'ALL' ? 'bg-indigo-500/20 text-indigo-400 shadow-inner' : 'text-white/40 hover:text-white/60'
                              }`}
                            >
                              <Globe className='w-3 h-3' />
                              <span className='text-[8px] font-bold uppercase'>Global</span>
                            </button>
                        )}
                      </div>
                    </div>

                    {/* Protocol Duration */}
                    <div className='space-y-3'>
                      <label className='text-[10px] font-black text-white/40 uppercase tracking-widest px-1'>
                        Duration
                      </label>
                      <div className='flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5'>
                        <input
                          type='number'
                          min='1'
                          max='60'
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                          className='w-10 bg-transparent text-center text-[11px] font-bold text-indigo-400 focus:outline-none'
                        />
                        <span className='text-[9px] font-bold text-white/20 uppercase'>Mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Protocols */}
                  <div className='space-y-3'>
                    <label className='text-[10px] font-black text-white/40 uppercase tracking-widest px-1'>
                      Security Protocols
                    </label>
                    <button
                      type='button'
                      onClick={() => setOnlySelectOption(!onlySelectOption)}
                      className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between ${
                        onlySelectOption
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-white/5 border-white/5 text-white/40'
                      }`}
                    >
                      <div className='flex items-center gap-2'>
                        <Lock className='w-3.5 h-3.5' />
                        <span className='text-[9px] font-bold uppercase'>Hide Results from Non-Hosts</span>
                      </div>
                      <div className={`w-6 h-3 rounded-full relative transition-colors ${onlySelectOption ? 'bg-amber-400' : 'bg-white/10'}`}>
                          <div className={`absolute top-0.5 w-2 h-2 rounded-full transition-all ${onlySelectOption ? 'right-0.5 bg-white' : 'left-0.5 bg-white/20'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Right Column: Parameters & Options */}
                <div className='flex-[1.2] p-8 space-y-6 flex flex-col'>
                  <div className='flex items-center justify-between px-1'>
                    <label className='text-[10px] font-black text-white/40 uppercase tracking-widest'>
                      Response Parameters {pollType === 'QUIZ' && <span className="text-purple-400 ml-1">• MARK CORRECT</span>}
                    </label>
                    <span className='text-[9px] font-bold text-white/20 uppercase tracking-tighter'>
                      {options.length}/6 Options
                    </span>
                  </div>

                  <div className='flex-1 space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar'>
                    {options.map((option, index) => (
                      <div key={index} className='flex items-center gap-3 group'>
                        <div className='flex-1 relative'>
                          <input
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className={`w-full bg-white/5 border border-white/5 rounded-xl p-3.5 text-xs text-white focus:outline-none transition-all pl-10 pr-12 ${
                              pollType === 'QUIZ' && correctOption === index ? 'border-purple-500/40 bg-purple-500/5' : 'focus:border-indigo-500/40'
                            }`}
                          />
                          <div className='absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 font-mono'>
                            {index + 1}
                          </div>
                          
                          {pollType === 'QUIZ' && (
                            <button
                              type="button"
                              onClick={() => setCorrectOption(index)}
                              className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border transition-all flex items-center justify-center ${
                                correctOption === index 
                                  ? 'bg-purple-500 border-purple-500 text-white' 
                                  : 'border-white/10 text-transparent hover:border-purple-500/40 hover:text-purple-500/40'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {options.length > 2 && (
                          <button
                            type='button'
                            onClick={() => handleRemoveOption(index)}
                            className='p-2 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {options.length < 6 && (
                      <button
                        type='button'
                        onClick={handleAddOption}
                        className='w-full p-3.5 rounded-xl border border-dashed border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:border-indigo-500/20 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 mt-2'
                      >
                        <Plus className='w-3 h-3' />
                        Append Parameter
                      </button>
                    )}
                  </div>

                  <div className='pt-6 border-t border-white/5'>
                    <button
                      type='submit'
                      className='w-full py-4 rounded-3xl bg-indigo-500 text-white font-bold text-sm tracking-widest uppercase hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30'
                    >
                      Deploy Protocol
                    </button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ManualPollModal;
