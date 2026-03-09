/**
 * AuthorityRosterPanel — Live authority hierarchy panel
 *
 * Shows all participants with their roles (HOST, COHOST, MODERATOR, SPEAKER, LISTENER).
 * Hosts/Cohosts can click any participant to grant or revoke roles.
 * Shows auto-promotion notice when host disconnects.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Shield, Mic, Headphones, ChevronDown, AlertTriangle } from 'lucide-react';
import {
  useAuthorityEngine,
  type AuthorityRole,
  type RosterEntry,
  ROLE_BADGE_COLORS,
  ROLE_WEIGHTS,
} from '@/hooks/useAuthorityEngine';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─────────────────────────────────────────────
// Role Icons
// ─────────────────────────────────────────────
const ROLE_ICONS: Record<AuthorityRole, React.ElementType> = {
  HOST: Crown,
  COHOST: Shield,
  MODERATOR: Shield,
  SPEAKER: Mic,
  LISTENER: Headphones,
};

const ALL_ROLES: AuthorityRole[] = ['HOST', 'COHOST', 'MODERATOR', 'SPEAKER', 'LISTENER'];

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface AuthorityRosterPanelProps {
  roomId: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any;
  getUserName?: (userId: string) => string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function AuthorityRosterPanel({
  roomId,
  userId,
  socket,
  getUserName,
}: AuthorityRosterPanelProps) {
  const { myRole, roster, isLoading, lastPromotion, grantRole, revokeRole, canManage } =
    useAuthorityEngine(roomId, userId, socket);

  const [search, setSearch] = useState('');

  const getName = (uid: string) => getUserName?.(uid) || uid.slice(0, 8) + '…';

  // Sort by role weight desc
  const sorted = [...roster]
    .filter((r) => getName(r.userId).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (ROLE_WEIGHTS[b.role] ?? 0) - (ROLE_WEIGHTS[a.role] ?? 0));

  // Group by role
  const grouped: Partial<Record<AuthorityRole, RosterEntry[]>> = {};
  for (const entry of sorted) {
    if (!grouped[entry.role]) grouped[entry.role] = [];
    grouped[entry.role]!.push(entry);
  }

  const myRoleWeight = ROLE_WEIGHTS[myRole] ?? 0;

  return (
    <div className='flex flex-col gap-3'>
      {/* Auto-promotion notice */}
      <AnimatePresence>
        {lastPromotion && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='flex items-start gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20'
          >
            <Crown size={16} className='text-amber-400 mt-0.5 shrink-0' />
            <div>
              <p className='text-xs font-black text-amber-400 uppercase tracking-wider'>
                Host Promoted
              </p>
              <p className='text-xs text-slate-400'>{lastPromotion.reason}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My role badge */}
      <div className='flex items-center justify-between'>
        <span className='text-xs text-slate-500 uppercase font-bold tracking-widest'>
          Your Role
        </span>
        <RoleBadge role={myRole} />
      </div>

      {/* Search */}
      {roster.length > 5 && (
        <input
          type='text'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search participants…'
          className='h-8 w-full rounded-xl bg-white/5 border border-white/10 text-xs text-white px-3 placeholder:text-slate-600 focus:outline-none focus:border-white/20'
        />
      )}

      {/* Roster */}
      {isLoading ? (
        <div className='flex items-center justify-center py-8'>
          <div className='w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin' />
        </div>
      ) : (
        <div className='flex flex-col gap-1'>
          {ALL_ROLES.map((role) => {
            const members = grouped[role];
            if (!members || members.length === 0) return null;
            return (
              <div key={role}>
                <div className='flex items-center gap-2 px-2 py-1'>
                  <span className='text-[9px] font-black uppercase tracking-widest text-slate-600'>
                    {role}
                  </span>
                  <span className='text-[9px] text-slate-700'>({members.length})</span>
                </div>
                {members.map((entry) => {
                  const targetWeight = ROLE_WEIGHTS[entry.role] ?? 0;
                  const canEdit =
                    canManage && myRoleWeight > targetWeight && entry.userId !== userId;

                  return (
                    <ParticipantRow
                      key={entry.userId}
                      entry={entry}
                      name={getName(entry.userId)}
                      isMe={entry.userId === userId}
                      canEdit={canEdit}
                      myRole={myRole}
                      onGrant={(newRole) => grantRole(entry.userId, newRole)}
                      onRevoke={() => revokeRole(entry.userId)}
                    />
                  );
                })}
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className='text-center text-xs text-slate-600 py-6'>No participants found.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function RoleBadge({ role }: { role: AuthorityRole }) {
  const Icon = ROLE_ICONS[role] ?? Headphones;
  const colors = ROLE_BADGE_COLORS[role] ?? ROLE_BADGE_COLORS.LISTENER;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${colors}`}
    >
      <Icon size={9} />
      {role}
    </span>
  );
}

interface ParticipantRowProps {
  entry: RosterEntry;
  name: string;
  isMe: boolean;
  canEdit: boolean;
  myRole: AuthorityRole;
  onGrant: (role: AuthorityRole) => void;
  onRevoke: () => void;
}

function ParticipantRow({
  entry,
  name,
  isMe,
  canEdit,
  myRole,
  onGrant,
  onRevoke,
}: ParticipantRowProps) {
  const Icon = ROLE_ICONS[entry.role] ?? Headphones;
  const colors = ROLE_BADGE_COLORS[entry.role] ?? ROLE_BADGE_COLORS.LISTENER;
  const myWeight = ROLE_WEIGHTS[myRole] ?? 0;

  const grantableRoles = ALL_ROLES.filter((r) => {
    const w = ROLE_WEIGHTS[r] ?? 0;
    return w < myWeight && r !== entry.role;
  });

  return (
    <div className='flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5 transition-colors group'>
      {/* Avatar placeholder */}
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black border ${colors} shrink-0`}
      >
        {name[0]?.toUpperCase() ?? '?'}
      </div>

      <div className='flex-1 min-w-0'>
        <p className='text-xs font-semibold text-white truncate'>
          {name}
          {isMe && <span className='ml-1 text-[9px] text-slate-500'>(you)</span>}
        </p>
        <p className='text-[9px] text-slate-600 uppercase tracking-widest'>{entry.role}</p>
      </div>

      <span
        className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] border ${colors}`}
      >
        <Icon size={8} />
      </span>

      {/* Edit dropdown */}
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center transition-opacity'>
              <ChevronDown size={10} className='text-slate-400' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side='right'
            className='w-48 bg-[#0A0D12]/95 border-white/10 backdrop-blur-xl rounded-xl p-1'
          >
            <DropdownMenuLabel className='text-[9px] uppercase text-slate-600 font-bold tracking-widest px-2'>
              Change Role
            </DropdownMenuLabel>
            {grantableRoles.map((role) => (
              <DropdownMenuItem
                key={role}
                onSelect={() => onGrant(role)}
                className='flex items-center gap-2 px-2 py-1.5 rounded-lg focus:bg-white/10 cursor-pointer text-xs'
              >
                <span
                  className={`text-[9px] font-black uppercase ${ROLE_BADGE_COLORS[role]?.split(' ')[1]}`}
                >
                  {role}
                </span>
              </DropdownMenuItem>
            ))}
            {entry.role !== 'LISTENER' && (
              <>
                <DropdownMenuSeparator className='bg-white/10' />
                <DropdownMenuItem
                  onSelect={onRevoke}
                  className='flex items-center gap-2 px-2 py-1.5 rounded-lg focus:bg-red-500/10 text-red-500 focus:text-red-400 cursor-pointer text-xs'
                >
                  <AlertTriangle size={10} />
                  Revoke Role
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
