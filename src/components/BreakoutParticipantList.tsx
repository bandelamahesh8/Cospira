import React from 'react';
import UserAvatar from '@/components/UserAvatar';
import { BreakoutParticipant } from '@/types/organization';
import { motion, AnimatePresence } from 'framer-motion';

export const BreakoutParticipantList: React.FC<{ participants: BreakoutParticipant[] }> = ({
  participants,
}) => {
  // Take up to 5 participants to show in the mini-map
  const displayParticipants = participants.slice(0, 5);
  const remainingCount = Math.max(0, participants.length - 5);

  return (
    <div className='flex -space-x-2 overflow-hidden mt-3 mb-1'>
      <AnimatePresence>
        {displayParticipants.map((p, index) => (
          <motion.div
            key={p.id || p.user_id || index}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 10 }}
            transition={{ delay: index * 0.05 }}
            className='inline-block h-6 w-6 rounded-full ring-2 ring-[#080a0e] relative z-10 bg-indigo-500/20'
            title={p.user?.display_name || 'Participant'}
          >
            <UserAvatar
              avatarUrl={p.user?.avatar_url || undefined}
              name={p.user?.display_name || 'P'}
              className='w-full h-full text-[8px]'
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {remainingCount > 0 && (
        <div className='inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-[#080a0e] bg-white/10 text-white/50 text-[9px] font-bold relative z-0'>
          +{remainingCount}
        </div>
      )}

      {participants.length === 0 && (
        <div className='text-[9px] text-white/30 italic font-medium pt-1'>No participants yet</div>
      )}
    </div>
  );
};

export default BreakoutParticipantList;
