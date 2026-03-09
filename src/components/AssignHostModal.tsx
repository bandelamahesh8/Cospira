import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserCheck } from 'lucide-react';
import { OrgMember } from '@/services/BreakoutService';
import { BreakoutSession } from '@/types/organization';

interface AssignHostModalProps {
  open: boolean;
  breakout: BreakoutSession | null;
  members: OrgMember[];
  onAssign: (userId: string) => Promise<void>;
  onClose: () => void;
}

const AssignHostModal: React.FC<AssignHostModalProps> = ({
  open,
  breakout,
  members,
  onAssign,
  onClose,
}) => {
  const [loading, setLoading] = React.useState<string | null>(null);

  if (!open || !breakout) return null;

  const handleAssign = async (userId: string) => {
    setLoading(userId);
    try {
      await onAssign(userId);
      onClose();
    } finally {
      setLoading(null);
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
            className='relative glass-card rounded-[28px] p-6 w-full max-w-sm z-10 max-h-[80vh] flex flex-col'
          >
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h2 className='text-lg font-black uppercase tracking-tighter text-white italic'>
                  Assign Host
                </h2>
                <p className='text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-bold mt-0.5'>
                  {breakout.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className='p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto no-scrollbar space-y-2'>
              {members.length === 0 ? (
                <div className='flex flex-col items-center py-12 text-center'>
                  <Users className='w-10 h-10 text-white/5 mb-3' />
                  <p className='text-[10px] text-white/20 uppercase tracking-widest font-black'>
                    No members available
                  </p>
                </div>
              ) : (
                members.map((member) => {
                  const isCurrentHost = breakout.host_id === member.user_id;
                  const initials = member.display_name.slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={member.user_id}
                      onClick={() => handleAssign(member.user_id)}
                      disabled={loading === member.user_id || isCurrentHost}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
                        isCurrentHost
                          ? 'bg-indigo-500/20 border border-indigo-500/30 cursor-default'
                          : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 active:scale-[0.98]'
                      }`}
                    >
                      <div className='w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-[11px] font-black text-indigo-300 border border-indigo-500/20 shrink-0'>
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt=''
                            className='w-full h-full rounded-full object-cover'
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <span className='flex-1 text-[12px] font-bold text-white/90 truncate'>
                        {member.display_name}
                      </span>
                      {isCurrentHost && (
                        <span className='flex items-center gap-1 text-[9px] font-black text-indigo-400 uppercase tracking-widest'>
                          <UserCheck className='w-3 h-3' /> Host
                        </span>
                      )}
                      {loading === member.user_id && (
                        <div className='w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin' />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AssignHostModal;
