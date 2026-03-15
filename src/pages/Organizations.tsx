import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/contexts/useOrganization';
import { ModePolicyResolver } from '@/lib/ModePolicyResolver';
import { CreateOrganizationModal } from '@/components/CreateOrganizationModal';
import { OrganizationSettingsModal } from '@/components/OrganizationSettingsModal';
import { Organization, OrgMode } from '@/types/organization';
import { toast } from 'sonner';
import { useWebSocket } from '@/hooks/useWebSocket';
import { OrganizationService } from '@/services/OrganizationService';
import { normalizeRoomMode } from '@/services/RoomIntelligence';
import { NeuralInformer } from '@/components/intelligence';
import { RecentRoomsCard } from '@/components/dashboard/RecentRoomsCard';
import {
  Building2,
  Plus,
  ChevronRight,
  Loader2,
  Shield,
  Gamepad2,
  Briefcase,
  Layers,
  Trash2,
  Network,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─────────────────────────────────────────────────────────────
// Mode Badge Component
// ─────────────────────────────────────────────────────────────

const ModeBadge: React.FC<{ mode: OrgMode }> = ({ mode }) => {
  const badge = ModePolicyResolver.getBadge(mode);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${badge.color}`}
    >
      <span>{badge.emoji}</span>
      {badge.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Mode Icon
// ─────────────────────────────────────────────────────────────

const ModeIcon: React.FC<{ mode: OrgMode; className?: string }> = ({
  mode,
  className = 'w-5 h-5',
}) => {
  if (mode === 'FUN') return <Gamepad2 className={className} />;
  if (mode === 'PROF') return <Briefcase className={className} />;
  if (mode === 'ULTRA_SECURE') return <Shield className={className} />;
  return <Layers className={className} />;
};

// ─────────────────────────────────────────────────────────────
// Advanced Org Card
// ─────────────────────────────────────────────────────────────

const OrgCard: React.FC<{
  org: Organization;
  isActive: boolean;
  isOwner: boolean;
  onSelect: () => void;
  onEnterRoom: () => void;
  onDelete: () => void;
}> = ({ org, isActive, isOwner, onSelect, onEnterRoom, onDelete }) => {
  const policy = ModePolicyResolver.getPolicy(org.mode);

  return (
    <NeuralInformer
      title={org.name}
      description={`${policy.ui.modeBadgeLabel} Infrastructure. ${org.mode === 'FUN' ? 'Social interaction matrix.' : org.mode === 'PROF' ? 'Structured collaboration node.' : org.mode === 'ULTRA_SECURE' ? 'Zero-trust environment running.' : 'Hybrid protocol active.'}`}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-[24px] border p-6 transition-all duration-300 cursor-pointer group overflow-hidden ${
          isActive
            ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
            : 'bg-[#0F1116] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
        }`}
        onClick={onSelect}
      >
        {/* Hover Glow Effect */}
        <div
          className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${
            org.mode === 'FUN'
              ? 'bg-emerald-500/30'
              : org.mode === 'PROF'
                ? 'bg-blue-500/30'
                : org.mode === 'ULTRA_SECURE'
                  ? 'bg-red-500/30'
                  : 'bg-purple-500/30'
          }`}
        />

        <div className='flex items-start justify-between mb-8 relative z-10'>
          <div className='flex items-center gap-4'>
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl ${
                org.mode === 'FUN'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                  : org.mode === 'PROF'
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
                    : org.mode === 'ULTRA_SECURE'
                      ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_4px_20px_rgba(239,68,68,0.15)]'
                      : 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_4px_20px_rgba(168,85,247,0.15)]'
              }`}
            >
              <ModeIcon mode={org.mode} className='w-6 h-6' />
            </div>
            <div>
              <h3 className='text-white font-black text-xl uppercase tracking-tight'>{org.name}</h3>
              <p className='text-zinc-500 text-[11px] font-mono tracking-wider mt-0.5 mb-2'>
                /{org.slug || org.id.substring(0, 8)}
              </p>
              <ModeBadge mode={org.mode} />
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className='w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all'
                title='Terminate Organization'
              >
                <Trash2 className='w-4 h-4' />
              </button>
            )}
          </div>
        </div>

        <div className='flex items-center justify-between mt-6 relative z-10 border-t border-white/5 pt-5'>
          <div className='flex flex-col'>
            <span className='text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1'>
              Role Identifier
            </span>
            <span
              className={`text-xs font-black uppercase tracking-wider ${isOwner ? 'text-indigo-400' : 'text-zinc-400'}`}
            >
              {isOwner ? 'Super Host' : 'Member'}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnterRoom();
            }}
            className='h-12 px-8 rounded-xl bg-white text-black hover:scale-105 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
          >
            ENTER HUB
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      </motion.div>
    </NeuralInformer>
  );
};

