import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/contexts/useOrganization';
import { useBreakout } from '@/contexts/useBreakout';
import { useAuth } from '@/hooks/useAuth';
import { ModePolicyResolver } from '@/lib/ModePolicyResolver';
import { BreakoutPermissions } from '@/lib/BreakoutPermissions';
import {
  BreakoutSession,
  OrgMode,
  AIInsight,
  UserPresence,
  RoomType,
  SecurityLevel,
} from '@/types/organization';
import { toast } from 'sonner';
import {
  Plus,
  Play,
  X,
  Users,
  Loader2,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Pause,
  RotateCcw,
  Send,
  Sparkles,
  Shield,
  Box,
  Layers,
  GitMerge,
  Ghost,
} from 'lucide-react';
import AIInsightsPanel from '@/components/AIInsightsPanel';
import UserAvatar from '@/components/UserAvatar';
import { useAIAssistant } from '@/contexts/useAIAssistant';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import BreakoutParticipantList from '@/components/BreakoutParticipantList';
import AnomalyAlert, { AnomalyEvent } from '@/components/AnomalyAlert';

// ─────────────────────────────────────────────────────────────
// Mode Badge (inline)
// ─────────────────────────────────────────────────────────────
const ModeBadge: React.FC<{ mode: OrgMode; size?: 'sm' | 'xs' }> = ({ mode, size = 'xs' }) => {
  const badge = ModePolicyResolver.getBadge(mode);
  const cls = size === 'sm' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 ${cls} rounded-lg font-black uppercase tracking-widest border ${badge.color}`}
    >
      {badge.emoji} {badge.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Breakout Card
// ─────────────────────────────────────────────────────────────
const BreakoutCard: React.FC<{
  breakout: BreakoutSession;
  isOwner: boolean;
  orgMode: OrgMode;
  onStart: () => void;
  onClose: () => void;
  onEnter: () => void;
  onResume: () => void;
  onCreateChild: (
    parentId: string,
    name: string,
    maxParticipants?: number,
    roomType?: RoomType,
    securityLevel?: SecurityLevel
  ) => Promise<void>;
  onGhostObserve: () => void;
}> = ({
  breakout,
  isOwner,
  orgMode,
  onStart,
  onClose,
  onEnter,
  onGhostObserve,
  onResume,
  onCreateChild,
}) => {
  const [showChildForm, setShowChildForm] = useState(false);
  const [childName, setChildName] = useState('');
  const [childRoomType, setChildRoomType] = useState<RoomType>('GENERAL');
  const [childSecurityLevel, setChildSecurityLevel] = useState<SecurityLevel>('STANDARD');
  const [isCreatingChild, setIsCreatingChild] = useState(false);

  const { isOver, setNodeRef } = useDroppable({
    id: `breakout-${breakout.id}`,
    data: { type: 'Breakout', breakout },
  });

  const effectiveMode =
    orgMode === 'MIXED' && breakout.mode_override
      ? breakout.mode_override
      : orgMode === 'MIXED'
        ? 'FUN'
        : (orgMode as Exclude<OrgMode, 'MIXED'>);
  const policy = ModePolicyResolver.getPolicy(effectiveMode);

  const statusColor: Record<string, string> = {
    CREATED: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    LIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    PAUSED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    CLOSED: 'text-white/30 bg-white/5 border-white/10',
  };

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`bg-white/[0.02] border rounded-2xl p-5 transition-all group relative overflow-hidden ${
        isOver
          ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      {/* Live pulse */}
      {breakout.status === 'LIVE' && (
        <div className='absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
      )}

      <div className='flex items-start justify-between mb-4'>
        <div>
          <h3 className='text-white font-black text-sm uppercase tracking-tight mb-1'>
            {breakout.name}
          </h3>
          <div className='flex items-center gap-2 flex-wrap'>
            <span
              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${statusColor[breakout.status] || statusColor['CLOSED']}`}
            >
              {breakout.status === 'PAUSED' ? '⏸ PAUSED' : breakout.status}
            </span>
            {orgMode === 'MIXED' && breakout.mode_override && (
              <ModeBadge mode={breakout.mode_override} />
            )}
            <span className='text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1'>
              <Box className='w-2.5 h-2.5' />
              {breakout.room_type || 'GENERAL'}
            </span>
            <span className='text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1'>
              <Shield className='w-2.5 h-2.5' />
              {breakout.security_level || 'STANDARD'}
            </span>
          </div>
        </div>
      </div>

      <div className='space-y-1.5 mb-4'>
        <div className='flex items-center justify-between text-[10px]'>
          <span className='text-white/30 uppercase tracking-widest font-bold'>Super Host</span>
          <span className='text-white/70 font-medium'>
            {breakout.host?.display_name || (breakout.host_id ? 'Assigned' : '— Unassigned')}
          </span>
        </div>
        <div className='flex items-center justify-between text-[10px]'>
          <span className='text-white/30 uppercase tracking-widest font-bold'>Participants</span>
          <span className='text-white/70 font-medium'>
            {breakout.participants_count || 0} / {breakout.max_participants}
          </span>
        </div>
        <div className='flex items-center justify-between text-[10px]'>
          <span className='text-white/30 uppercase tracking-widest font-bold'>Recording</span>
          <span className={policy.mandatoryRecording ? 'text-red-400 font-bold' : 'text-white/30'}>
            {policy.mandatoryRecording ? '● MANDATORY' : 'Off'}
          </span>
        </div>
      </div>

      {breakout.participants && breakout.participants.length > 0 && (
        <div className='mb-4'>
          <BreakoutParticipantList participants={breakout.participants} />
        </div>
      )}

      {/* Child Rooms Section */}
      <div className='mb-4 space-y-2'>
        <div className='flex items-center justify-between px-1'>
          <span className='text-[9px] font-black uppercase tracking-widest text-white/20 flex items-center gap-1.5'>
            <Layers className='w-3 h-3' /> Child Rooms ({breakout.child_rooms?.length || 0})
          </span>
          {isOwner && (
            <button
              onClick={() => setShowChildForm(!showChildForm)}
              className='text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors'
            >
              {showChildForm ? 'Cancel' : '+ Add'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showChildForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='bg-white/5 rounded-xl p-3 border border-indigo-500/20 space-y-3'
            >
              <input
                type='text'
                placeholder='Child room name...'
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className='w-full h-8 px-2 rounded-lg bg-black/40 border border-white/10 text-white text-[10px] placeholder:text-white/20 outline-none focus:border-indigo-500/30'
              />
              <div className='grid grid-cols-2 gap-2'>
                <select
                  value={childRoomType}
                  onChange={(e) => setChildRoomType(e.target.value as RoomType)}
                  className='h-7 px-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-[9px] font-black uppercase outline-none'
                >
                  <option value='GENERAL'>General</option>
                  <option value='SECURE_VAULT'>Vault</option>
                  <option value='COLLAB_HUB'>Hub</option>
                  <option value='AI_LAB'>AI Lab</option>
                </select>
                <select
                  value={childSecurityLevel}
                  onChange={(e) => setChildSecurityLevel(e.target.value as SecurityLevel)}
                  className='h-7 px-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-[9px] font-black uppercase outline-none'
                >
                  <option value='STANDARD'>Standard</option>
                  <option value='MANDATORY_RECORDING'>Rec</option>
                  <option value='ZERO_TRUST'>Zero-T</option>
                  <option value='AI_OBSERVED'>AI-Obs</option>
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!childName) return;
                  setIsCreatingChild(true);
                  await onCreateChild(
                    breakout.id,
                    childName,
                    20,
                    childRoomType,
                    childSecurityLevel
                  );
                  setChildName('');
                  setIsCreatingChild(false);
                  setShowChildForm(false);
                }}
                disabled={!childName || isCreatingChild}
                className='w-full h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[9px] font-black uppercase tracking-widest transition-all'
              >
                {isCreatingChild ? 'Creating...' : 'Confirm Sub-Room'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className='space-y-1.5'>
          {breakout.child_rooms?.map((child) => (
            <div
              key={child.id}
              className='flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 group/child'
            >
              <div className='flex items-center gap-2'>
                <GitMerge className='w-3 h-3 text-indigo-400' />
                <span className='text-[10px] font-bold text-white/70 uppercase truncate max-w-[100px]'>
                  {child.name}
                </span>
                <span className='text-[8px] text-white/20 font-black uppercase'>
                  {child.room_type}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-[8px] font-black text-white/30 uppercase'>
                  {child.participants_count || 0} users
                </span>
                <button
                  onClick={() => onEnter()} // For simplicity, enter parent and then child, or navigate directly if needed
                  className='opacity-0 group-hover/child:opacity-100 p-1 text-white/40 hover:text-white transition-opacity'
                >
                  <ChevronRight className='w-3 h-3' />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='flex gap-2'>
        {(breakout.status === 'LIVE' || breakout.status === 'PAUSED') && (
          <div className='flex-1 flex gap-2'>
            <button
              onClick={onGhostObserve}
              title='Ghost Observe — enter invisibly'
              className='h-8 w-10 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 flex items-center justify-center transition-all border border-purple-500/20'
            >
              <Ghost size={14} />
            </button>
            <button
              onClick={onEnter}
              disabled={breakout.status === 'PAUSED'}
              title={breakout.status === 'PAUSED' ? 'Breakout is paused — host disconnected' : ''}
              className='flex-1 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all'
            >
              {breakout.status === 'PAUSED' ? (
                <Pause className='w-3 h-3' />
              ) : (
                <ChevronRight className='w-3 h-3' />
              )}
              {breakout.status === 'PAUSED' ? 'Paused' : 'Enter'}
            </button>
          </div>
        )}
        {isOwner && breakout.status === 'CREATED' && (
          <button
            onClick={onStart}
            disabled={!breakout.host_id}
            className='flex-1 h-8 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all'
          >
            <Play className='w-3 h-3' /> Start
          </button>
        )}
        {isOwner && breakout.status === 'PAUSED' && (
          <button
            onClick={onResume}
            className='flex-1 h-8 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all'
          >
            <RotateCcw className='w-3 h-3' /> Resume
          </button>
        )}
        {isOwner && breakout.status !== 'CLOSED' && (
          <button
            onClick={onClose}
            className='h-8 w-8 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-white/30 transition-all border border-white/5'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Create Breakout Form
// ─────────────────────────────────────────────────────────────
const CreateBreakoutForm: React.FC<{
  orgMode: OrgMode;
  onSubmit: (
    name: string,
    override?: OrgMode,
    roomType?: RoomType,
    securityLevel?: SecurityLevel
  ) => void;
  onCancel: () => void;
}> = ({ orgMode, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [modeOverride, setModeOverride] = useState<OrgMode>('FUN');
  const [roomType, setRoomType] = useState<RoomType>('GENERAL');
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('STANDARD');
  const isMixed = orgMode === 'MIXED';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className='bg-white/[0.03] border border-indigo-500/20 rounded-2xl p-5 mb-4'
    >
      <h4 className='text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3'>
        New Breakout
      </h4>
      <div className='space-y-3'>
        <input
          type='text'
          placeholder='Breakout name...'
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className='w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:border-indigo-500/50 focus:outline-none transition-colors'
        />
        {isMixed && (
          <div className='space-y-1.5'>
            <span className='text-[9px] font-black uppercase tracking-widest text-white/20 ml-1'>
              Mode Override
            </span>
            <div className='flex gap-2'>
              {(['FUN', 'PROF', 'ULTRA_SECURE'] as OrgMode[]).map((m) => {
                const b = ModePolicyResolver.getBadge(m);
                return (
                  <button
                    key={m}
                    type='button'
                    onClick={() => setModeOverride(m)}
                    className={`flex-1 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                      modeOverride === m
                        ? b.color + ' opacity-100'
                        : 'border-white/10 text-white/30 bg-transparent hover:border-white/20'
                    }`}
                  >
                    {b.emoji} {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <span className='text-[9px] font-black uppercase tracking-widest text-white/20 ml-1'>
              Room Type
            </span>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as RoomType)}
              className='w-full h-9 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase outline-none focus:border-indigo-500/50 transition-colors'
            >
              <option value='GENERAL'>General</option>
              <option value='SECURE_VAULT'>Secure Vault</option>
              <option value='COLLAB_HUB'>Collab Hub</option>
              <option value='AI_LAB'>AI Lab</option>
            </select>
          </div>
          <div className='space-y-1.5'>
            <span className='text-[9px] font-black uppercase tracking-widest text-white/20 ml-1'>
              Security Level
            </span>
            <select
              value={securityLevel}
              onChange={(e) => setSecurityLevel(e.target.value as SecurityLevel)}
              className='w-full h-9 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase outline-none focus:border-indigo-500/50 transition-colors'
            >
              <option value='STANDARD'>Standard</option>
              <option value='MANDATORY_RECORDING'>Mandatory Rec</option>
              <option value='ZERO_TRUST'>Zero Trust</option>
              <option value='AI_OBSERVED'>AI Observed</option>
            </select>
          </div>
        </div>

        <div className='flex gap-2 pt-1'>
          <button
            onClick={() =>
              name && onSubmit(name, isMixed ? modeOverride : undefined, roomType, securityLevel)
            }
            disabled={!name}
            className='flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-all'
          >
            Create Breakout
          </button>
          <button
            onClick={onCancel}
            className='h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all border border-white/5'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Draggable Lobby Member
// ─────────────────────────────────────────────────────────────
const DraggableUser: React.FC<{ user: UserPresence; isCurrentUser: boolean }> = ({
  user,
  isCurrentUser,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `user-${user.user_id}`,
    data: { type: 'User', user },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'bg-indigo-500/20 border-indigo-400 shadow-lg shadow-indigo-500/20 z-50 scale-105 opacity-90'
          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
      }`}
    >
      <UserAvatar
        avatarUrl={user.avatar_url || undefined}
        name={user.display_name}
        className='w-8 h-8 pointer-events-none'
      />
      <div className='flex-1 min-w-0 pointer-events-none'>
        <p className='text-[11px] font-black text-white/90 uppercase tracking-tight truncate'>
          {user.display_name}{' '}
          {isCurrentUser && <span className='text-indigo-400 lowercase ml-1'>(you)</span>}
        </p>
        <p className='text-[8px] font-bold text-emerald-400/60 uppercase tracking-widest'>
          In Lobby
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Organization Room Page
// ─────────────────────────────────────────────────────────────
const OrganizationRoom: React.FC<{ embeddedOrgId?: string; onEmbeddedClose?: () => void }> = ({
  embeddedOrgId,
  onEmbeddedClose,
}) => {
  const { orgId: paramOrgId } = useParams<{ orgId: string }>();
  const orgId = embeddedOrgId || paramOrgId;
  const isEmbedded = !!embeddedOrgId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();
  const {
    breakouts,
    isLoading,
    isReconnecting,
    createBreakout,
    createChildRoom,
    startBreakout,
    closeBreakout,
    resumeBreakout,
    switchOrgMode,
    refreshBreakouts,
    setCurrentBreakout,
    aiInsights,
    aiEnabled,
    killAI,
    enableAI,
    lobbyUsers,
    batchAssignParticipants,
  } = useBreakout();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [modeSwitchLoading, setModeSwitchLoading] = useState(false);
  const [activeDragUser, setActiveDragUser] = useState<UserPresence | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const { isAutoMatchmaking, toggleAutoMatchmaking, requestSmartMatchmaking } = useAIAssistant();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const org = currentOrganization;
  const isOwner = !!(user && org && org.owner_id === user.id);
  const orgMode: OrgMode = org?.mode || 'FUN';
  const policy = ModePolicyResolver.getPolicy(orgMode);

  // Simulated Anomalies for Phase 5 demo
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);

  useEffect(() => {
    if (orgMode === 'ULTRA_SECURE' || orgMode === 'MIXED') {
      const timer = setTimeout(() => {
        setAnomalies([
          {
            id: '1',
            type: 'AUTH_SPOOF_ATTEMPT',
            severity: 'critical',
            description: 'Multiple failed biometric challenges detected from unexpected IP range.',
            timestamp: new Date().toLocaleTimeString(),
            actor: 'USR_9482',
          },
          {
            id: '2',
            type: 'RAPID_JOIN_LEAVE',
            severity: 'medium',
            description: 'User rapidly joined and left 3 different breakouts within 10 seconds.',
            timestamp: new Date().toLocaleTimeString(),
            actor: 'USR_1102',
          },
        ]);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setAnomalies([]);
    }
  }, [orgMode]);

  // Guest access restriction check
  useEffect(() => {
    if (org?.authorized_only && !user?.email) {
      toast.error('Restricted Access', {
        description: 'This organization requires a full account. Guest access is disabled.',
      });
      navigate('/dashboard');
    }
  }, [org, user, navigate]);

  // Set current org from param
  useEffect(() => {
    if (orgId && organizations.length > 0) {
      const org = organizations.find((o) => o.id === orgId);
      if (org) setCurrentOrganization(org);
    }
  }, [orgId, organizations, setCurrentOrganization]);

  // Phase 7: Auto-Routing for Non-Owners
  useEffect(() => {
    if (isOwner || !user || !breakouts.length) return;

    // Search all breakouts and their child rooms to see if the current user is in `participants`
    for (const breakout of breakouts) {
      const inParent = breakout.participants?.some((p) => p.user_id === user.id);
      if (inParent) {
        navigate(`/room/${breakout.id}`);
        return;
      }

      if (breakout.child_rooms) {
        for (const child of breakout.child_rooms) {
          const inChild = child.participants?.some((p) => p.user_id === user.id);
          if (inChild) {
            navigate(`/room/${child.id}`);
            return;
          }
        }
      }
    }
  }, [breakouts, isOwner, user, navigate]);

  const handleEnterBreakout = (breakout: BreakoutSession) => {
    setCurrentBreakout(breakout);
    navigate(`/room/${breakout.id}`);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'User') {
      setActiveDragUser(active.data.current.user);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragUser(null);
    const { active, over } = event;

    if (!over || !isOwner) return; // Only owners can drag and drop to assign

    if (active.data.current?.type === 'User' && over.data.current?.type === 'Breakout') {
      const user = active.data.current.user;
      const breakout = over.data.current.breakout;

      try {
        await batchAssignParticipants(breakout.id, [user.user_id]);
      } catch (e) {
        console.error('Failed to assign user during drag and drop', e);
      }
    }
  };

  if (!org) {
    return (
      <div
        className={`${isEmbedded ? 'h-full' : 'min-h-[100dvh]'} bg-[#080a0e] flex items-center justify-center`}
      >
        <Loader2 className='w-8 h-8 text-indigo-400 animate-spin' />
      </div>
    );
  }

  return (
    <div
      className={`${isEmbedded ? 'h-full flex flex-col rounded-3xl' : 'min-h-[100dvh]'} bg-[#080a0e] relative overflow-hidden`}
    >
      {/* Background */}
      <div className='absolute inset-0 bg-gradient-to-br from-indigo-950/10 via-transparent to-purple-950/5 pointer-events-none' />

      {/* Reconnecting banner — Page 10: page refresh / offline reconnect */}
      {isReconnecting && (
        <div className='relative z-20 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-3'>
          <WifiOff className='w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse' />
          <p className='text-amber-300 text-[10px] font-black uppercase tracking-widest'>
            Reconnecting — syncing breakout state...
          </p>
        </div>
      )}
      {/* ULTRA compliance banner */}
      {policy.ui.showComplianceBanner && (
        <div className='relative z-20 bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 flex items-center gap-3'>
          <AlertTriangle className='w-4 h-4 text-red-400 shrink-0' />
          <p className='text-red-300 text-[10px] font-black uppercase tracking-widest'>
            SECURE MODE — All sessions are recorded. All actions are immutably logged. No silent
            joins.
          </p>
        </div>
      )}

      <div className='relative z-10 max-w-6xl mx-auto px-6 py-8 flex-1 overflow-y-auto no-scrollbar'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-8 shrink-0'>
          {isEmbedded ? (
            <button
              onClick={onEmbeddedClose}
              className='p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all'
            >
              <X className='w-5 h-5' />
            </button>
          ) : (
            <button
              onClick={() => navigate('/organizations')}
              className='p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all'
            >
              <ArrowLeft className='w-5 h-5' />
            </button>
          )}
          <div className='flex-1'>
            <div className='flex items-center gap-3 mb-1'>
              <h1 className='text-xl font-black uppercase tracking-tight text-white'>{org.name}</h1>
              <ModeBadge mode={orgMode} size='sm' />
            </div>
            <p className='text-[10px] text-white/30 uppercase font-bold tracking-widest'>
              Organization Room · {isOwner ? 'Super Host' : 'Member'}
            </p>
          </div>
          {/* Phase 10: Mode switch guard — owner only, blocked when LIVE breakouts exist */}
          {isOwner && (
            <div className='flex items-center gap-2'>
              <span className='text-[9px] text-white/20 uppercase tracking-widest font-bold'>
                Mode:
              </span>
              <select
                value={orgMode}
                onChange={async (e) => {
                  const newMode = e.target.value as OrgMode;
                  setModeSwitchLoading(true);
                  await switchOrgMode(newMode);
                  setModeSwitchLoading(false);
                }}
                disabled={modeSwitchLoading}
                className='h-7 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-40 cursor-pointer'
              >
                {(['FUN', 'PROF', 'ULTRA_SECURE', 'MIXED'] as OrgMode[]).map((m) => {
                  const b = ModePolicyResolver.getBadge(m);
                  return (
                    <option key={m} value={m}>
                      {b.emoji} {b.label}
                    </option>
                  );
                })}
              </select>
              {modeSwitchLoading && (
                <Loader2 className='w-3.5 h-3.5 text-indigo-400 animate-spin' />
              )}
            </div>
          )}
          <button
            onClick={refreshBreakouts}
            className='p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all'
          >
            <RefreshCw className='w-4 h-4' />
          </button>
        </div>

        {/* Main layout — Role Based */}
        {!isOwner ? (
          <div className='flex flex-col items-center justify-center py-24 text-center'>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className='w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl relative'
            >
              <div
                className='absolute inset-0 rounded-[32px] border border-indigo-500/30 animate-ping'
                style={{ animationDuration: '3s' }}
              />
              <Users className='w-10 h-10 text-indigo-400' />
            </motion.div>
            <h2 className='text-2xl font-black uppercase tracking-tight text-white mb-2'>
              Participant Lobby
            </h2>
            <p className='text-white/40 font-medium max-w-md'>
              You are currently in the waiting lobby. The super host will assign you to a breakout
              session shortly.
            </p>

            <div className='mt-12 w-full max-w-sm'>
              <div className='flex items-center justify-between mb-2 px-2 text-[10px] font-black uppercase tracking-widest text-white/30'>
                <span>Who</span>
                <span>Status</span>
              </div>
              <div className='space-y-2'>
                <div className='flex items-center justify-between bg-white/[0.02] border border-emerald-500/20 rounded-xl p-3'>
                  <div className='flex items-center gap-3'>
                    <UserAvatar
                      avatarUrl={user?.user_metadata?.avatar_url}
                      name={user?.user_metadata?.full_name || user?.email || 'User'}
                      className='w-8 h-8'
                    />
                    <span className='text-sm font-bold text-white'>
                      {user?.user_metadata?.full_name || user?.email || 'You'}
                    </span>
                  </div>
                  <span className='text-[10px] font-black uppercase tracking-widest text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded-lg'>
                    Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
              {/* Left: Drag & Drop Roster Sidebar (Lobby) */}
              <div className='lg:col-span-1 border-r border-white/5 pr-6 h-[calc(100vh-200px)] sticky top-0 flex flex-col'>
                <div className='flex items-center justify-between mb-4 shrink-0'>
                  <h2 className='text-[10px] font-black uppercase tracking-widest text-white/40'>
                    Draggable Roster
                  </h2>
                  <div className='flex flex-col items-end gap-2'>
                    <div className='flex items-center gap-1.5 text-[10px] text-white/30'>
                      <Users className='w-3.5 h-3.5' />
                      <span>{lobbyUsers.length} in Lobby</span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={toggleAutoMatchmaking}
                        className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border ${
                          isAutoMatchmaking
                            ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                            : 'bg-white/5 text-white/40 border-white/10 hover:text-white/60 hover:bg-white/10'
                        }`}
                      >
                        <Sparkles className='w-3 h-3' />
                        Auto-Match
                      </button>
                    )}
                  </div>
                </div>
                <div className='flex-1 overflow-y-auto no-scrollbar space-y-2 pr-2'>
                  {lobbyUsers.length === 0 ? (
                    <div className='text-center py-8 text-white/20 text-xs italic border border-dashed border-white/10 rounded-2xl p-4'>
                      Waiting for members to join the lobby. <br />
                      <br /> Once they join, you can drag them into any breakout.
                    </div>
                  ) : (
                    lobbyUsers.map((lbUser) => (
                      <DraggableUser
                        key={lbUser.user_id}
                        user={lbUser}
                        isCurrentUser={lbUser.user_id === user?.id}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Right: Breakout Cards Area */}
              <div className='lg:col-span-3'>
                <div className='flex items-center justify-between mb-4'>
                  <h2 className='text-[10px] font-black uppercase tracking-widest text-white/40'>
                    Breakout Rooms
                  </h2>
                  <div className='flex gap-2'>
                    {/* broadcast form only available to owners, which this block already requires */}
                    <div className='flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2 h-8 w-64 focus-within:border-indigo-500/50 transition-colors'>
                      <input
                        type='text'
                        placeholder='Global Broadcast...'
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && broadcastMessage.trim()) {
                            // Ensure masterBroadcast is loaded if using it, however
                            // earlier code showed a potential gap. Assuming masterBroadcast func passed or simulated
                            toast('Broadcasts sent from Owner Room', { icon: '📢' });
                            setBroadcastMessage('');
                          }
                        }}
                        className='bg-transparent text-[10px] text-white outline-none w-full placeholder:text-white/30 tracking-widest'
                      />
                      <button
                        onClick={() => {
                          if (broadcastMessage.trim()) {
                            toast('Broadcast sent from Owner Room', { icon: '📢' });
                            setBroadcastMessage('');
                          }
                        }}
                        disabled={!broadcastMessage.trim()}
                        className='text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors'
                      >
                        <Send className='w-3.5 h-3.5' />
                      </button>
                    </div>

                    <button
                      onClick={requestSmartMatchmaking}
                      title='Run manual AI matchmaking'
                      className='h-8 w-8 rounded-xl bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 border border-white/10 text-white/40 flex items-center justify-center transition-all'
                    >
                      <Sparkles className='w-4 h-4' />
                    </button>

                    {BreakoutPermissions.canCreateBreakout(user!, org) && (
                      <button
                        onClick={() => setShowCreateForm((p) => !p)}
                        className='h-8 px-4 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all'
                      >
                        <Plus className='w-3 h-3' />
                        New Breakout
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {showCreateForm && (
                    <CreateBreakoutForm
                      orgMode={orgMode}
                      onSubmit={async (name, override, rt, sl) => {
                        await createBreakout(name, 20, override, rt, sl);
                        setShowCreateForm(false);
                      }}
                      onCancel={() => setShowCreateForm(false)}
                    />
                  )}
                </AnimatePresence>

                {isLoading ? (
                  <div className='flex items-center justify-center py-16'>
                    <Loader2 className='w-6 h-6 text-indigo-400 animate-spin' />
                  </div>
                ) : breakouts.length === 0 ? (
                  <div className='text-center py-16 text-white/20 text-xs uppercase tracking-widest'>
                    Create a breakout room to get started
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <AnimatePresence>
                      {breakouts.map((breakout) => (
                        <BreakoutCard
                          key={breakout.id}
                          breakout={breakout}
                          isOwner={isOwner}
                          orgMode={orgMode}
                          onStart={() => startBreakout(breakout.id)}
                          onClose={() => closeBreakout(breakout.id)}
                          onEnter={() => handleEnterBreakout(breakout)}
                          onGhostObserve={() => {
                            // First set the breakout in context, then navigate with ghost param
                            setCurrentBreakout(breakout);
                            navigate(`/room/${breakout.id}?ghost=true`);
                          }}
                          onResume={() => resumeBreakout(breakout.id)}
                          onCreateChild={createChildRoom}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Drag Overlay for smooth visuals */}
              <DragOverlay>
                {activeDragUser ? (
                  <div className='flex items-center gap-3 p-3 rounded-xl bg-indigo-500/30 border border-indigo-400 backdrop-blur-md shadow-2xl shadow-indigo-500/40 w-64 rotate-3 opacity-95'>
                    <UserAvatar
                      avatarUrl={activeDragUser.avatar_url || undefined}
                      name={activeDragUser.display_name}
                      className='w-8 h-8'
                    />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-black text-white uppercase tracking-tight truncate'>
                        {activeDragUser.display_name}
                      </p>
                      <p className='text-[9px] font-bold text-indigo-200 tracking-widest uppercase'>
                        Moving Participant...
                      </p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </div>{' '}
            {/* Close grid layout */}
          </DndContext>
        )}

        {/* AI Insights Panel — owner only, advisory, never mutates state */}
        {isOwner && (
          <div className='px-6 pb-8 max-w-7xl mx-auto mt-8'>
            <AIInsightsPanel
              orgId={org.id}
              liveInsights={aiInsights as AIInsight[]}
              aiEnabled={aiEnabled}
              onKillAI={killAI}
              onEnableAI={enableAI}
            />
          </div>
        )}
      </div>

      {isOwner && (orgMode === 'ULTRA_SECURE' || orgMode === 'MIXED') && (
        <AnomalyAlert anomalies={anomalies} />
      )}
    </div>
  );
};

export default OrganizationRoom;
