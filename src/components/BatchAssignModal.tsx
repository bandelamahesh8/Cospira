import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ArrowRight, Loader2 } from 'lucide-react';
import { OrgMember } from '@/services/BreakoutService';
import { BreakoutSession } from '@/types/organization';
import { ModePolicyResolver } from '@/lib/ModePolicyResolver';

interface BatchAssignModalProps {
  open: boolean;
  selectedMembers: OrgMember[];
  breakouts: BreakoutSession[];
  onAssign: (breakoutId: string, userIds: string[]) => Promise<void>;
  onClose: () => void;
}

const BatchAssignModal: React.FC<BatchAssignModalProps> = ({
  open,
  selectedMembers,
  breakouts,
  onAssign,
  onClose,
}) => {
  const [targetBreakoutId, setTargetBreakoutId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  if (!open) return null;

  const activeBreakouts = breakouts.filter((b) => b.status !== 'CLOSED');

  const handleAssign = async () => {
    if (!targetBreakoutId) return;
    setIsAssigning(true);
    try {
      await onAssign(
        targetBreakoutId,
        selectedMembers.map((m) => m.user_id)
      );
      onClose();
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className='relative glass-card rounded-[28px] p-6 w-full max-w-md z-10'
          >
            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h2 className='text-lg font-black uppercase tracking-tighter text-white italic'>
                  Batch Assign
                </h2>
                <p className='text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mt-0.5'>
                  {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''} Selected
                </p>
              </div>
              <button
                onClick={onClose}
                className='p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Selected members preview */}
            <div className='mb-5'>
              <p className='text-[9px] font-black uppercase tracking-widest text-white/20 mb-2'>
                Assigning
              </p>
              <div className='flex flex-wrap gap-2'>
                {selectedMembers.slice(0, 8).map((m) => (
                  <div
                    key={m.user_id}
                    className='flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10'
                  >
                    <div className='w-4 h-4 rounded-full bg-indigo-500/30 flex items-center justify-center text-[8px] font-black text-indigo-300'>
                      {m.display_name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className='text-[10px] text-white/70 font-medium'>{m.display_name}</span>
                  </div>
                ))}
                {selectedMembers.length > 8 && (
                  <div className='flex items-center px-2.5 py-1 rounded-full bg-white/5 border border-white/10'>
                    <span className='text-[10px] text-white/30'>
                      +{selectedMembers.length - 8} more
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className='flex items-center gap-3 mb-5 text-white/20'>
              <div className='flex-1 h-px bg-white/5' />
              <ArrowRight className='w-4 h-4 shrink-0' />
              <div className='flex-1 h-px bg-white/5' />
            </div>

            {/* Target room selection */}
            <div className='mb-6'>
              <p className='text-[9px] font-black uppercase tracking-widest text-white/20 mb-2'>
                Into Room
              </p>
              {activeBreakouts.length === 0 ? (
                <div className='text-center py-6 text-white/20 text-[11px]'>
                  No active rooms yet — create one first
                </div>
              ) : (
                <div className='space-y-2'>
                  {activeBreakouts.map((b) => {
                    const badge = b.mode_override
                      ? ModePolicyResolver.getBadge(b.mode_override)
                      : null;
                    const isSelected = targetBreakoutId === b.id;
                    const slots = (b.max_participants || 20) - (b.participants_count || 0);
                    return (
                      <button
                        key={b.id}
                        onClick={() => setTargetBreakoutId(b.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
                          isSelected
                            ? 'bg-indigo-600/20 border border-indigo-500/40'
                            : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-400' : 'bg-white/10'}`}
                        />
                        <div className='flex-1 min-w-0'>
                          <p className='text-[12px] font-bold text-white/90 truncate'>{b.name}</p>
                          <p className='text-[9px] text-white/30 font-mono'>
                            {b.participants_count || 0} / {b.max_participants} · {slots} slot
                            {slots !== 1 ? 's' : ''} free
                          </p>
                        </div>
                        {badge && (
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${badge.color}`}
                          >
                            {badge.emoji} {badge.label}
                          </span>
                        )}
                        {b.status !== 'CREATED' && (
                          <span className='text-[9px] font-black uppercase text-emerald-400 tracking-widest'>
                            LIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action */}
            <button
              onClick={handleAssign}
              disabled={!targetBreakoutId || isAssigning}
              className='w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-[0.98] border border-indigo-400/20'
            >
              {isAssigning ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Users className='w-4 h-4' />
              )}
              {isAssigning
                ? 'Assigning...'
                : `Assign ${selectedMembers.length} Participant${selectedMembers.length !== 1 ? 's' : ''}`}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BatchAssignModal;
