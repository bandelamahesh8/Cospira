import React from 'react';
import { motion } from 'framer-motion';
import { Play, X, ChevronRight, Pause, RotateCcw, Users, UserPlus } from 'lucide-react';
import { BreakoutSession, OrgMode } from '@/types/organization';
import { ModePolicyResolver } from '@/lib/ModePolicyResolver';

interface DispatchRoomCardProps {
  breakout: BreakoutSession;
  isOwner: boolean;
  orgMode: OrgMode;
  selectedCount: number;
  onStart: () => void;
  onClose: () => void;
  onEnter: () => void;
  onResume: () => void;
  onAssignHost: () => void;
  onBatchAssign: () => void;
}

const DispatchRoomCard: React.FC<DispatchRoomCardProps> = ({
  breakout,
  isOwner,
  orgMode,
  selectedCount,
  onStart,
  onClose,
  onEnter,
  onResume,
  onAssignHost,
  onBatchAssign,
}) => {
  const effectiveMode =
    orgMode === 'MIXED' && breakout.mode_override
      ? breakout.mode_override
      : orgMode === 'MIXED'
        ? 'FUN'
        : (orgMode as Exclude<OrgMode, 'MIXED'>);

  const policy = ModePolicyResolver.getPolicy(effectiveMode);
  const badge = breakout.mode_override ? ModePolicyResolver.getBadge(breakout.mode_override) : null;

  const statusColor: Record<string, string> = {
    CREATED: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    LIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    PAUSED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    CLOSED: 'text-white/30 bg-white/5 border-white/10',
  };

  const slots = (breakout.max_participants || 20) - (breakout.participants_count || 0);

  const isUltra = effectiveMode === 'ULTRA_SECURE';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`glass-card rounded-[24px] p-5 transition-all group relative overflow-hidden flex flex-col h-full ${
        isUltra
          ? 'border-red-500/30 shadow-[0_0_15px_rgba(248,113,113,0.1)] hover:border-red-500/50'
          : 'hover:neon-border-indigo'
      }`}
    >
      {breakout.status === 'LIVE' && (
        <div className='absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse' />
      )}

      {/* Header */}
      <div className='flex items-start justify-between mb-4'>
        <div className='min-w-0 pr-4'>
          <h3 className='text-white font-black text-xs uppercase tracking-tight mb-1 truncate'>
            {breakout.name}
          </h3>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <span
              className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${statusColor[breakout.status] || statusColor['CLOSED']}`}
            >
              {breakout.status === 'PAUSED' ? '⏸ PAUSED' : breakout.status}
            </span>
            {badge && (
              <span
                className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${badge.color}`}
              >
                {badge.emoji} {badge.label}
              </span>
            )}
            {policy.mandatoryRecording && (
              <span className='text-[8px] font-black uppercase tracking-widest text-red-400 border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 rounded-md'>
                REC
              </span>
            )}
          </div>
        </div>
        <div className='flex flex-col items-end gap-2'>
          {isOwner && breakout.status !== 'CLOSED' && (
            <button
              onClick={onClose}
              className='p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/20 transition-all border border-white/5'
            >
              <X className='w-3 h-3' />
            </button>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className='grid grid-cols-2 gap-2 mb-4'>
        {/* Host Selection */}
        <div className='col-span-2 flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5'>
          <div className='min-w-0'>
            <p className='text-[8px] font-black uppercase tracking-widest text-white/30 mb-0.5'>
              Host
            </p>
            <p className='text-[10px] font-bold text-white/80 truncate'>
              {breakout.host?.display_name || (breakout.host_id ? 'Assigned' : 'Unassigned')}
            </p>
          </div>
          {isOwner && breakout.status !== 'CLOSED' && (
            <button
              onClick={onAssignHost}
              className='px-2 h-6 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ml-2'
            >
              Change
            </button>
          )}
        </div>

        {/* Population */}
        <div className='col-span-2 sm:col-span-1 p-2 rounded-xl bg-white/[0.02] border border-white/5'>
          <p className='text-[8px] font-black uppercase tracking-widest text-white/30 mb-0.5'>
            Participants
          </p>
          <div className='flex items-center gap-1.5'>
            <Users className='w-3 h-3 text-indigo-400/50' />
            <p className='text-[10px] font-bold text-white/80 font-mono'>
              {breakout.participants_count || 0} / {breakout.max_participants || 20}
            </p>
          </div>
        </div>

        {/* Capacity / Batch Assign */}
        <div className='col-span-2 sm:col-span-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-center'>
          {isOwner && breakout.status !== 'CLOSED' && slots > 0 ? (
            <button
              onClick={onBatchAssign}
              className='w-full h-7 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all group-[.hover]:border-indigo-400/50'
            >
              <UserPlus className='w-3 h-3' /> Insert {selectedCount > 0 ? selectedCount : ''}
            </button>
          ) : (
            <div className='flex items-center justify-center h-full'>
              <span className='text-[9px] font-black uppercase tracking-widest text-white/20'>
                {slots <= 0 ? 'Full' : 'Available'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className='mt-auto pt-2'>
        <div className='flex gap-2'>
          {(breakout.status === 'LIVE' || breakout.status === 'PAUSED') && (
            <button
              onClick={onEnter}
              disabled={breakout.status === 'PAUSED'}
              title={breakout.status === 'PAUSED' ? 'Paused by host' : ''}
              className='flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 transition-all'
            >
              {breakout.status === 'PAUSED' ? (
                <Pause className='w-3 h-3' />
              ) : (
                <ChevronRight className='w-3 h-3' />
              )}
              {breakout.status === 'PAUSED' ? 'Paused' : 'Join'}
            </button>
          )}
          {isOwner && breakout.status === 'CREATED' && (
            <button
              onClick={onStart}
              disabled={!breakout.host_id}
              className='flex-1 h-9 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 text-white text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 transition-all'
            >
              <Play className='w-3 h-3' /> Open
            </button>
          )}
          {isOwner && breakout.status === 'PAUSED' && (
            <button
              onClick={onResume}
              className='flex-1 h-9 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 transition-all'
            >
              <RotateCcw className='w-3 h-3' /> Resume
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DispatchRoomCard;
