import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/useOrganization';
import { useBreakout } from '@/contexts/useBreakout';
import { useAuth } from '@/hooks/useAuth';
import { ModePolicyResolver } from '@/lib/ModePolicyResolver';
import { BreakoutService } from '@/services/BreakoutService';
import { BreakoutParticipant } from '@/types/organization';
import {
  ArrowLeft,
  Shield,
  Loader2,
  UserMinus,
  WifiOff,
  AlertTriangle,
  Crown,
  Users,
  StopCircle,
  Pause,
  RotateCcw,
} from 'lucide-react';
import AuditLogPanel from '@/components/AuditLogPanel';
import AISessionSummary from '@/components/AISessionSummary';
import { CooldownOverlay } from '@/components/games/chess/CooldownOverlay';
import { useEmotionalGuardian } from '@/contexts/useEmotionalGuardian';

// ─────────────────────────────────────────────────────────────
// Role Badge
// ─────────────────────────────────────────────────────────────
const RoleBadge: React.FC<{ role: string; isOwner?: boolean }> = ({ role, isOwner }) => {
  if (isOwner)
    return (
      <span className='inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30'>
        <Crown className='w-2.5 h-2.5' /> ORG OWNER
      </span>
    );
  if (role === 'HOST')
    return (
      <span className='inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'>
        HOST
      </span>
    );
  return (
    <span className='inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-white/5 text-white/30 border border-white/10'>
      PARTICIPANT
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Participant Row
// ─────────────────────────────────────────────────────────────
const ParticipantRow: React.FC<{
  participant: BreakoutParticipant;
  isHost: boolean;
  isOwner: boolean;
  breakoutId: string;
  ownerId: string;
  onRemove: (userId: string) => void;
}> = ({ participant, isHost, isOwner: _isOwner, breakoutId: _breakoutId, ownerId, onRemove }) => {
  const isThisOwner = participant.user_id === ownerId;
  return (
    <div className='flex items-center justify-between py-3 border-b border-white/5 last:border-0'>
      <div className='flex items-center gap-3'>
        <div className='w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 text-xs font-bold'>
          {participant.user?.display_name?.slice(0, 1)?.toUpperCase() || '?'}
        </div>
        <div>
          <p className='text-sm font-bold text-white'>
            {participant.user?.display_name || 'Unknown'}
          </p>
          <p className='text-[10px] text-white/30'>{participant.user?.email || ''}</p>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <RoleBadge role={participant.role} isOwner={isThisOwner} />
        {/* Host can remove participants (not the org owner or themselves) */}
        {isHost && !isThisOwner && participant.role !== 'HOST' && (
          <button
            onClick={() => onRemove(participant.user_id)}
            className='p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all'
            title='Remove to lobby'
          >
            <UserMinus className='w-3.5 h-3.5' />
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Breakout Room Page
// ─────────────────────────────────────────────────────────────
const BreakoutRoom: React.FC = () => {
  const { orgId, breakoutId } = useParams<{ orgId: string; breakoutId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();
  const {
    currentBreakout,
    closeBreakout,
    removeParticipantToLobby,
    pauseBreakout,
    resumeBreakout,
    isReconnecting,
  } = useBreakout();
  const { isCoolingDown, cooldownDuration, completeCooldown } = useEmotionalGuardian(breakoutId);

  const [participants, setParticipants] = useState<BreakoutParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Set current org from param
  useEffect(() => {
    if (orgId && organizations.length > 0) {
      const org = organizations.find((o) => o.id === orgId);
      if (org) setCurrentOrganization(org);
    }
  }, [orgId, organizations, setCurrentOrganization]);

  // Load participants
  useEffect(() => {
    if (!breakoutId) return;
    setIsLoading(true);
    BreakoutService.getBreakoutParticipants(breakoutId)
      .then(setParticipants)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [breakoutId]);

  const org = currentOrganization;
  if (!org) {
    return (
      <div className='min-h-screen bg-[#080a0e] flex items-center justify-center'>
        <Loader2 className='w-8 h-8 text-indigo-400 animate-spin' />
      </div>
    );
  }

  const isOwner = org.owner_id === user?.id;
  const effectiveMode = ModePolicyResolver.resolveEffectiveMode(org, currentBreakout || undefined);
  const policy = ModePolicyResolver.getPolicy(effectiveMode);
  const badge = ModePolicyResolver.getBadge(effectiveMode);
  const isHost = !!(user && currentBreakout?.host_id === user.id);

  const handleRemove = async (userId: string) => {
    if (!breakoutId) return;
    await removeParticipantToLobby(breakoutId, userId);
    setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
  };

  return (
    <div className='min-h-screen bg-[#080a0e] relative'>
      <CooldownOverlay
        show={isCoolingDown}
        duration={cooldownDuration}
        onComplete={completeCooldown}
      />
      {/* Reconnecting banner (Phase 10: page refresh / online event) */}
      {isReconnecting && (
        <div className='bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-3'>
          <WifiOff className='w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse' />
          <p className='text-amber-300 text-[10px] font-black uppercase tracking-widest'>
            Reconnecting — syncing session...
          </p>
        </div>
      )}
      {/* PAUSED Banner — host disconnected (Phase 10 edge case) */}
      {currentBreakout?.status === 'PAUSED' && (
        <div className='bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center gap-3'>
          <Pause className='w-4 h-4 text-amber-400 shrink-0' />
          <div className='flex-1'>
            <p className='text-amber-300 text-[10px] font-black uppercase tracking-widest'>
              Session Paused — Host disconnected
            </p>
            <p className='text-amber-300/50 text-[9px] mt-0.5'>
              {effectiveMode === 'ULTRA_SECURE'
                ? 'ULTRA SECURE mode: session is frozen until the host reconnects or the owner resumes it.'
                : 'Waiting for host to reconnect. Session will resume automatically.'}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => breakoutId && resumeBreakout(breakoutId)}
              className='h-8 px-4 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0'
            >
              <RotateCcw className='w-3 h-3' /> Resume
            </button>
          )}
        </div>
      )}
      {/* Compliance Banner — ULTRA only */}
      {policy.ui.showComplianceBanner && (
        <div className='bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 flex items-center gap-3'>
          <AlertTriangle className='w-4 h-4 text-red-400 shrink-0' />
          <p className='text-red-300 text-[10px] font-black uppercase tracking-widest flex-1'>
            ULTRA SECURE BREAKOUT — Recording active. All events are signed and immutably logged.
          </p>
          <div className='flex items-center gap-1.5 text-[10px] text-red-400 font-black uppercase'>
            <div className='w-2 h-2 bg-red-400 rounded-full animate-pulse' />
            REC
          </div>
        </div>
      )}

      <div className='max-w-5xl mx-auto px-6 py-8'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-8'>
          <button
            onClick={() => navigate(`/organizations/${orgId}/room`)}
            className='p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all'
          >
            <ArrowLeft className='w-5 h-5' />
          </button>
          <div className='flex-1'>
            <div className='flex items-center gap-3 mb-1'>
              <h1 className='text-xl font-black uppercase tracking-tight text-white'>
                {currentBreakout?.name || 'Breakout Room'}
              </h1>
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${badge.color}`}
              >
                {badge.emoji} {badge.label}
              </span>
              {currentBreakout?.status === 'LIVE' && (
                <span className='flex items-center gap-1 text-[9px] text-emerald-400 font-black uppercase'>
                  <div className='w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse' /> LIVE
                </span>
              )}
            </div>
            <div className='flex items-center gap-2'>
              {isOwner && <RoleBadge role='OWNER' isOwner />}
              {isHost && !isOwner && <RoleBadge role='HOST' />}
              {!isOwner && !isHost && <RoleBadge role='PARTICIPANT' />}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left: Participants */}
          <div className='lg:col-span-1'>
            <div className='bg-white/[0.02] border border-white/5 rounded-3xl p-5'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-[10px] font-black uppercase tracking-widest text-white/40'>
                  Participants
                </h2>
                <div className='flex items-center gap-1.5 text-[10px] text-white/30'>
                  <Users className='w-3.5 h-3.5' />
                  <span>{participants.length}</span>
                </div>
              </div>

              {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='w-5 h-5 text-indigo-400 animate-spin' />
                </div>
              ) : participants.length === 0 ? (
                <div className='text-center py-8 text-white/20 text-xs'>
                  No participants assigned yet
                </div>
              ) : (
                participants.map((p) => (
                  <ParticipantRow
                    key={p.user_id}
                    participant={p}
                    isHost={isHost}
                    isOwner={isOwner}
                    breakoutId={breakoutId!}
                    ownerId={org.owner_id}
                    onRemove={handleRemove}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Host Controls + Mode Restrictions */}
          <div className='lg:col-span-2 space-y-4'>
            {/* Policy info card */}
            <div className={`rounded-3xl p-5 border ${badge.color} bg-opacity-5`}>
              <h3 className='text-[10px] font-black uppercase tracking-widest mb-4 opacity-70'>
                {badge.emoji} {badge.label} — Active Restrictions
              </h3>
              <div className='grid grid-cols-2 gap-3'>
                {[
                  { label: 'Participant can move', value: policy.canParticipantRequestMove },
                  { label: 'Host can reassign', value: policy.canHostReassignParticipant },
                  { label: 'Owner silent join', value: policy.canOwnerJoinSilently },
                  { label: 'Mandatory recording', value: policy.mandatoryRecording },
                  { label: 'Identity enforced', value: policy.identityEnforced },
                  { label: 'Nicknames allowed', value: policy.allowNicknames },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className='flex items-center justify-between text-[10px] bg-black/20 rounded-xl px-3 py-2'
                  >
                    <span className='text-white/40 font-bold uppercase tracking-wider'>
                      {label}
                    </span>
                    <span
                      className={
                        value ? 'text-emerald-400 font-black' : 'text-red-400/70 font-black'
                      }
                    >
                      {value ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host controls */}
            {(isHost || isOwner) && (
              <div className='bg-white/[0.02] border border-white/5 rounded-3xl p-5'>
                <h3 className='text-[10px] font-black uppercase tracking-widest text-white/40 mb-4'>
                  {isOwner ? 'Owner Controls' : 'Host Controls'}
                </h3>
                <div className='space-y-2'>
                  {!policy.ui.lockParticipantControls && (
                    <div className='text-[10px] text-white/30 italic'>
                      Participant controls are enabled in {badge.label} mode.
                    </div>
                  )}
                  {policy.ui.lockParticipantControls && (
                    <div className='flex items-center gap-2 text-[10px] text-amber-400/70 font-bold uppercase tracking-widest bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2'>
                      <Shield className='w-3 h-3' />
                      Participant self-controls are locked in this mode
                    </div>
                  )}
                  {isOwner && breakoutId && (
                    <>
                      {/* Phase 10: Host-disconnect — owner can pause if ULTRA_SECURE or resume if PAUSED */}
                      {currentBreakout?.status === 'LIVE' && effectiveMode === 'ULTRA_SECURE' && (
                        <button
                          onClick={() => pauseBreakout(breakoutId)}
                          className='w-full h-9 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all'
                        >
                          <Pause className='w-3.5 h-3.5' /> Pause Breakout
                        </button>
                      )}
                      {currentBreakout?.status === 'PAUSED' && (
                        <button
                          onClick={() => resumeBreakout(breakoutId)}
                          className='w-full h-9 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all'
                        >
                          <RotateCcw className='w-3.5 h-3.5' /> Resume Breakout
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await closeBreakout(breakoutId);
                          navigate(`/organizations/${orgId}/room`);
                        }}
                        className='w-full h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-2'
                      >
                        <StopCircle className='w-3.5 h-3.5' /> Close Breakout
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* FUN mode reactions */}
            {policy.ui.showReactions && (
              <div className='bg-white/[0.02] border border-emerald-500/10 rounded-3xl p-5'>
                <h3 className='text-[10px] font-black uppercase tracking-widest text-emerald-400/60 mb-3'>
                  🟢 Reactions (FUN Mode)
                </h3>
                <div className='flex gap-2 flex-wrap'>
                  {['👍', '🎉', '❤️', '😂', '🔥', '👏', '💡', '🚀'].map((emoji) => (
                    <button
                      key={emoji}
                      className='w-10 h-10 rounded-xl bg-white/5 hover:bg-emerald-500/10 hover:scale-110 transition-all text-xl flex items-center justify-center'
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Session Summary (Auto-Generated) */}
            <AISessionSummary />

            {/* ULTRA SECURE — Owner-only Immutable Audit Log (GAP 3) */}
            {isOwner && effectiveMode === 'ULTRA_SECURE' && org && (
              <AuditLogPanel orgId={org.id} breakoutId={breakoutId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakoutRoom;
