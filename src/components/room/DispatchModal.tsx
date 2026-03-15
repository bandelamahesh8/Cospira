import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  UserPlus,
  Shield,
  ChevronRight,
  Search,
  LayoutGrid,
  Plus,
  Lock,
  Trash2,
  Play,
  Building2,
  ArrowRightLeft,
  Home,
  MessageSquareText,
  Activity,
  Zap,
  History,
  Command,
  AlertTriangle,
  Network,
  Sparkles,
  CheckSquare,
  Square,
  RefreshCw,
  Bot,
  Ghost,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBreakout } from '@/contexts/useBreakout';
import { useOrganization } from '@/contexts/useOrganization';
import {
  BreakoutSession,
  OrgMode,
  GlobalScenario,
  UserPresence,
  RoomType,
  SecurityLevel,
} from '@/types/organization';
import { ModePolicyResolver } from '@/lib/ModePolicyResolver';
import { useCommandFeed } from '@/contexts/useCommandFeed';
import { OrgMember } from '@/services/BreakoutService';
import { calculateDistributionMap } from '@/lib/breakout/SmartDivider';
import { CommandFeed } from '@/components/room/CommandFeed';
import { HistoryModal } from '@/components/room/HistoryModal';
import { roomEventBus } from '@/lib/breakout/EventBus';
import UserAvatar from '@/components/UserAvatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { NeuralMap } from '@/components/room/NeuralMap';
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

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

