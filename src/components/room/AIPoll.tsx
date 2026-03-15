import React, { useState } from 'react';
import { BarChart3, CheckCircle2, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIPollProps {
  id: string;
  question: string;
  options: string[];
  expiresAt: number;
  onVote: (optionIndex: number) => void;
  onEndPoll?: () => void;
  onDismiss?: () => void;
  results?: Record<string, number>;
  voters?: Record<string, { id: string; name: string }[]>;
  totalVotes?: number;
  onlySelectOption?: boolean;
  isHostOrSuperHost?: boolean;
  type?: 'POLL' | 'QUIZ';
  correctOption?: number;
}

const AIPoll: React.FC<AIPollProps> = (props) => {
  const {
    question,
    options,
    expiresAt,
    onVote,
    onEndPoll,
    onDismiss,
    results = {},
    voters = {},
    totalVotes = 0,
    onlySelectOption = false,
    isHostOrSuperHost = false,
    type = 'POLL',
    correctOption,
  } = props;


  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showVoters, setShowVoters] = useState(false);
  const isExpired = Date.now() > expiresAt;
  const isQuiz = type === 'QUIZ';

  React.useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleVote = (index: number) => {

    if (votedIndex !== null || isExpired) return;
    setVotedIndex(index);
    onVote(index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className='bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden w-full max-w-sm'
    >
      <div className='bg-white/5 p-6 border-b border-white/5 relative overflow-hidden'>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />

        <div className='relative z-10 flex items-center justify-between gap-8'>
          <div className='flex items-center gap-4 flex-1 min-w-0'>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${isQuiz ? 'bg-purple-500/10 border-purple-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
              <BarChart3 className={`w-5 h-5 ${isQuiz ? 'text-purple-400' : 'text-indigo-400'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${isQuiz ? 'text-purple-400' : 'text-indigo-400'}`}>
                  {isQuiz ? 'Objective Query' : 'Live Consensus'}
                </h3>
                <div className='flex items-center gap-1.5'>
                  <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className='text-[9px] font-bold text-white/40 uppercase tracking-wider'>
                    {isExpired ? (isQuiz ? 'Protocol Resolved' : 'Closed') : timeLeft}
                  </span>
                </div>
              </div>
              <p className='text-base font-bold leading-tight text-white mt-1 truncate'>{question}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {(isHostOrSuperHost || !onlySelectOption) && (
              <button 
                onClick={() => isHostOrSuperHost && setShowVoters(!showVoters)}
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${
                  showVoters 
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' 
                    : 'text-white/40 bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <Users className='w-3.5 h-3.5' />
                {totalVotes}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='p-6 space-y-4'>
        <div className='space-y-3'>
          {options.map((option, index) => {
            const votes = results?.[index] || 0;
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isVoted = votedIndex === index;
            const isCorrect = isQuiz && correctOption === index;
            const shouldReveal = isExpired && isQuiz;
            const votersList = voters[index.toString()] || [];

            return (
              <div key={index} className='space-y-1'>
                <motion.button
                  onClick={() => handleVote(index)}
                  disabled={votedIndex !== null || isExpired}
                  whileHover={votedIndex === null && !isExpired ? { scale: 1.01 } : {}}
                  whileTap={votedIndex === null && !isExpired ? { scale: 0.99 } : {}}
                  className={`w-full text-left relative group transition-all duration-300 outline-none rounded-2xl overflow-hidden`}
                >
                  <div
                    className={`
                    relative p-4 border transition-colors z-10
                    ${
                      shouldReveal && isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : shouldReveal && isVoted && !isCorrect
                          ? 'bg-red-500/10 border-red-500/40'
                          : isVoted
                            ? 'bg-indigo-500/20 border-indigo-500/40'
                            : 'bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/10'
                    }
                  `}
                  >
                    {/* Progress Background */}
                    {(votedIndex !== null || isExpired) && (isHostOrSuperHost || !onlySelectOption) && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`absolute inset-y-0 left-0 z-0 ${shouldReveal && isCorrect ? 'bg-emerald-500/10' : 'bg-white/5'}`}
                      />
                    )}

                    <div className='relative z-10 flex justify-between items-center gap-4'>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${
                            shouldReveal && isCorrect 
                              ? 'text-emerald-400' 
                              : isVoted ? 'text-white' : 'text-white/70 group-hover:text-white'
                          }`}
                        >
                          {option}
                        </span>
                        {shouldReveal && isCorrect && (
                          <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            Correct
                          </span>
                        )}
                      </div>
                      <div className='flex items-center gap-3'>
                        {(votedIndex !== null || isExpired) && (isHostOrSuperHost || !onlySelectOption) && (
                          <span className={`text-[10px] font-black font-mono ${shouldReveal && isCorrect ? 'text-emerald-400/60' : 'text-white/40'}`}>
                            {percentage}%
                          </span>
                        )}
                        {isVoted && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            {shouldReveal && !isCorrect ? (
                              <X className='w-4 h-4 text-red-400' />
                            ) : (
                              <CheckCircle2 className={`w-4 h-4 ${shouldReveal && isCorrect ? 'text-emerald-400' : 'text-indigo-400'}`} />
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>

                {isHostOrSuperHost && showVoters && votersList.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className='px-3 py-2 flex flex-wrap gap-1.5'
                  >
                    {votersList.map((v: { id: string; name: string }) => (
                      <span
                        key={v.id}
                        className='text-[9px] font-medium bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-white/40'
                      >
                        {v.name}
                      </span>
                    ))}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className='bg-white/5 px-8 py-4 border-t border-white/5 flex items-center justify-between'>
        <div className='flex items-center gap-6'>
          <span className='text-[9px] font-black uppercase tracking-widest text-white/40'>
            {isExpired ? 'Protocol Ended' : (isQuiz ? 'Assessment Active' : 'Voting Active')}
          </span>
          <div className="flex items-center gap-4">
            {isHostOrSuperHost && !isExpired && (
              <button
                type="button"
                onClick={() => onEndPoll?.()}
                className='text-[9px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest'
              >
                Terminate
              </button>
            )}
            {isExpired && (
              <button
                type="button"
                onClick={() => onDismiss?.()}
                className='text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest'
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AIPoll;
