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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${badge.color}`}
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
// Org Card
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-3xl border transition-all cursor-pointer group overflow-hidden ${
        isActive
          ? 'bg-white/[0.04] border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.08)]'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
      }`}
      onClick={onSelect}
    >
      {/* Mode color strip */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 ${
          org.mode === 'FUN'
            ? 'bg-emerald-500/60'
            : org.mode === 'PROF'
              ? 'bg-blue-500/60'
              : org.mode === 'ULTRA_SECURE'
                ? 'bg-red-500/60'
                : 'bg-purple-500/60'
        }`}
      />

      <div className='p-6'>
        <div className='flex items-start justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                org.mode === 'FUN'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : org.mode === 'PROF'
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    : org.mode === 'ULTRA_SECURE'
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
              }`}
            >
              <ModeIcon mode={org.mode} className='w-5 h-5' />
            </div>
            <div>
              <h3 className='text-white font-black text-base uppercase tracking-tight'>
                {org.name}
              </h3>
              <p className='text-white/30 text-[10px] font-mono'>/{org.slug}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <ModeBadge mode={org.mode} />
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className='p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all'
                title='Delete Organization'
              >
                <Trash2 className='w-3.5 h-3.5' />
              </button>
            )}
          </div>
        </div>

        <p className='text-[10px] text-white/30 uppercase tracking-widest font-bold mb-5'>
          {policy.ui.modeBadgeLabel} —{' '}
          {org.mode === 'FUN'
            ? 'Casual, social, low friction'
            : org.mode === 'PROF'
              ? 'Structured controlled collaboration'
              : org.mode === 'ULTRA_SECURE'
                ? 'Zero-trust, immutable audit'
                : 'Hybrid governance, per-breakout rules'}
        </p>

        <div className='flex items-center gap-2'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnterRoom();
            }}
            className='flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all'
          >
            <Building2 className='w-3.5 h-3.5' />
            Enter Room
            <ChevronRight className='w-3 h-3' />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Organizations Page
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

    // Handle full invite links by extracting the code
    if (code.includes('/join/')) {
      const parts = code.split('/join/');
      code = parts[1].split('?')[0].split('/')[0];
    } else if (code.includes('/organizations/')) {
      const parts = code.split('/organizations/');
      code = parts[1].split('/')[0].split('?')[0];
    }

    setIsJoining(true);
    try {
      // The join code currently maps to the Organization UUID.
      // If we implement invite tokens, we would extract the UUID or resolve it first.
      await OrganizationService.joinOrganizationByCode(code);
      toast.success('Joined organization successfully');
      setCurrentOrganization(null); // Clear to force reload or re-fetch in effect
      window.location.reload(); // Simple refresh to pick up new org context
    } catch (error) {
      toast.error('Failed to join', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleEnterRoom = (org: Organization) => {
    setCurrentOrganization(org);
    // Auto-provision the Organization Room if it doesn't already exist on the SFU server
    createRoom(
      org.id,
      org.name,
      undefined,
      'organization',
      () => {
        // Upon success (or joining if already exists), navigate to the normal room view
        navigate(`/room/${org.id}?type=org`);
      },
      org.id,
      { mode: org.mode || 'mixed', games: false }
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
    <div className='min-h-screen bg-[#080a0e] relative overflow-hidden'>
      {/* Background gradient */}
      <div className='absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-purple-950/10 pointer-events-none' />

      <div className='relative z-10 max-w-5xl mx-auto px-6 py-10'>
        {/* Header */}
        <div className='flex items-center justify-between mb-10'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center'>
                <Building2 className='w-5 h-5 text-indigo-400' />
              </div>
              <div>
                <h1 className='text-2xl font-black uppercase tracking-tighter text-white'>
                  Organizations
                </h1>
                <p className='text-[10px] font-bold text-white/30 uppercase tracking-widest'>
                  Governance-first workspaces
                </p>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <div className='relative group flex items-center'>
              <input
                type='text'
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder='Enter Invite Code'
                className='h-10 px-4 pr-20 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white placeholder-white/30 outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all w-[200px]'
              />
              <button
                onClick={handleJoinCode}
                disabled={!joinCode.trim() || isJoining}
                className='absolute right-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase disabled:opacity-50 transition-all flex items-center justify-center min-w-[50px]'
              >
                {isJoining ? <Loader2 className='w-3 h-3 animate-spin' /> : 'Join'}
              </button>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className='h-10 px-5 rounded-2xl bg-white text-black hover:bg-indigo-50 transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-white/5'
            >
              <Plus className='w-3.5 h-3.5' />
              New Organization
            </button>
          </div>
        </div>

        {/* Mode legend */}
        <div className='flex items-center gap-3 mb-8 flex-wrap'>
          {(['FUN', 'PROF', 'ULTRA_SECURE', 'MIXED'] as OrgMode[]).map((m) => (
            <ModeBadge key={m} mode={m} />
          ))}
          <span className='text-[9px] text-white/20 font-bold uppercase tracking-widest ml-1'>
            — policy-driven modes, not themes
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className='flex items-center justify-center py-24'>
            <Loader2 className='w-8 h-8 text-indigo-400 animate-spin' />
          </div>
        ) : organizations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex flex-col items-center justify-center py-24 text-center'
          >
            <div className='w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6'>
              <Building2 className='w-9 h-9 text-white/20' />
            </div>
            <h2 className='text-white font-black text-lg uppercase tracking-tight mb-2'>
              No Organizations Yet
            </h2>
            <p className='text-white/30 text-sm max-w-xs mb-6'>
              Create your first organization to set up a governed workspace with breakout rooms.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className='h-10 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all'
            >
              <Plus className='w-3.5 h-3.5' /> Create Organization
            </button>
          </motion.div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
      </div>

      <CreateOrganizationModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <OrganizationSettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      <AlertDialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
        <AlertDialogContent className='bg-[#0c1016] border-white/10 rounded-[2rem]'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-white font-black uppercase tracking-tight'>
              Delete Organization?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-white/40 font-medium'>
              This will permanently delete{' '}
              <span className='text-white font-bold'>{orgToDelete?.name}</span> and all its
              associated breakout rooms and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-4'>
            <AlertDialogCancel className='bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className='bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl h-10 px-6'
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Organizations;