const LiveAISuggestions = () => {
  const { events } = useCommandFeed(5);
  const alerts = events.filter((e) => e.type === 'ALERT' || e.type === 'NEURAL_GUARDIAN');

  if (alerts.length === 0) return null;

  return (
    <div className='mb-6 flex gap-4 overflow-x-auto no-scrollbar pb-2'>
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`flex-none w-72 p-3 rounded-2xl border backdrop-blur-md flex flex-col gap-1 ${
              alert.level === 'error'
                ? 'bg-red-500/10 border-red-500/20'
                : alert.level === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-indigo-500/10 border-indigo-500/20'
            }`}
          >
            <div className='flex items-center justify-between'>
              <span className='text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5'>
                <Activity className='w-2.5 h-2.5' /> AI Insight
              </span>
              <span className='text-[8px] font-medium text-white/20 uppercase'>Now</span>
            </div>
            <h5
              className={`text-[10px] font-black uppercase tracking-tight ${
                alert.level === 'error'
                  ? 'text-red-400'
                  : alert.level === 'warning'
                    ? 'text-amber-400'
                    : 'text-indigo-400'
              }`}
            >
              {alert.title}
            </h5>
            <p className='text-[9px] text-white/60 leading-tight line-clamp-2'>
              {alert.description}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const DispatchModal: React.FC<DispatchModalProps> = ({ isOpen, onClose, orgId: _orgId }) => {
  const {
    breakouts,
    orgMembers,
    refreshBreakouts,
    refreshOrgMembers,
    assignHost,
    assignParticipant,
    removeParticipantToLobby,
    startBreakout,
    closeBreakout,
    createBreakout,
    setCurrentBreakout,
    lobbyUsers,
    userLocations: _userLocations,
    masterBroadcast,
    enableAI,
    killAI,
    aiEnabled,
    switchOrgMode,
    batchAssignParticipants,
    pauseBreakout,
    resumeBreakout,
    createChildRoom,
    deleteBreakout,
  } = useBreakout();
  const { user } = useAuth();
  const navigate = useNavigate();
  // UI Modes
  const [activeTab, setActiveTab] = useState<'rooms' | 'members'>('rooms');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyRoom, setHistoryRoom] = useState<{ id: string; name: string } | null>(null);
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMaxParticipants, setNewRoomMaxParticipants] = useState(20);
  const [createLoading, setCreateLoading] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [modeOverride] = useState<OrgMode>('FUN');
  const [newRoomType] = useState<RoomType>('GENERAL');
  const [newRoomSecurity] = useState<SecurityLevel>('STANDARD');

  // V2 Mission Control State
  const [globalScenario, setGlobalScenario] = useState<GlobalScenario>('NORMAL');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteCommand, setPaletteCommand] = useState('');
  const [showNeuralMap, setShowNeuralMap] = useState(false);

  // Global Controls State
  const [showGlobalCommands, setShowGlobalCommands] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Bulk Actions State
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);

  // AI Auto-Assign Panel State
  const [showAIAutoAssign, setShowAIAutoAssign] = useState(false);
  const [aiAssignExceptions, setAIAssignExceptions] = useState<Set<string>>(new Set());
  const [isAIAssigning, setIsAIAssigning] = useState(false);
  const [aiAssignTargetRoom, setAIAssignTargetRoom] = useState<string>('auto');

  const { currentOrganization } = useOrganization();
  const orgMode = currentOrganization?.mode || 'FUN';
  const isMixed = orgMode === 'MIXED';
  const location = useLocation();

  // Derived: Current User's Location (Robust Resolution)
  const currentUserLocation = useMemo(() => {
    if (!user) return null;

    // 0. URL-based detection (highest priority) — if user navigated to /room/<uuid>,
    //    that UUID is their current location. Match it against known breakouts/child rooms.
    const pathMatch = location.pathname.match(/\/room\/([^/]+)$/);
    if (pathMatch) {
      const rawRoomId = pathMatch[1];
      // Decode if it looks Base64 encoded (not a plain UUID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rawRoomId
      );
      const roomId = isUUID
        ? rawRoomId
        : (() => {
            try {
              let b64 = rawRoomId.replace(/-/g, '+').replace(/_/g, '/');
              while (b64.length % 4) b64 += '=';
              return atob(b64);
            } catch {
              return rawRoomId;
            }
          })();

      // Check if it's a known parent breakout ID
      if (breakouts.some((b) => b.id === roomId)) return roomId;

      // Check if it's a child room ID
      for (const b of breakouts) {
        if (b.child_rooms?.some((c) => c.id === roomId)) return roomId;
      }

      // It matched org main room — treat as lobby
      if (currentOrganization?.id === roomId) return 'LOBBY';
    }

    // 1. Direct from orgMembers (database truth from BreakoutService)
    const member = orgMembers.find((m) => m.user_id === user.id);
    if (member?.assignedBreakoutId) return member.assignedBreakoutId;

    // 2. From real-time presence (socket truth)
    const isInLobby = lobbyUsers?.some((u) => u.user_id === user.id);
    if (isInLobby) return 'LOBBY';

    // 3. Fallback: check all breakouts and child rooms (deep scan of snapshots)
    for (const b of breakouts) {
      if (b.participants?.some((p) => p.user_id === user.id)) return b.id;
      if (b.child_rooms) {
        for (const child of b.child_rooms) {
          if (child.participants?.some((p) => p.user_id === user.id)) return child.id;
        }
      }
    }

    // 4. Ultimate Fallback: If they are in this Command Center, they are in the Main Lobby
    return 'LOBBY';
  }, [user, orgMembers, lobbyUsers, breakouts, location.pathname, currentOrganization]);

  // Initial load & V2 Listeners
  useEffect(() => {
    if (isOpen) {
      refreshBreakouts();
      refreshOrgMembers();
    }

    // CMD+K Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, refreshBreakouts, refreshOrgMembers]);

  // ── AI Auto-Assign to Rooms (MUST be before early return — hooks rule) ──
  const handleAIAutoAssignToRooms = useCallback(async () => {
    const liveRooms = breakouts.flatMap((b) => {
      const rooms = [];
      if (b.status === 'LIVE') rooms.push(b);
      if (b.child_rooms) {
        rooms.push(...b.child_rooms.filter((c) => c.status === 'LIVE'));
      }
      return rooms;
    });

    if (liveRooms.length === 0) {
      toast.error('No LIVE rooms available. Create and start breakouts first.');
      return;
    }
    const eligibleUsers = lobbyUsers.filter((u) => !aiAssignExceptions.has(u.user_id));
    if (eligibleUsers.length === 0) {
      toast.error('All lobby users are excepted. Remove some exceptions to proceed.');
      return;
    }
    setIsAIAssigning(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      let targetRooms = liveRooms;
      if (aiAssignTargetRoom !== 'auto') {
        targetRooms = liveRooms.filter((c) => c.id === aiAssignTargetRoom);
      }

      // Use the actual AI Distribution Engine instead of round-robin
      const distribution = calculateDistributionMap(
        eligibleUsers as unknown as UserPresence[],
        targetRooms
      );

      await Promise.all(
        distribution.map(async ({ roomId, userIds }) => {
          if (userIds.length > 0) await batchAssignParticipants(roomId, userIds);
        })
      );
      const excepted = aiAssignExceptions.size;
      toast.success(
        `AI assigned ${eligibleUsers.length} members to ${targetRooms.length} room${targetRooms.length > 1 ? 's' : ''}${excepted > 0 ? ` (${excepted} excepted)` : ''}`
      );
      setShowAIAutoAssign(false);
      setAIAssignExceptions(new Set());
    } catch (_err) {
      toast.error('AI auto-assign failed partially');
    } finally {
      setIsAIAssigning(false);
    }
  }, [lobbyUsers, breakouts, aiAssignExceptions, aiAssignTargetRoom, batchAssignParticipants]);

  if (!isOpen) return null;

  // Sorting priorities: Me > Superhost > Host > Cohost > Participant
  const getRolePriority = (roleName: string) => {
    const role = roleName.toLowerCase();
    if (role.includes('superhost')) return 1;
    if (role.includes('host') && !role.includes('cohost')) return 2;
    if (role.includes('cohost')) return 3;
    if (role.includes('participant')) return 4;
    return 5; // default for any other roles
  };

  const filteredMembers = orgMembers
    .filter((m: OrgMember) => m.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a: OrgMember, b: OrgMember) => {
      // 1. Current user always first
      if (a.user_id === user?.id) return -1;
      if (b.user_id === user?.id) return 1;

      // 2. Role priority
      const pA = getRolePriority(a.role);
      const pB = getRolePriority(b.role);

      if (pA !== pB) return pA - pB;

      // 3. Alphabetical secondary sort
      return a.display_name.localeCompare(b.display_name);
    });

  const filteredBreakouts = breakouts.filter((b: BreakoutSession) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignToRoom = async (userId: string, breakoutId: string) => {
    try {
      await assignParticipant(breakoutId, userId);
      toast.success('Member assigned to room');
    } catch (_err) {
      // toast.error is handled in context
    }
  };

  const handleSetHost = async (userId: string, breakoutId: string) => {
    try {
      await assignHost(breakoutId, userId);
      toast.success('Host assigned successfully');
    } catch (_err) {
      // error handled in context
    }
  };

  const handleEnterRoom = (breakout: BreakoutSession) => {
    setCurrentBreakout(breakout);
    navigate(`/room/${breakout.id}`);
    onClose();
  };

  const handleGhostObserve = (breakoutId: string) => {
    navigate(`/room/${breakoutId}?ghost=true`);
    onClose();
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      setCreateLoading(true);
      // If organization is MIXED, pass the selected mode override (defaults to FUN)
      await createBreakout(
        newRoomName.trim(),
        newRoomMaxParticipants,
        isMixed ? modeOverride : undefined,
        newRoomType,
        newRoomSecurity
      );
      setNewRoomName('');
      setIsCreatingRoom(false);
      toast.success('Breakout room created');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
      toast.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };
  const handleSmartDistribute = async () => {
    if (lobbyUsers.length === 0 || breakouts.length === 0) {
      toast.error('No users in lobby or no active rooms available');
      return;
    }

    const liveRooms = breakouts.filter((b) => b.status === 'LIVE');
    if (liveRooms.length === 0) {
      toast.error('No LIVE rooms available for distribution');
      return;
    }

    try {
      setIsDistributing(true);

      // Simulate "AI Analysis" delay for UX
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Calculate intelligent distribution
      const distributionMap = calculateDistributionMap(lobbyUsers, liveRooms);

      if (distributionMap.length === 0) {
        toast.error('Could not find suitable room matches based on capacity and skills.');
        return;
      }

      // Execute batch assignments
      await Promise.all(
        distributionMap.map(async ({ roomId, userIds }: { roomId: string; userIds: string[] }) => {
          if (userIds.length > 0) {
            await batchAssignParticipants(roomId, userIds);
          }
        })
      );

      const totalAssigned = distributionMap.reduce(
        (acc: number, curr: { roomId: string; userIds: string[] }) => acc + curr.userIds.length,
        0
      );
      toast.success(`AI Distributed ${totalAssigned} members optimally`);
    } catch (_err) {
      toast.error('Smart Distribution failed partially');
    } finally {
      setIsDistributing(false);
    }
  };

  const handleBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    masterBroadcast(broadcastMessage.trim());
    setBroadcastMessage('');
    setTimeout(() => setIsBroadcasting(false), 2000);
  };

  const handleScenarioChange = (scenario: GlobalScenario) => {
    setGlobalScenario(scenario);
    // Emit SYSTEM_ALERT to Command Feed
    roomEventBus.emit('SYSTEM_ALERT', {
      level: 'info',
      title: `Global Scenario: ${scenario}`,
      description: `Organization state transitioned to ${scenario} mode. Applying global policies.`,
      timestamp: Date.now(),
    });

    // In a real implementation, we'd fire batch updates to all live rooms here.
    toast.success(`Transitioned to ${scenario} Scenario`);
  };

  const executeCommand = async () => {
    const cmd = paletteCommand.toLowerCase().trim();
    if (!cmd) return;

    if (cmd.includes('shuffle') || cmd.includes('distribute')) {
      handleSmartDistribute();
    } else if (cmd.includes('emergency')) {
      handleScenarioChange('EMERGENCY');
    } else if (cmd.includes('create room')) {
      setIsCreatingRoom(true);
    } else if (cmd.includes('reset') || cmd.includes('lobby')) {
      // Mass return to lobby
      try {
        const assignedMembers = orgMembers.filter((m) => m.assignedBreakoutId);
        await Promise.all(
          assignedMembers.map((m) => removeParticipantToLobby(m.assignedBreakoutId!, m.user_id))
        );
        toast.success(`Recalled ${assignedMembers.length} members to Lobby`);
      } catch (_err) {
        toast.error('Reset failed partially');
      }
    } else if (cmd.includes('map')) {
      setShowNeuralMap(true);
      setActiveTab('rooms');
    } else {
      toast.error('Unknown command. Try "/shuffle", "/reset", or "/map"');
    }

    setPaletteCommand('');
    setIsPaletteOpen(false);
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleBulkMove = async (roomId: string) => {
    if (selectedMemberIds.size === 0) return;
    try {
      const userIds = Array.from(selectedMemberIds);
      await batchAssignParticipants(roomId, userIds);
      setSelectedMemberIds(new Set());
      setShowBulkMoveMenu(false);
    } catch (_err) {
      toast.error('Bulk move failed');
    }
  };

  const handleBulkReturnToLobby = async () => {
    if (selectedMemberIds.size === 0) return;
    try {
      const userIds = Array.from(selectedMemberIds);
      // Loop through and remove each. The service doesn't have a batch remove
      // but we can parallelize.
      await Promise.all(
        userIds.map(async (uid) => {
          const member = orgMembers.find((m) => m.user_id === uid);
          if (member?.assignedBreakoutId) {
            await removeParticipantToLobby(member.assignedBreakoutId, uid);
          }
        })
      );
      toast.success(`Returned ${userIds.length} members to lobby`);
      setSelectedMemberIds(new Set());
    } catch (_err) {
      toast.error('Bulk return failed');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 overflow-hidden'
      >
        {/* Backdrop */}
        <div className='absolute inset-0 bg-black/80 backdrop-blur-md' onClick={onClose} />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          className='relative w-full max-w-5xl h-[85vh] bg-[#0c0f14] border border-white/5 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden'
        >
          {/* Header */}
          <div className='flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]'>
            <div className='flex items-center gap-4'>
              <div className='p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20'>
                <Building2 className='w-6 h-6 text-indigo-400' />
              </div>
              <div>
                <h2 className='text-xl font-black uppercase tracking-tight text-white flex items-center gap-2'>
                  Dispatch Center
                  <span className='px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400'>
                    Super Host
                  </span>
                </h2>
                <p className='text-[10px] text-white/40 uppercase font-bold tracking-[0.2em]'>
                  Manage Organization Breakouts & Participants as Super Host
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <button
                onClick={() => setIsFeedOpen(true)}
                className='p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/10'
                title='Open Command Feed'
              >
                <MessageSquareText className='w-5 h-5' />
              </button>
              <div className='relative group'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors' />
                <Input
                  placeholder='Search rooms or members...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-64 h-10 pl-10 bg-white/5 border-white/10 rounded-xl text-xs placeholder:text-white/20 focus:border-indigo-500/50'
                />
              </div>
              <button
                onClick={onClose}
                className='p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/10'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
          </div>

          <div className='flex flex-1 overflow-hidden'>
            {/* Sidebar Tabs */}
            <div className='w-64 border-r border-white/5 bg-black/20 p-4 space-y-2 shrink-0 overflow-y-auto no-scrollbar'>
              <button
                onClick={() => setActiveTab('rooms')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  activeTab === 'rooms'
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.1)]'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutGrid className='w-4 h-4' />
                <span className='text-[11px] font-black uppercase tracking-widest'>
                  Rooms ({breakouts.length})
                </span>
              </button>
              <button
                onClick={() => setShowNeuralMap(!showNeuralMap)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  showNeuralMap
                    ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Network className='w-4 h-4' />
                <span className='text-[11px] font-black uppercase tracking-widest'>Neural Map</span>
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  activeTab === 'members'
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.1)]'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className='w-4 h-4' />
                <span className='text-[11px] font-black uppercase tracking-widest'>
                  Members ({orgMembers.length})
                </span>
              </button>

              {/* AI Auto-Assign Button */}
              <button
                onClick={() => setShowAIAutoAssign(!showAIAutoAssign)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                  showAIAutoAssign
                    ? 'bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bot className='w-4 h-4' />
                <span className='text-[11px] font-black uppercase tracking-widest'>
                  AI Auto-Assign
                </span>
                {lobbyUsers.length > 0 && (
                  <span className='ml-auto text-[9px] font-black bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/30'>
                    {lobbyUsers.length}
                  </span>
                )}
              </button>

              <div className='pt-6 px-2'>
                <h3 className='text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-4 px-2'>
                  Live Intelligence
                </h3>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between bg-white/[0.02] rounded-xl px-3 py-2 border border-white/5'>
                    <div className='flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse' />
                      <span className='text-[9px] font-bold text-white/30 uppercase tracking-widest'>
                        Live Rooms
                      </span>
                    </div>
                    <span className='text-[11px] font-black text-indigo-400'>
                      {breakouts.filter((b) => b.status === 'LIVE').length}
                    </span>
                  </div>
                  <div className='flex items-center justify-between bg-white/[0.02] rounded-xl px-3 py-2 border border-white/5'>
                    <div className='flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                      <span className='text-[9px] font-bold text-white/30 uppercase tracking-widest'>
                        In Lobby
                      </span>
                    </div>
                    <span className='text-[11px] font-black text-emerald-400'>
                      {lobbyUsers.length}
                    </span>
                  </div>
                  <div className='flex items-center justify-between bg-white/[0.02] rounded-xl px-3 py-2 border border-white/5'>
                    <div className='flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 rounded-full bg-purple-500' />
                      <span className='text-[9px] font-bold text-white/30 uppercase tracking-widest'>
                        Sub-Rooms
                      </span>
                    </div>
                    <span className='text-[11px] font-black text-purple-400'>
                      {breakouts.reduce((acc, b) => acc + (b.child_rooms?.length || 0), 0)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between bg-white/[0.02] rounded-xl px-3 py-2 border border-white/5'>
                    <div className='flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 rounded-full bg-amber-500' />
                      <span className='text-[9px] font-bold text-white/30 uppercase tracking-widest'>
                        Assigned
                      </span>
                    </div>
                    <span className='text-[11px] font-black text-amber-400'>
                      {orgMembers.filter((m) => m.assignedBreakoutId).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto p-8 no-scrollbar bg-black/10'>
              {/* AI Suggestions Bar */}
              <LiveAISuggestions />

              {/* ── AI Auto-Assign Panel ─────────────────────────────── */}
              <AnimatePresence>
                {showAIAutoAssign && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className='overflow-hidden mb-8'
                  >
                    <div className='p-6 rounded-[2rem] bg-cyan-500/[0.04] border border-cyan-500/20 relative overflow-hidden'>
                      {/* Animated background glow */}
                      <div className='absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5 pointer-events-none' />

                      <div className='relative z-10'>
                        <div className='flex items-center justify-between mb-4'>
                          <div className='flex items-center gap-3'>
                            <div className='p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20'>
                              <Bot className='w-4 h-4 text-cyan-400' />
                            </div>
                            <div>
                              <h4 className='text-[11px] font-black uppercase tracking-widest text-cyan-400'>
                                AI Auto-Assign to Rooms
                              </h4>
                              <p className='text-[9px] text-white/30 font-medium'>
                                AI distributes lobby participants into live rooms with exception
                                controls
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowAIAutoAssign(false)}
                            className='p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white'
                          >
                            <X className='w-3.5 h-3.5' />
                          </button>
                        </div>

                        {/* Target Room Selector */}
                        <div className='mb-4'>
                          <label className='text-[9px] font-black text-white/30 uppercase tracking-widest mb-2 block'>
                            Target Rooms
                          </label>
                          <div className='flex flex-wrap gap-2'>
                            <button
                              onClick={() => setAIAssignTargetRoom('auto')}
                              className={`h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                aiAssignTargetRoom === 'auto'
                                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                                  : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20'
                              }`}
                            >
                              <Sparkles className='w-2.5 h-2.5 inline mr-1' />
                              All Auto
                            </button>
                            {breakouts
                              .flatMap((b) => {
                                const rooms = [];
                                if (b.status === 'LIVE')
                                  rooms.push({ id: b.id, name: b.name, isParent: true });
                                if (b.child_rooms) {
                                  rooms.push(
                                    ...b.child_rooms
                                      .filter((c) => c.status === 'LIVE')
                                      .map((c) => ({
                                        id: c.id,
                                        name: `${b.name} > ${c.name}`,
                                        isParent: false,
                                      }))
                                  );
                                }
                                return rooms;
                              })
                              .map((room) => (
                                <button
                                  key={room.id}
                                  onClick={() => setAIAssignTargetRoom(room.id)}
                                  className={`h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                    aiAssignTargetRoom === room.id
                                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                                      : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20'
                                  }`}
                                  title={room.name}
                                >
                                  {room.isParent ? (
                                    <LayoutGrid className='w-2.5 h-2.5 inline mr-1' />
                                  ) : (
                                    <ChevronRight className='w-2.5 h-2.5 inline' />
                                  )}
                                  {room.isParent ? room.name : room.name.split('>').pop()?.trim()}
                                </button>
                              ))}
                            {breakouts.flatMap((b) =>
                              b.status === 'LIVE'
                                ? [b]
                                : b.child_rooms?.filter((c) => c.status === 'LIVE') || []
                            ).length === 0 && (
                              <span className='text-[9px] text-amber-400/70 font-medium italic'>
                                No LIVE rooms found. Start some breakouts first.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Exceptions List */}
                        <div className='mb-5'>
                          <div className='flex items-center justify-between mb-2'>
                            <label className='text-[9px] font-black text-white/30 uppercase tracking-widest'>
                              Exceptions
                              <span className='text-white/20 ml-1 normal-case font-medium'>
                                (these members will NOT be moved)
                              </span>
                            </label>
                            {aiAssignExceptions.size > 0 && (
                              <button
                                onClick={() => setAIAssignExceptions(new Set())}
                                className='text-[8px] text-red-400/60 hover:text-red-400 font-black uppercase'
                              >
                                Clear All
                              </button>
                            )}
                          </div>
                          <div className='grid grid-cols-2 gap-2 max-h-40 overflow-y-auto no-scrollbar pr-1'>
                            {lobbyUsers.map((u) => {
                              const isExcepted = aiAssignExceptions.has(u.user_id);
                              return (
                                <button
                                  key={u.user_id}
                                  onClick={() => {
                                    setAIAssignExceptions((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(u.user_id)) next.delete(u.user_id);
                                      else next.add(u.user_id);
                                      return next;
                                    });
                                  }}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${
                                    isExcepted
                                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                      : 'bg-white/[0.03] border-white/5 text-white/60 hover:border-white/15'
                                  }`}
                                >
                                  {isExcepted ? (
                                    <Square className='w-3 h-3 shrink-0' />
                                  ) : (
                                    <CheckSquare className='w-3 h-3 shrink-0 text-cyan-400' />
                                  )}
                                  <UserAvatar
                                    avatarUrl={u.avatar_url}
                                    name={u.display_name}
                                    className='w-5 h-5 shrink-0'
                                  />
                                  <span className='text-[9px] font-bold truncate'>
                                    {u.display_name}
                                  </span>
                                  {isExcepted && (
                                    <span className='text-[8px] text-red-400/70 ml-auto'>
                                      Excepted
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            {lobbyUsers.length === 0 && (
                              <div className='col-span-2 py-4 text-center text-[9px] text-white/20 italic'>
                                No users currently in lobby
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Summary & Action */}
                        <div className='flex items-center justify-between pt-4 border-t border-white/5'>
                          <div className='text-[9px] text-white/40'>
                            <span className='text-cyan-400 font-black'>
                              {lobbyUsers.length - aiAssignExceptions.size}
                            </span>{' '}
                            will be assigned ·{' '}
                            <span className='text-red-400/70 font-bold'>
                              {aiAssignExceptions.size}
                            </span>{' '}
                            excepted
                          </div>
                          <button
                            onClick={handleAIAutoAssignToRooms}
                            disabled={
                              isAIAssigning || lobbyUsers.length === aiAssignExceptions.size
                            }
                            className='h-9 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20'
                          >
                            {isAIAssigning ? (
                              <>
                                <RefreshCw className='w-3 h-3 animate-spin' /> Analyzing...
                              </>
                            ) : (
                              <>
                                <Bot className='w-3 h-3' /> AI Smart Distribute
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {showNeuralMap && activeTab === 'rooms' && (
                <div className='mb-8 p-8 rounded-[3rem] bg-indigo-500/[0.02] border border-white/5 relative overflow-hidden'>
                  <div className='absolute top-4 left-6 z-10'>
                    <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/60 mb-1'>
                      Neural Connection Topology
                    </h3>
                    <p className='text-[8px] font-medium text-white/20 uppercase'>
                      Real-time room activity & participant weighting
                    </p>
                  </div>
                  <NeuralMap
                    rooms={breakouts}
                    onRoomClick={(id: string) => navigate(`/room/${id}`)}
                  />
                </div>
              )}

              {/* Global Controls Section */}
              <div className='mb-8'>
                <button
                  onClick={() => setShowGlobalCommands(!showGlobalCommands)}
                  className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-indigo-400 transition-colors mb-4 group'
                >
                  <Shield className='w-3 h-3 group-hover:scale-110 transition-transform' />
                  Global Command & Operations {showGlobalCommands ? '−' : '+'}
                </button>

                <AnimatePresence>
                  {showGlobalCommands && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className='overflow-hidden'
                    >
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-[2rem] bg-indigo-500/[0.03] border border-indigo-500/10 mb-8'>
                        {/* Broadcast Box */}
                        <div className='space-y-3'>
                          <label className='text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2'>
                            <Play className='w-2.5 h-2.5 rotate-[-90deg] text-indigo-500' /> Master
                            Broadcast
                          </label>
                          <div className='flex gap-2'>
                            <Input
                              placeholder='Message to all rooms...'
                              value={broadcastMessage}
                              onChange={(e) => setBroadcastMessage(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                              className='h-9 bg-white/5 border-white/10 text-xs rounded-xl'
                            />
                            <button
                              onClick={handleBroadcast}
                              disabled={isBroadcasting || !broadcastMessage.trim()}
                              className='h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20'
                            >
                              {isBroadcasting ? 'SENT' : 'SEND'}
                            </button>
                          </div>
                        </div>

                        {/* Mode & AI Box */}
                        <div className='space-y-3'>
                          <label className='text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2'>
                            <Lock className='w-2.5 h-2.5 text-indigo-500' /> AI & Org Security
                          </label>
                          <div className='flex gap-2'>
                            <button
                              onClick={() => (aiEnabled ? killAI() : enableAI())}
                              className={`flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                                aiEnabled
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : 'bg-white/5 border-white/10 text-white/40'
                              }`}
                            >
                              AI: {aiEnabled ? 'ON' : 'OFF'}
                            </button>
                            <select
                              value={orgMode}
                              onChange={(e) => switchOrgMode(e.target.value as OrgMode)}
                              className='flex-1 h-9 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-indigo-400 px-2 focus:outline-none focus:border-indigo-500/50'
                            >
                              <option value='FUN' className='bg-[#0c0f14]'>
                                FUN
                              </option>
                              <option value='PROF' className='bg-[#0c0f14]'>
                                PROF
                              </option>
                              <option value='ULTRA_SECURE' className='bg-[#0c0f14]'>
                                ULTRA
                              </option>
                              <option value='MIXED' className='bg-[#0c0f14]'>
                                MIXED
                              </option>
                            </select>
                          </div>

                          {/* V2 Scenario Selector */}
                          <div className='flex flex-col gap-1.5 pt-1'>
                            <label className='text-[8px] font-black text-white/20 uppercase tracking-[0.2em] px-1'>
                              Global Scenario
                            </label>
                            <div className='grid grid-cols-2 gap-2'>
                              {(
                                [
                                  'NORMAL',
                                  'CONFERENCE',
                                  'WORKSHOP',
                                  'DEBATE',
                                  'EMERGENCY',
                                ] as GlobalScenario[]
                              ).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleScenarioChange(s)}
                                  className={`h-7 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                    globalScenario === s
                                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                      : 'bg-white/5 border-white/10 text-white/20 hover:text-white/40'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Operations Box */}
                        <div className='space-y-3'>
                          <label className='text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2'>
                            <ArrowRightLeft className='w-2.5 h-2.5 text-indigo-500' /> Quick
                            Operations
                          </label>
                          <button
                            onClick={handleSmartDistribute}
                            disabled={isDistributing}
                            className={`w-full h-9 rounded-xl border ${
                              isDistributing
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
                                : 'bg-white/5 border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/10 text-white/60 hover:text-white'
                            } text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                          >
                            <LayoutGrid
                              className={`w-3 h-3 ${isDistributing ? 'animate-pulse' : ''}`}
                            />
                            {isDistributing ? 'Analyzing Skills...' : 'AI Smart Distribute'}
                          </button>
                          {/* Mock Event Emitter for Demo Purposes */}
                          <button
                            onClick={() => {
                              roomEventBus.emit('CHAT_MESSAGE', {
                                breakoutId: breakouts[0]?.id || 'room_123',
                                userId: user?.id || 'sys_1',
                                text: 'I am stuck and need help with the terminal',
                                timestamp: Date.now(),
                              });
                            }}
                            className='h-9 px-4 rounded-xl border border-dashed border-yellow-500/30 text-yellow-500/50 hover:text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50 text-[9px] font-black uppercase tracking-widest transition-all mt-2 w-full flex items-center justify-center'
                          >
                            <Zap className='w-3 h-3 mr-2' />
                            Mock AI Distress Keyword
                          </button>

                          <button
                            onClick={() => {
                              roomEventBus.emit('EMOTIONAL_SPIKE', {
                                breakoutId: breakouts[0]?.id || 'room_123',
                                intensity: 'HIGH',
                                primarySentiment: 'Aggressive/Distressed',
                                triggeringUserIds: [user?.id || 'user_1'],
                                timestamp: Date.now(),
                              });
                            }}
                            className='h-9 px-4 rounded-xl border border-dashed border-orange-500/30 text-orange-500/50 hover:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 text-[9px] font-black uppercase tracking-widest transition-all mt-2 w-full flex items-center justify-center font-black'
                          >
                            <Activity className='w-3 h-3 mr-2' />
                            Mock Emotional Spike
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {activeTab === 'rooms' ? (
                <div className='flex flex-col gap-6'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-[10px] font-black uppercase tracking-widest text-white/40'>
                      Sessions
                    </h3>
                    <button
                      onClick={() => setIsCreatingRoom(true)}
                      className='h-8 px-4 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10'
                    >
                      <Plus className='w-3 h-3' />
                      New Room
                    </button>
                  </div>

                  {isCreatingRoom && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='bg-white/[0.03] border border-indigo-500/20 rounded-2xl p-4 flex flex-col gap-3'
                    >
                      <div className='flex gap-3 items-center'>
                        <div className='flex-1 relative'>
                          <Input
                            placeholder='Room name (e.g. Workshop A)...'
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                            autoFocus
                            className='h-10 bg-white/5 border-white/10 rounded-xl text-xs'
                          />
                        </div>
                        <div className='w-24 relative'>
                          <Input
                            type='number'
                            min={1}
                            max={100}
                            placeholder='Cap'
                            value={newRoomMaxParticipants}
                            onChange={(e) =>
                              setNewRoomMaxParticipants(parseInt(e.target.value) || 20)
                            }
                            className='h-10 bg-white/5 border-white/10 rounded-xl text-[10px] font-black text-center'
                          />
                        </div>
                        <button
                          onClick={handleCreateRoom}
                          disabled={!newRoomName.trim() || createLoading}
                          className='h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-all'
                        >
                          {createLoading ? '...' : 'Create'}
                        </button>
                        <button
                          onClick={() => setIsCreatingRoom(false)}
                          className='h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>

                      <p className='text-[8px] text-white/20 uppercase font-black tracking-widest px-1'>
                        Advanced settings (Default: General Hub, Standard Security)
                      </p>

                      {/* Simple room creation - defaults handled by state */}
                    </motion.div>
                  )}

                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                    {/* Main Room (Lobby) Card */}
                    {(!searchQuery ||
                      'main room'.includes(searchQuery.toLowerCase()) ||
                      'lobby'.includes(searchQuery.toLowerCase())) && (
                      <div className='bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-6 hover:border-indigo-500/30 transition-all flex flex-col gap-6 group relative overflow-hidden'>
                        <div className='flex items-start justify-between relative z-10'>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 mb-2'>
                              <Home className='w-3.5 h-3.5 text-indigo-400' />
                              <h4 className='text-white font-black text-sm uppercase tracking-tight truncate'>
                                Main Room (Lobby)
                              </h4>
                            </div>
                            <div className='flex items-center gap-2'>
                              <span className='px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border text-emerald-400 bg-emerald-400/10 border-emerald-400/20'>
                                <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5' />
                                ACTIVE
                              </span>
                              <span className='px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border bg-white/5 text-white/40 border-white/10'>
                                PERSISTENT
                              </span>
                            </div>
                          </div>

                          <div className='flex items-center gap-2'>
                            {currentUserLocation === 'LOBBY' ? (
                              <div className='h-8 px-4 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-default'>
                                <Home className='w-3 h-3' /> IN MAIN ROOM
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  navigate(`/room/${currentOrganization?.id}`);
                                  onClose();
                                }}
                                className='h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20'
                              >
                                ENTER <ChevronRight className='w-3 h-3' />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className='space-y-4 relative z-10'>
                          <div className='flex items-center justify-between px-1'>
                            <div className='flex items-center gap-2'>
                              <Users className='w-3.5 h-3.5 text-white/20' />
                              <span className='text-[10px] font-black text-white/40 uppercase tracking-widest'>
                                Participants:{' '}
                                <span className='text-white'>{lobbyUsers.length}</span>
                              </span>
                            </div>
                          </div>

                          <div className='flex flex-wrap gap-1.5 min-h-[32px]'>
                            {lobbyUsers.slice(0, 10).map((u) => (
                              <UserAvatar
                                key={u.user_id}
                                avatarUrl={u.avatar_url}
                                name={u.display_name}
                                className='w-6 h-6 border-2 border-[#0c0f14]'
                              />
                            ))}
                            {lobbyUsers.length > 10 && (
                              <div className='w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-bold'>
                                +{lobbyUsers.length - 10}
                              </div>
                            )}
                            {lobbyUsers.length === 0 && (
                              <span className='text-[9px] text-white/10 italic font-medium uppercase tracking-widest'>
                                Lobby is currently empty
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {filteredBreakouts.map((breakout) => (
                      <RoomCard
                        key={breakout.id}
                        breakout={breakout}
                        onAssignHost={(userId) => handleSetHost(userId, breakout.id)}
                        onAssignParticipant={(userId) => handleAssignToRoom(userId, breakout.id)}
                        onStart={() => startBreakout(breakout.id)}
                        onClose={() => closeBreakout(breakout.id)}
                        onEnter={() => handleEnterRoom(breakout)}
                        onGhostObserve={() => handleGhostObserve(breakout.id)}
                        onPause={() => pauseBreakout(breakout.id)}
                        onResume={() => resumeBreakout(breakout.id)}
                        onViewHistory={() =>
                          setHistoryRoom({ id: breakout.id, name: breakout.name })
                        }
                        onCreateChild={(name) => createChildRoom(breakout.id, name)}
                        onDelete={() => deleteBreakout(breakout.id)}
                        onDeleteChild={(childId) => deleteBreakout(childId)}
                        members={orgMembers}
                        currentUserLocation={currentUserLocation}
                      />
                    ))}
                    {filteredBreakouts.length === 0 && !isCreatingRoom && (
                      <div className='col-span-full py-20 flex flex-col items-center justify-center text-white/20 gap-4'>
                        <LayoutGrid className='w-12 h-12 opacity-20' />
                        <div className='text-center'>
                          <p className='text-[10px] font-black uppercase tracking-widest italic mb-4'>
                            No matching rooms found
                          </p>
                          <button
                            onClick={() => setIsCreatingRoom(true)}
                            className='h-9 px-6 rounded-xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all'
                          >
                            Create your first room
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='text-[10px] font-black uppercase tracking-widest text-white/40'>
                      Organization Roster
                    </h3>
                    {selectedMemberIds.size > 0 && (
                      <div className='flex items-center gap-3 animate-in fade-in slide-in-from-right-4'>
                        <span className='text-[10px] font-black text-indigo-400 uppercase tracking-widest'>
                          {selectedMemberIds.size} SELECTED
                        </span>
                        <div className='h-4 w-px bg-white/10' />
                        <div className='relative'>
                          <button
                            onClick={() => setShowBulkMoveMenu(!showBulkMoveMenu)}
                            className='h-8 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition-all'
                          >
                            Move Selected
                          </button>

                          <AnimatePresence>
                            {showBulkMoveMenu && (
                              <>
                                <div
                                  className='fixed inset-0 z-10'
                                  onClick={() => setShowBulkMoveMenu(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className='absolute right-0 top-full mt-2 w-48 bg-[#151921] border border-white/10 rounded-xl shadow-2xl z-20 py-1 overflow-hidden'
                                >
                                  <p className='px-3 py-1.5 text-[8px] font-black text-white/20 uppercase border-b border-white/5'>
                                    Target Room
                                  </p>
                                  <div className='max-h-48 overflow-y-auto no-scrollbar'>
                                    <button
                                      onClick={handleBulkReturnToLobby}
                                      className='w-full text-left px-3 py-2 text-[10px] font-black text-emerald-400 hover:bg-emerald-400/10 flex items-center justify-between'
                                    >
                                      Main Lobby <Home className='w-3 h-3' />
                                    </button>
                                    {breakouts
                                      .filter((b) => b.status === 'LIVE')
                                      .map((b) => (
                                        <button
                                          key={b.id}
                                          onClick={() => handleBulkMove(b.id)}
                                          className='w-full text-left px-3 py-2 text-[10px] font-bold text-white/60 hover:text-white hover:bg-indigo-600/20 flex items-center justify-between'
                                        >
                                          {b.name}{' '}
                                          <ChevronRight className='w-3 h-3 text-white/20' />
                                        </button>
                                      ))}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        <button
                          onClick={() => setSelectedMemberIds(new Set())}
                          className='text-[9px] font-black text-white/20 hover:text-white uppercase tracking-widest'
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {filteredMembers.map((member) => (
                      <MemberCard
                        key={member.user_id}
                        member={member}
                        breakouts={breakouts}
                        onAssignToRoom={(roomId) => handleAssignToRoom(member.user_id, roomId)}
                        onRemoveFromRoom={(roomId) =>
                          removeParticipantToLobby(roomId, member.user_id)
                        }
                        isCurrentUser={member.user_id === user?.id}
                        isSelected={selectedMemberIds.has(member.user_id)}
                        onToggleSelect={() => toggleMemberSelection(member.user_id)}
                      />
                    ))}
                    {filteredMembers.length === 0 && (
                      <div className='col-span-full py-20 flex flex-col items-center justify-center text-white/20 gap-4'>
                        <Users className='w-12 h-12 opacity-20' />
                        <p className='text-[10px] font-black uppercase tracking-widest italic'>
                          No matching members found
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* The Command Feed Overlay */}
              <CommandFeed isOpen={isFeedOpen} onClose={() => setIsFeedOpen(false)} />
            </div>
          </div>

          <HistoryModal
            isOpen={!!historyRoom}
            onClose={() => setHistoryRoom(null)}
            breakoutId={historyRoom?.id || ''}
            roomName={historyRoom?.name || ''}
          />

          {/* AI Command Palette (CMD+K) */}
          <AnimatePresence>
            {isPaletteOpen && (
              <div className='fixed inset-0 z-[2000] flex items-start justify-center pt-[15vh] px-4'>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className='absolute inset-0 bg-black/60 backdrop-blur-sm'
                  onClick={() => setIsPaletteOpen(false)}
                />
                <motion.div
                  initial={{ scale: 0.9, y: -20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: -20, opacity: 0 }}
                  className='relative w-full max-w-xl bg-[#151921] border border-white/10 rounded-2xl shadow-2xl overflow-hidden'
                >
                  <div className='flex items-center px-4 py-3 border-b border-white/5 gap-3'>
                    <Command className='w-5 h-5 text-indigo-400' />
                    <input
                      autoFocus
                      placeholder='Type a command (e.g. /shuffle, /emergency)...'
                      className='flex-1 bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-white/20'
                      value={paletteCommand}
                      onChange={(e) => setPaletteCommand(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                    />
                    <kbd className='px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/40 font-mono'>
                      ENTER
                    </kbd>
                  </div>
                  <div className='p-2 space-y-1'>
                    <p className='px-3 py-1 text-[9px] font-black text-white/20 uppercase tracking-widest'>
                      Suggestions
                    </p>
                    {[
                      { label: 'Smart Distribution', icon: LayoutGrid, cmd: '/shuffle' },
                      { label: 'Emergency Mode', icon: AlertTriangle, cmd: '/emergency' },
                      { label: 'Create Secure Room', icon: Lock, cmd: '/create secure' },
                      { label: 'Return All to Lobby', icon: Home, cmd: '/reset' },
                    ].map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => {
                          setPaletteCommand(item.cmd);
                          // Handle immediate execute or wait for enter?
                          // Let's just set the text for now in this demo.
                        }}
                        className='w-full flex items-center justify-between px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs'
                      >
                        <div className='flex items-center gap-3'>
                          <item.icon className='w-4 h-4 text-white/20' />
                          {item.label}
                        </div>
                        <span className='text-[10px] text-white/20 font-mono'>{item.cmd}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const RoomCard = ({
  breakout,
  onAssignHost,
  onAssignParticipant,
  onStart,
  onClose,
  onEnter,
  onGhostObserve,
  onPause,
  onResume,
  onCreateChild,
  onViewHistory,
  onDelete,
  onDeleteChild,
  members,
  currentUserLocation,
}: {
  breakout: BreakoutSession;
  onAssignHost: (uid: string) => void;
  onAssignParticipant: (uid: string) => void;
  onStart: () => void;
  onClose: () => void;
  onEnter: () => void;
  onGhostObserve: () => void;
  onPause: () => void;
  onResume: () => void;
  onCreateChild: (name: string) => void;
  onViewHistory: () => void;
  onDelete: () => void;
  onDeleteChild: (childId: string) => void;
  members: OrgMember[];
  currentUserLocation: string | null | undefined;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showChildInput, setShowChildInput] = useState(false);
  const [childName, setChildName] = useState('');
  const [assignRole, setAssignRole] = useState<'host' | 'participant'>('participant');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteChildConfirm, setShowDeleteChildConfirm] = useState<string | null>(null);

  const statusColors = {
    CREATED: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    LIVE: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    PAUSED: 'text-red-400 bg-red-400/10 border-red-400/20',
    CLOSED: 'text-white/20 bg-white/5 border-white/10',
  };

  const currentHost = members.find((m) => m.user_id === breakout.host_id);
  const unassignedMembers = members.filter((m) => !m.assignedBreakoutId);

  const { currentOrganization } = useOrganization();
  const orgMode = currentOrganization?.mode || 'FUN';
  const effectiveMode = ModePolicyResolver.resolveEffectiveMode({ mode: orgMode }, breakout);
  const badge = ModePolicyResolver.getBadge(effectiveMode);

  return (
    <div className='bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all flex flex-col gap-6 group relative overflow-hidden'>
      {/* Glow Effect */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none ${
          effectiveMode === 'ULTRA_SECURE'
            ? 'bg-red-500'
            : effectiveMode === 'PROF'
              ? 'bg-blue-500'
              : 'bg-emerald-500'
        }`}
      />

      <div className='flex items-start justify-between relative z-10'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-2'>
            <Lock className='w-3.5 h-3.5 text-indigo-400' />
            <h4 className='text-white font-black text-sm uppercase tracking-tight truncate'>
              {breakout.name}
            </h4>
          </div>
          <div className='flex items-center gap-2 flex-wrap gap-y-1'>
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border whitespace-nowrap min-w-fit ${statusColors[breakout.status]}`}
            >
              {breakout.status === 'LIVE' && (
                <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5' />
              )}
              {breakout.status}
            </span>
            {badge.label !== 'ULTRA SECURE' && (
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border whitespace-nowrap min-w-fit ${badge.color}`}
              >
                {badge.emoji} {badge.label}
              </span>
            )}
          </div>
        </div>
        <div className='flex gap-2 flex-wrap justify-end'>
          {breakout.status === 'LIVE' &&
            (currentUserLocation === breakout.id ? (
              <div className='h-8 px-3 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-default'>
                IN ROOM
              </div>
            ) : (
              <>
                {/* Ghost Observer Button */}
                <button
                  onClick={onGhostObserve}
                  title='Ghost Observe — enter invisibly, not shown in participant grid'
                  className='h-8 px-3 rounded-xl bg-purple-600/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10'
                >
                  <Ghost className='w-3 h-3' />
                  Ghost
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className='p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/20'
                  title='Delete Room'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
                <button
                  onClick={onEnter}
                  className='h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20'
                >
                  JOIN <ChevronRight className='w-3 h-3' />
                </button>
              </>
            ))}
          {breakout.status === 'LIVE' && (
            <button
              onClick={onPause}
              className='h-8 w-8 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 flex items-center justify-center transition-all border border-amber-500/20'
              title='Pause Breakout'
            >
              <div className='w-1.5 h-3 border-x-2 border-current' />
            </button>
          )}
          {breakout.status === 'PAUSED' && (
            <button
              onClick={onResume}
              className='h-8 px-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all'
            >
              <Play className='w-3 h-3' /> Resume
            </button>
          )}
          {breakout.status === 'CREATED' && breakout.host_id && (
            <button
              onClick={onStart}
              className='h-8 px-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all'
            >
              <Play className='w-3 h-3' /> Start
            </button>
          )}
          {/* Consolidated delete action: only use onDelete if provided, remove redundant onClose trash */}
          <button
            onClick={onViewHistory}
            className='h-8 w-8 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-all border border-indigo-500/20'
            title='View Neural History'
          >
            <History className='w-3.5 h-3.5' />
          </button>
        </div>
      </div>

      <div className='space-y-4 relative z-10'>
        {/* Host Assignment */}
        <div className='flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5'>
          <div className='flex items-center gap-3'>
            {currentHost ? (
              <>
                <UserAvatar
                  avatarUrl={currentHost.avatar_url || undefined}
                  name={currentHost.display_name}
                  className='w-8 h-8'
                />
                <div>
                  <p className='text-[10px] font-black text-white/90 uppercase tracking-widest'>
                    {currentHost.display_name}
                  </p>
                  <p className='text-[9px] font-bold text-indigo-400 uppercase tracking-widest'>
                    Primary Host
                  </p>
                </div>
              </>
            ) : (
              <div className='flex items-center gap-3 text-white/20'>
                <div className='w-8 h-8 rounded-full border border-dashed border-white/20 flex items-center justify-center'>
                  <Shield className='w-3.5 h-3.5' />
                </div>
                <span className='text-[10px] font-bold uppercase tracking-widest'>
                  No Host Assigned
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setAssignRole('host');
              setShowAssignMenu(true);
            }}
            className='h-8 px-3 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 transition-all'
          >
            Change
          </button>
        </div>

        {/* Participant Count */}
        <div className='flex items-center justify-between px-1'>
          <div className='flex items-center gap-2'>
            <Users className='w-3.5 h-3.5 text-white/20' />
            <span className='text-[10px] font-black text-white/40 uppercase tracking-widest'>
              Participants:{' '}
              <span className='text-white'>
                {breakout.participants_count || 0} / {breakout.max_participants}
              </span>
            </span>
          </div>
          <button
            onClick={() => {
              setAssignRole('participant');
              setShowAssignMenu(true);
            }}
            className='flex items-center gap-1.5 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors'
          >
            <UserPlus className='w-3 h-3' />
            Assign More
          </button>
        </div>

        {/* Child Rooms Section */}
        <div className='pt-2 border-t border-white/5'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <ChevronRight className='w-3 h-3 text-white/20' />
              <span className='text-[9px] font-black text-white/20 uppercase tracking-widest'>
                Sub-Rooms ({breakout.child_rooms?.length || 0})
              </span>
            </div>
            <button
              onClick={() => setShowChildInput(true)}
              className='text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors'
            >
              + Create
            </button>
          </div>

          {showChildInput && (
            <div className='flex gap-2 mb-3'>
              <Input
                placeholder='Sub-room name...'
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && childName.trim()) {
                    onCreateChild(childName.trim());
                    setChildName('');
                    setShowChildInput(false);
                  }
                }}
                className='h-8 bg-white/5 border-white/10 text-[9px] rounded-lg'
                autoFocus
              />
              <button
                onClick={() => {
                  setShowChildInput(false);
                  setChildName('');
                }}
                className='h-8 w-8 rounded-lg bg-white/5 text-white/40 flex items-center justify-center'
              >
                <X className='w-3 h-3' />
              </button>
            </div>
          )}

          <div className='flex flex-col gap-2'>
            {breakout.child_rooms?.map((child) => (
              <div
                key={child.id}
                className='flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all'
              >
                <div className='flex items-center gap-2'>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${child.status === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`}
                  />
                  <span className='text-[10px] font-bold text-white/60 truncate max-w-[120px]'>
                    {child.name}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-[8px] font-black text-white/20 uppercase'>
                    {child.participants_count || 0} p
                  </span>
                  {child.status === 'LIVE' && (
                    <button
                      onClick={() => {
                        // Navigate to child room as ghost observer
                        window.history.pushState({}, '', `/room/${child.id}?ghost=true`);
                        window.location.href = `/room/${child.id}?ghost=true`;
                      }}
                      title='Ghost Observe sub-room'
                      className='p-1 rounded-lg hover:bg-purple-500/20 text-purple-400/60 hover:text-purple-400 transition-colors'
                    >
                      <Ghost className='w-3 h-3' />
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteChildConfirm(child.id)}
                    className='p-1 rounded-lg hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors'
                    title='Delete Sub-room'
                  >
                    <Trash2 className='w-3 h-3' />
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/room/${child.id}`);
                      onClose();
                    }}
                    className='p-1 rounded-lg hover:bg-indigo-500/20 text-indigo-400 transition-colors'
                  >
                    <ChevronRight className='w-3 h-3' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment Dropdown */}
      <AnimatePresence>
        {showAssignMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className='absolute inset-0 z-20 bg-[#0c0f14]/95 backdrop-blur-md p-6 flex flex-col'
          >
            <div className='flex items-center justify-between mb-4'>
              <h5 className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400'>
                Assign {assignRole === 'host' ? 'New Host' : 'Participant'}
              </h5>
              <button
                onClick={() => setShowAssignMenu(false)}
                className='p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto space-y-2 no-scrollbar pr-1'>
              {unassignedMembers.length === 0 ? (
                <div className='text-center py-8 text-white/20 text-[10px] uppercase font-black'>
                  No available members
                </div>
              ) : (
                unassignedMembers.map((m) => (
                  <button
                    key={m.user_id}
                    onClick={() => {
                      if (assignRole === 'host') onAssignHost(m.user_id);
                      else onAssignParticipant(m.user_id);
                      setShowAssignMenu(false);
                    }}
                    className='w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group/item'
                  >
                    <div className='flex items-center gap-3'>
                      <UserAvatar
                        avatarUrl={m.avatar_url || undefined}
                        name={m.display_name}
                        className='w-6 h-6'
                      />
                      <span className='text-[10px] font-bold text-white/60 group-hover/item:text-white transition-colors'>
                        {m.display_name} {m.user_id === user?.id && '(You)'}
                      </span>
                    </div>
                    <ChevronRight className='w-3.5 h-3.5 text-white/20 group-hover/item:text-indigo-400' />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Confirmation Dialogs */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className='luxury-glass border-white/5 p-8 rounded-[2.5rem] bg-black/90 backdrop-blur-3xl max-w-sm'>
          <AlertDialogHeader className='mb-6'>
            <div className='w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6'>
              <Trash2 className='w-8 h-8 text-red-500' />
            </div>
            <AlertDialogTitle className='text-2xl font-black uppercase tracking-tighter text-red-500 italic'>
              Delete Session?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed'>
              This will permanently destroy <span className='text-white'>{breakout.name}</span>. All
              participants will be immediately ejected to the main room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex-col gap-2'>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className='h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white uppercase font-black text-[9px] tracking-widest'
            >
              Confirm Destruction
            </AlertDialogAction>
            <AlertDialogCancel className='h-12 rounded-xl bg-white/5 border-white/10 text-white/60 hover:text-white uppercase font-black text-[9px] tracking-widest'>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!showDeleteChildConfirm}
        onOpenChange={(open) => !open && setShowDeleteChildConfirm(null)}
      >
        <AlertDialogContent className='luxury-glass border-white/5 p-8 rounded-[2rem] bg-black/90 backdrop-blur-3xl max-w-xs'>
          <AlertDialogHeader className='mb-4 text-center sm:text-left'>
            <AlertDialogTitle className='text-xl font-black uppercase tracking-tighter text-red-500 italic'>
              Delete Sub-room?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-400 text-[9px] font-bold uppercase tracking-widest'>
              Are you sure? This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex-col gap-2 sm:flex-row sm:gap-4'>
            <AlertDialogCancel className='h-10 rounded-lg bg-white/5 border-white/10 text-white/40 uppercase font-black text-[8px] tracking-widest order-2 sm:order-1'>
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showDeleteChildConfirm) {
                  onDeleteChild(showDeleteChildConfirm);
                  setShowDeleteChildConfirm(null);
                }
              }}
              className='h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white uppercase font-black text-[8px] tracking-widest order-1 sm:order-2'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const MemberCard = ({
  member,
  breakouts,
  onAssignToRoom,
  onRemoveFromRoom,
  isCurrentUser,
  isSelected,
  onToggleSelect,
}: {
  member: OrgMember;
  breakouts: BreakoutSession[];
  onAssignToRoom: (rid: string) => void;
  onRemoveFromRoom: (rid: string) => void;
  isCurrentUser?: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const { currentOrganization } = useOrganization();

  // Resolve member's location across parent AND child rooms
  const memberLocation = useMemo(() => {
    const assignedId = member.assignedBreakoutId;
    if (!assignedId) return null;

    // Check parent breakouts first
    const parentMatch = breakouts.find((b) => b.id === assignedId);
    if (parentMatch) return { room: parentMatch, isChild: false, parentName: null };

    // Check child rooms
    for (const b of breakouts) {
      if (b.child_rooms) {
        const childMatch = b.child_rooms.find((c) => c.id === assignedId);
        if (childMatch) return { room: childMatch, isChild: true, parentName: b.name };
      }
    }
    return null;
  }, [member.assignedBreakoutId, breakouts]);

  // memberLocation.room is used for move actions

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      whileDrag={{ scale: 1.05, zIndex: 100, cursor: 'grabbing' }}
      onDragEnd={(_e, info) => {
        // Mock overlap detection: if dragged significantly far, assume move intent
        // In a real implementation we'd check refs of room cards
        if (Math.abs(info.offset.x) > 100 || Math.abs(info.offset.y) > 100) {
          setShowMoveMenu(true);
        }
      }}
      className={`bg-white/[0.03] border rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.05] transition-all relative overflow-hidden ${
        isSelected ? 'border-indigo-500/50 bg-indigo-500/[0.02]' : 'border-white/5'
      }`}
    >
      {isSelected && (
        <div className='absolute top-0 left-0 w-1 h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' />
      )}

      <div className='flex items-center gap-3'>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`w-4 h-4 rounded border transition-all flex items-center justify-center cursor-pointer ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600'
              : 'border-white/10 bg-white/5 hover:border-white/30'
          }`}
        >
          {isSelected && <div className='w-2 h-2 bg-white rounded-sm' />}
        </div>
        <UserAvatar
          avatarUrl={member.avatar_url || undefined}
          name={member.display_name}
          className='w-8 h-8'
        />
        <div>
          <p className='text-[11px] font-black text-white/90 uppercase tracking-tight'>
            {member.display_name}{' '}
            {isCurrentUser && <span className='text-indigo-400 lowercase ml-1'>(you)</span>}
          </p>
          <div className='flex flex-col gap-1'>
            <span
              className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm w-fit ${
                member.user_id === currentOrganization?.owner_id ||
                member.role?.toLowerCase().includes('host') ||
                member.role?.toLowerCase().includes('owner') ||
                member.role?.toLowerCase().includes('admin')
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                  : 'bg-white/5 text-white/40 border border-white/5'
              }`}
            >
              {member.user_id === currentOrganization?.owner_id
                ? 'Superhost'
                : member.role || 'Participant'}
            </span>

            {/* Location Badge */}
            {memberLocation ? (
              memberLocation.isChild ? (
                <span className='text-[9px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1'>
                  <ChevronRight className='w-2.5 h-2.5' />
                  {memberLocation.room.name}
                  <span className='text-[8px] text-white/20 normal-case font-medium'>
                    (sub-room)
                  </span>
                </span>
              ) : (
                <span className='text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1'>
                  <LayoutGrid className='w-2.5 h-2.5' />
                  {memberLocation.room.name}
                </span>
              )
            ) : (
              <span className='text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest flex items-center gap-1'>
                <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                Main Room
              </span>
            )}
          </div>
        </div>
      </div>

      <div className='relative'>
        <button
          onClick={() => setShowMoveMenu(!showMoveMenu)}
          className='p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all'
        >
          <ArrowRightLeft className='w-4 h-4' />
        </button>

        <AnimatePresence>
          {showMoveMenu && (
            <>
              <div className='fixed inset-0 z-10' onClick={() => setShowMoveMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className='absolute right-0 top-full mt-2 w-48 bg-[#151921] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden py-1'
              >
                <p className='px-3 py-1.5 text-[8px] font-black text-white/20 uppercase tracking-[0.2em] border-b border-white/5'>
                  Move to Room
                </p>
                <div className='max-h-48 overflow-y-auto no-scrollbar'>
                  {memberLocation?.room && (
                    <button
                      onClick={async () => {
                        try {
                          await onRemoveFromRoom(memberLocation.room.id);
                          toast.success('Member returned to main room');
                        } catch (_err) {
                          // Error handled in context
                        }
                        setShowMoveMenu(false);
                      }}
                      className='w-full text-left px-3 py-2 text-[10px] font-black text-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center justify-between border-b border-white/5'
                    >
                      Main Room (Lobby)
                      <Home className='w-3 h-3' />
                    </button>
                  )}
                  {breakouts
                    .filter((b) => b.id !== memberLocation?.room?.id)
                    .map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          onAssignToRoom(b.id);
                          setShowMoveMenu(false);
                        }}
                        className='w-full text-left px-3 py-2 text-[10px] font-bold text-white/60 hover:text-white hover:bg-indigo-600/20 transition-colors flex items-center justify-between'
                      >
                        {b.name}
                        <ChevronRight className='w-3 h-3 text-white/20' />
                      </button>
                    ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default DispatchModal;
