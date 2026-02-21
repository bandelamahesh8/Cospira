import React, { useState } from 'react';
import { BarChart3, CheckCircle2, Users, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIPollProps {
  id: string;
  question: string;
  options: string[];
  expiresAt: number;
  onVote: (optionIndex: number) => void;
  results?: Record<string, number>;
  totalVotes?: number;
}

const AIPoll: React.FC<AIPollProps> = ({ 
  question, 
  options, 
  expiresAt, 
  onVote, 
  results = {}, 
  totalVotes = 0 
}) => {
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const isExpired = Date.now() > expiresAt;

  const handleVote = (index: number) => {
    if (votedIndex !== null || isExpired) return;
    setVotedIndex(index);
    onVote(index);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-sm"
    >
      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/10 p-5 border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Live Consensus</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{isExpired ? 'Closed' : 'Active'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-2 py-1 rounded-full border border-white/5">
            <Users className="w-3 h-3" />
            {totalVotes} Votes
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <p className="text-sm font-bold leading-relaxed text-white">{question}</p>
        
        <div className="space-y-3">
          {options.map((option, index) => {
            const votes = results[index] || 0;
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isVoted = votedIndex === index;

            return (
              <motion.button
                key={index}
                onClick={() => handleVote(index)}
                disabled={votedIndex !== null || isExpired}
                whileHover={votedIndex === null && !isExpired ? { scale: 1.02 } : {}}
                whileTap={votedIndex === null && !isExpired ? { scale: 0.98 } : {}}
                className={`w-full text-left relative group transition-all duration-300 outline-none rounded-xl overflow-hidden`}
              >
                <div className={`
                  relative p-4 border transition-colors z-10
                  ${isVoted 
                    ? 'bg-indigo-500/20 border-indigo-500/40' 
                    : 'bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/10'
                  }
                `}>
                  {/* Progress Background */}
                  {(votedIndex !== null || isExpired) && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 bg-white/5 z-0"
                    />
                  )}

                  <div className="relative z-10 flex justify-between items-center gap-4">
                    <span className={`text-xs font-bold ${isVoted ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{option}</span>
                    <div className="flex items-center gap-3">
                        {(votedIndex !== null || isExpired) && (
                            <span className="text-[10px] font-black text-white/40 font-mono">{percentage}%</span>
                        )}
                        {isVoted && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                            </motion.div>
                        )}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="bg-white/5 px-6 py-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
            {isExpired ? 'Protocol Ended' : 'Voting Secure • Anonymous'}
        </span>
        <Activity className="w-3 h-3 text-white/20" />
      </div>
    </motion.div>
  );
};

export default AIPoll;
