import React, { useState } from 'react';
import { Search, X, Users, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrgMember } from '@/services/BreakoutService';

interface MemberRosterProps {
  members: OrgMember[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (userId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  /** If set, only show members NOT already in a breakout */
  lobbyOnly?: boolean;
}

const MemberRoster: React.FC<MemberRosterProps> = ({
  members,
  isLoading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  lobbyOnly = false,
}) => {
  const [search, setSearch] = useState('');

  const filtered = members
    .filter((m) => (lobbyOnly ? !m.assignedBreakoutId : true))
    .filter(
      (m) =>
        m.display_name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
    );

  const allSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.user_id));

  return (
    <div className='flex flex-col h-full'>
      {/* Search bar */}
      <div className='relative mb-3'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20' />
        <input
          type='text'
          placeholder='Search members...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-[11px] placeholder:text-white/20 focus:border-indigo-500/40 focus:outline-none transition-colors'
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60'
          >
            <X className='w-3 h-3' />
          </button>
        )}
      </div>

      {/* Selection controls */}
      {filtered.length > 0 && (
        <div className='flex items-center justify-between mb-2 px-1'>
          <button
            onClick={allSelected ? onClearSelection : onSelectAll}
            className='flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors'
          >
            {allSelected ? (
              <CheckSquare className='w-3 h-3 text-indigo-400' />
            ) : (
              <Square className='w-3 h-3' />
            )}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          {selectedIds.size > 0 && (
            <span className='text-[9px] font-black text-indigo-400 uppercase tracking-widest'>
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Member list */}
      <div className='flex-1 overflow-y-auto no-scrollbar space-y-1'>
        {isLoading ? (
          <div className='flex justify-center py-8'>
            <div className='w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin' />
          </div>
        ) : filtered.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <Users className='w-8 h-8 text-white/5 mb-3' />
            <p className='text-[10px] text-white/20 uppercase tracking-widest font-black'>
              {members.length === 0 ? 'No members yet' : 'No results'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((member) => {
              const isSelected = selectedIds.has(member.user_id);
              const initials = member.display_name.slice(0, 2).toUpperCase();
              return (
                <motion.button
                  key={member.user_id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => onToggleSelect(member.user_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/30'
                      : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-400/40 text-white'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name}
                        className='w-full h-full rounded-full object-cover'
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <p className='text-[11px] font-bold text-white/90 truncate'>
                      {member.display_name}
                    </p>
                    {member.assignedBreakoutId && (
                      <p className='text-[9px] text-indigo-400/60 font-mono uppercase tracking-widest'>
                        In Room
                      </p>
                    )}
                  </div>

                  {/* Selection indicator */}
                  {isSelected ? (
                    <CheckSquare className='w-3.5 h-3.5 text-indigo-400 shrink-0' />
                  ) : (
                    <Square className='w-3.5 h-3.5 text-white/10 group-hover:text-white/20 shrink-0 transition-colors' />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default MemberRoster;