// ─────────────────────────────────────────────────────────────
// Organizations Page Main
// ─────────────────────────────────────────────────────────────

const Organizations: React.FC = () => {
  const navigate = useNavigate();
  const {
    organizations,
    currentOrganization,
    setCurrentOrganization,
    isLoading,
    deleteOrganization,
  } = useOrganization();
  const { createRoom } = useWebSocket();
  const { user } = useAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleJoinCode = async () => {
    let code = joinCode.trim();
    if (!code) return;

    if (code.includes('/join/')) {
      const parts = code.split('/join/');
      code = parts[1].split('?')[0].split('/')[0];
    } else if (code.includes('/organizations/')) {
      const parts = code.split('/organizations/');
      code = parts[1].split('/')[0].split('?')[0];
    }

    setIsJoining(true);
    try {
      await OrganizationService.joinOrganizationByCode(code);
      toast.success('Joined organization successfully', { description: 'Connection established.' });
      setCurrentOrganization(null);
      window.location.reload();
    } catch (error) {
      toast.error('Connection Failed', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleEnterRoom = (org: Organization) => {
    setCurrentOrganization(org);
    createRoom(
      org.id,
      org.name,
      undefined,
      'organization',
      () => {
        navigate(`/room/${org.id}?type=org`);
      },
      org.id,
      { mode: normalizeRoomMode(org.mode), games: false }
    );
  };

  const handleDeleteConfirm = async () => {
    if (!orgToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrganization(orgToDelete.id);
      setOrgToDelete(null);
    } catch (_error) {
      // Error handled by context
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='flex flex-col h-full bg-[#05060a] relative overflow-hidden font-sans min-h-screen'>
      {/* AI Glows */}
      <div className='absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[140px] pointer-events-none' />
      <div className='absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/[0.02] rounded-full blur-[140px] pointer-events-none' />

      <div className='flex-1 overflow-y-auto custom-scrollbar pt-8 px-6 lg:px-12 pb-12 relative z-10'>
        {/* Header Section */}
        <div className='flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mb-10'>
          <div>
            <div className='flex items-center gap-4 mb-2'>
              <div className='h-px w-8 bg-indigo-500' />
              <span className='text-[10px] font-bold text-indigo-400 uppercase tracking-widest'>
                Workspace Matrix
              </span>
            </div>
            <h2 className='text-5xl font-black text-white italic uppercase tracking-tighter mb-2'>
              ORGANIZATIONS
            </h2>
            <p className='text-zinc-500 font-medium max-w-xl'>
              Architect and govern isolated environments. Establish policies, roles, and deep
              collaboration hubs across your network.
            </p>
          </div>

          <div className='flex items-center gap-4 flex-wrap'>
            <div className='relative group flex items-center'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500'></div>
              <div className='relative flex items-center bg-[#0F1116] border border-white/10 rounded-xl p-1 focus-within:border-indigo-500/50 transition-colors'>
                <input
                  type='text'
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder='ENTER INVITE LINK...'
                  className='h-10 px-4 bg-transparent text-[10px] font-black uppercase tracking-widest text-white placeholder-zinc-600 outline-none w-[200px] lg:w-[240px]'
                />
                <button
                  onClick={handleJoinCode}
                  disabled={!joinCode.trim() || isJoining}
                  className='h-10 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center min-w-[80px]'
                >
                  {isJoining ? <Loader2 className='w-4 h-4 animate-spin' /> : 'JOIN'}
                </button>
              </div>
            </div>

            <NeuralInformer
              title='Initialize Organization'
              description='Create a new isolated tenant environment capable of spawning unlimited nested sub-rooms with custom governance.'
            >
              <button
                onClick={() => setIsCreateOpen(true)}
                className='h-12 px-6 rounded-xl bg-white text-black hover:scale-105 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]'
              >
                <Plus className='w-4 h-4' />
                NEW ORG
              </button>
            </NeuralInformer>
          </div>
        </div>

        {/* Action Panel */}
        <div className='flex items-center gap-4 mb-10 p-5 bg-[#0F1116] border border-white/5 rounded-2xl flex-wrap'>
          <div className='flex items-center gap-2 mr-4'>
            <Network className='w-4 h-4 text-zinc-500' />
            <span className='text-[10px] font-black uppercase tracking-widest text-zinc-500'>
              Detected Architectures
            </span>
          </div>
          <div className='flex items-center gap-3 flex-wrap'>
            {(['FUN', 'PROF', 'ULTRA_SECURE', 'MIXED'] as OrgMode[]).map((m) => (
              <ModeBadge key={m} mode={m} />
            ))}
          </div>
        </div>

        {/* Grid Content */}
        {isLoading ? (
          <div className='flex items-center justify-center py-32'>
            <div className='flex flex-col items-center gap-4'>
              <div className='w-12 h-12 border-b-2 border-indigo-500 rounded-full animate-spin' />
              <span className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest'>
                Syncing Grid...
              </span>
            </div>
          </div>
        ) : organizations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='flex flex-col items-center justify-center py-32 text-center bg-[#0F1116] border border-white/5 rounded-[32px]'
          >
            <div className='w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-8 relative'>
              <div className='absolute inset-0 bg-indigo-500/10 rounded-3xl animate-pulse blur-xl' />
              <Building2 className='w-10 h-10 text-indigo-400 relative z-10' />
            </div>
            <h2 className='text-3xl font-black text-white italic uppercase tracking-tighter mb-4'>
              NO ORGS FOUND
            </h2>
            <p className='text-zinc-500 font-medium max-w-sm mb-8'>
              Your sector is currently empty. Initialize an organization to begin establishing
              secure team environments.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className='h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-105'
            >
              <Plus className='w-4 h-4' /> INITIALIZE ORG
            </button>
          </motion.div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'>
            <AnimatePresence>
              {organizations.map((org) => (
                <OrgCard
                  key={org.id}
                  org={{ ...org, mode: org.mode || 'FUN' }}
                  isActive={currentOrganization?.id === org.id}
                  isOwner={org.owner_id === user?.id}
                  onSelect={() => setCurrentOrganization(org)}
                  onEnterRoom={() => handleEnterRoom(org)}
                  onDelete={() => setOrgToDelete(org)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Action History Container */}
        <div className='mt-12'>
          <RecentRoomsCard
            filterType='organization'
            title='Organization History'
            subtitle='Your active & past tenant nodes'
          />
        </div>
      </div>

      <CreateOrganizationModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <OrganizationSettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      <AlertDialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
        <AlertDialogContent className='bg-[#080a0e] border border-red-500/20 rounded-[24px] shadow-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-2xl font-black text-white italic uppercase tracking-tighter mb-2'>
              Destruct Warning
            </AlertDialogTitle>
            <AlertDialogDescription className='text-zinc-400 font-medium text-sm leading-relaxed'>
              This action will permanently obliterate{' '}
              <strong className='text-white font-black uppercase'>{orgToDelete?.name}</strong> and
              purge all nested breakout rooms, activity logs, and system data.
              <br />
              <br />
              <span className='text-red-400 font-bold'>This protocol cannot be reversed.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end'>
            <AlertDialogCancel className='bg-[#0F1116] border border-white/10 text-white hover:bg-white/5 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] m-0'>
              ABORT
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className='bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl h-12 m-0'
            >
              {isDeleting ? 'PURGING...' : 'TERMINATE ORG'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Organizations;
