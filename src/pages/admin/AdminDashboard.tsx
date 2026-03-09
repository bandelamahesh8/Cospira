import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  LogOut,
  Search,
  RefreshCw,
  Skull,
  Zap,
  History,
  Lock,
  Unlock,
  Terminal,
  AlertTriangle,
  UserCheck,
  Save,
  Network,
  Globe,
  Radio,
  Eye,
  Database,
  BrainCircuit,
  Sliders,
  ArrowUpRight,
  Bug,
  Sparkles,
  Send,
  Clock,
  Monitor,
  ShieldAlert,
  Activity,
  ChevronRight,
  ShieldCheck,
  Play,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BalanceService } from '@/services/BalanceService';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Define strict types for Dashboard data
interface DashboardUser {
  id: string;
  display_name?: string;
  email?: string;
  created_at: string;
  is_enterprise?: boolean;
}

interface DashboardFeedback {
  id: number;
  user_id?: string;
  rating: number;
  comment: string;
  type: 'feature' | 'bug' | 'general';
  created_at: string;
}

interface DashboardRoomUser {
  id: string;
  name: string;
}

interface DashboardRoom {
  id: string;
  name: string;
  userCount: number;
  users?: Record<string, DashboardRoomUser> | DashboardRoomUser[];
  isLocked?: boolean;
  createdAt?: string;
}

interface AdminDataResponse {
  activeRooms: DashboardRoom[];
  users: DashboardUser[];
  feedbacks: DashboardFeedback[];
}

interface CommandActionProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onHold: () => void;
  isActive?: boolean;
  danger?: boolean;
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  risk: 'low' | 'med' | 'high';
  animate?: boolean;
  footer?: React.ReactNode;
}

const CommandAction = ({ title, desc, icon, onHold, isActive, danger }: CommandActionProps) => (
  <div
    className={`p-4 rounded-2xl flex items-center justify-between border transition-all duration-300 relative overflow-hidden group ${isActive ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
  >
    <div className='flex flex-col gap-1 relative z-10'>
      <h4
        className={`text-[10px] font-black uppercase tracking-[0.2em] ${danger ? 'text-red-500' : 'text-white/80'}`}
      >
        {title}
      </h4>
      <p className='text-[9px] text-white/30 font-mono tracking-wider'>{desc}</p>
    </div>
    <Button
      size='sm'
      variant={danger ? 'destructive' : 'secondary'}
      className={`${danger ? 'bg-red-500 hover:bg-red-600 border-transparent shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/5 hover:bg-white/10 border-white/10'} h-10 w-10 p-0 rounded-xl relative z-10 transition-transform active:scale-90`}
      onClick={onHold}
    >
      {icon}
    </Button>
    <div
      className={`absolute inset-0 bg-gradient-to-r ${danger ? 'from-red-500/5 to-transparent' : 'from-indigo-500/5 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity`}
    />
  </div>
);

const StatsCard = ({ title, value, icon, color, footer, animate }: StatsCardProps) => (
  <Card className='bg-black/60 border-white/5 backdrop-blur-xl relative overflow-hidden group hover:border-white/10 transition-all duration-500 h-full'>
    {/* Animated Glow Overlay */}
    <div
      className={`absolute -top-24 -right-24 w-48 h-48 bg-${color}-500/5 blur-[100px] rounded-full group-hover:opacity-100 transition-opacity opacity-50`}
    />

    <CardContent className='p-6'>
      <div className='flex justify-between items-start mb-6'>
        <div
          className={`p-3 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-400 shadow-[0_0_20px_rgba(0,0,0,0.2)]`}
        >
          {icon}
        </div>
        {animate && (
          <div className='flex items-center gap-1.5'>
            <span className='text-[9px] font-bold text-white/20 uppercase tracking-widest'>
              Live Flow
            </span>
            <span
              className={`flex h-1.5 w-1.5 rounded-full bg-${color}-500 animate-pulse shadow-[0_0_10px_currentColor]`}
            />
          </div>
        )}
      </div>

      <div className='space-y-1'>
        <h3 className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30'>{title}</h3>
        <div className='flex items-baseline gap-2'>
          <div className='text-3xl font-black text-white tracking-tighter tabular-nums'>
            {value.toLocaleString()}
          </div>
          {/* Fake Trend */}
          <div className={`flex items-center gap-0.5 text-[10px] font-bold text-emerald-400`}>
            <ArrowUpRight className='w-3 h-3' />
            {Math.floor(Math.random() * 15) + 2}%
          </div>
        </div>
      </div>

      {footer && <div className='mt-6 pt-6 border-t border-white/5 relative z-10'>{footer}</div>}
    </CardContent>
  </Card>
);

const NeuralMap = ({ rooms }: { rooms: DashboardRoom[] }) => {
  return (
    <div className='relative w-full h-[400px] bg-black/40 rounded-3xl border border-white/5 overflow-hidden group'>
      {/* Grid Background */}
      <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]' />
      <div className='absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-red-500/5' />

      {/* Scanning Line */}
      <div className='absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent shadow-[0_0_15px_#ef4444] animate-[scan_6s_linear_infinite] pointer-events-none' />

      <div className='absolute inset-0 p-8 flex flex-wrap gap-6 items-center justify-center'>
        {rooms.length === 0 ? (
          <div className='text-center space-y-4'>
            <BrainCircuit className='w-12 h-12 text-white/10 mx-auto animate-pulse' />
            <p className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20'>
              No Neural Nodes Active
            </p>
          </div>
        ) : (
          rooms.map((room, idx) => (
            <motion.div
              key={room.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.1, y: -5 }}
              className='relative'
            >
              <div className='w-16 h-16 rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center group/node cursor-pointer hover:border-red-500/50 transition-all shadow-2xl relative'>
                <Radio
                  className={`w-6 h-6 ${room.userCount > 0 ? 'text-red-500 animate-pulse' : 'text-white/20'}`}
                />
                <div className='absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover/node:opacity-100 transition-opacity z-20 pointer-events-none'>
                  <span className='text-[9px] font-black uppercase text-white bg-red-600 px-2 py-0.5 rounded shadow-lg'>
                    {room.name}
                  </span>
                </div>
                <div className='absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 border-2 border-black flex items-center justify-center text-[9px] font-black'>
                  {room.userCount}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className='absolute bottom-6 left-6 flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <div className='w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]' />
          <span className='text-[9px] font-black uppercase tracking-widest text-white/40'>
            Active Node
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-2 h-2 rounded-full border border-white/20' />
          <span className='text-[9px] font-black uppercase tracking-widest text-white/40'>
            Idle Node
          </span>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { socket } = useWebSocket();
  const [activeRooms, setActiveRooms] = useState<DashboardRoom[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [feedbacks, setFeedbacks] = useState<DashboardFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isSystemLocked, setIsSystemLocked] = useState(false);

  // User Management State
  const [searchQuery, setSearchQuery] = useState('');

  // Environment State
  const [envContent, setEnvContent] = useState('');
  const [isEnvLoading, setIsEnvLoading] = useState(false);

  // Balance/Game State
  const [gameId, setGameId] = useState('chess');
  const [configJson, setConfigJson] = useState('');
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  // Helper: Convert room.users to array safely
  const getRoomUsers = useCallback((room: DashboardRoom): DashboardRoomUser[] => {
    if (!room.users) return [];
    if (Array.isArray(room.users)) return room.users;
    return Object.values(room.users);
  }, []);

  // Derived State
  const activeEntities = useMemo(() => {
    const entities: DashboardRoomUser[] = [];
    activeRooms.forEach((room) => {
      entities.push(...getRoomUsers(room));
    });
    return entities;
  }, [activeRooms, getRoomUsers]);

  const onlineUserIds = useMemo(() => new Set(activeEntities.map((e) => e.id)), [activeEntities]);
  const loggedInCount = activeEntities.length;

  // Traffic Data for Chart
  const [trafficData, setTrafficData] = useState<
    { time: string; entities: number; load: number }[]
  >([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
      setTrafficData((prev) =>
        [
          ...prev,
          {
            time: timeStr,
            entities: activeEntities.length,
            load: Math.floor(Math.random() * 20) + (activeEntities.length > 0 ? 10 : 0),
          },
        ].slice(-20)
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [activeEntities.length]);

  // Terminal State
  const [terminalLines, setTerminalLines] = useState<
    { text: string; type: 'cmd' | 'resp' | 'err' }[]
  >([
    { text: 'COSPIRA OS [Version 9.0.24]', type: 'resp' },
    { text: 'Initializing neural link...', type: 'resp' },
    { text: 'Ready.', type: 'resp' },
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  const handleTerminalCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim().toLowerCase();
    setTerminalLines((prev) => [...prev, { text: `> ${terminalInput}`, type: 'cmd' }]);
    setTerminalInput('');

    setTimeout(() => {
      if (cmd === 'help') {
        setTerminalLines((prev) => [
          ...prev,
          {
            text: 'Available commands: help, status, shutdown, clear, broadcast [msg], locks',
            type: 'resp',
          },
        ]);
      } else if (cmd === 'status') {
        setTerminalLines((prev) => [
          ...prev,
          {
            text: `Active Nodes: ${activeRooms.length} | Entities: ${activeEntities.length} | Pulse: ${isSystemLocked ? 'LOCKED' : 'GREEN'}`,
            type: 'resp',
          },
        ]);
      } else if (cmd.startsWith('broadcast ')) {
        const msg = cmd.replace('broadcast ', '');
        socket?.emit('admin:broadcast', { message: msg, adminKey: ADMIN_KEY });
        setTerminalLines((prev) => [
          ...prev,
          { text: `Neural broadcast sent: ${msg}`, type: 'resp' },
        ]);
      } else if (cmd === 'clear') {
        setTerminalLines([]);
      } else {
        setTerminalLines((prev) => [...prev, { text: `Unknown command: ${cmd}`, type: 'err' }]);
      }
    }, 100);
  };

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const sendGlobalBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    socket?.emit('admin:broadcast', { message: broadcastMessage, adminKey: ADMIN_KEY });
    toast.success('Broadcast signal dispatched');
    setBroadcastMessage('');
    logAction(`Global Broadcast: ${broadcastMessage.substring(0, 20)}...`);
  };

  const [roomTimerMinutes, setRoomTimerMinutes] = useState('10');

  // Rotating status text for empty state
  const [statusIndex, setStatusIndex] = useState(0);
  const statusMessages = useMemo(
    () => [
      'Monitoring system in real-time',
      'Awaiting events...',
      'All services operational',
      'Scanning for anomalies...',
    ],
    []
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (user.display_name?.toLowerCase() || '').includes(searchLower) ||
        (user.email?.toLowerCase() || '').includes(searchLower) ||
        (user.id || '').includes(searchLower)
      );
    });
  }, [users, searchQuery]);

  const ADMIN_KEY = 'Mahesh@7648'; // Hardcoded for socket auth

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [statusMessages, statusMessages.length]);

  const terminalScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      let baseUrl: string;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // On localhost, we can go direct or via proxy (direct is safer for explicit dev server setup)
        // But wait, the cert is on port 3001 too.
        // Let's stick to explicit logic:
        baseUrl = 'https://localhost:3001';
      } else {
        // Mobile/LAN: Use the proxy (current origin)
        baseUrl = window.location.origin;
      }

      // Allow override if strictly set for some reason, but prefer dynamic for mobile support
      // let baseUrl = import.meta.env.VITE_API_URL;

      baseUrl = baseUrl.replace(/\/$/, '');

      // 1. Fetch ALL Data from Admin API
      const res = await fetch(`${baseUrl}/api/admin/data`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });

      if (res.ok) {
        const data: AdminDataResponse = await res.json();
        setActiveRooms(data.activeRooms || []);
        setUsers(data.users || []);
        setFeedbacks(data.feedbacks || []);
        setLastSync(new Date());
      }

      // 2. Get System Status
      const statusRes = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });

      if (statusRes.ok) {
        const config = await statusRes.json();
        setIsSystemLocked(!!config.isLocked);
      }
    } catch {
      // silent fail
    }

    setIsLoading(false);
  }, [ADMIN_KEY]);

  useEffect(() => {
    const isAdmin = localStorage.getItem('admin_authenticated');
    if (!isAdmin) {
      navigate('/COSPERA_ADMIN88/login');
      return;
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [navigate, fetchData]);

  // Real-time updates via Socket
  useEffect(() => {
    if (!socket) return;

    const handleStatsUpdate = () => {
      fetchData();
    };

    const handleForceSync = () => {
      fetchData();
      toast.info('System Sync Initiated by Admin');
    };

    const handleSystemAnnouncement = (data: { type: string; message: string }) => {
      if (data.type === 'danger' && data.message.includes('LOCKDOWN')) {
        setIsSystemLocked(true);
      } else if (data.type === 'success' && data.message.includes('restored')) {
        setIsSystemLocked(false);
      }
    };

    socket.on('admin:stats-update', handleStatsUpdate);
    socket.on('admin:force-sync', handleForceSync);
    socket.on('system:announcement', handleSystemAnnouncement);

    const channel = supabase
      .channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        toast.info('Database Update: User Registry');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
        toast.info('New Intelligence Signal');
        fetchData();
      })
      .subscribe();

    return () => {
      socket.off('admin:stats-update', handleStatsUpdate);
      socket.off('admin:force-sync', handleForceSync);
      socket.off('system:announcement', handleSystemAnnouncement);
      supabase.removeChannel(channel);
    };
  }, [socket, fetchData, setIsSystemLocked]);

  // --- BALANCE OPS ---

  const fetchBalance = useCallback(async () => {
    setIsBalanceLoading(true);
    try {
      const data = await BalanceService.getConfig(gameId);
      setConfigJson(JSON.stringify(data, null, 4));
    } catch {
      toast.error('Failed to load balancing config');
    } finally {
      setIsBalanceLoading(false);
    }
  }, [gameId]);

  const saveBalance = async () => {
    try {
      setIsBalanceLoading(true);
      const parsed = JSON.parse(configJson);
      await BalanceService.updateConfig(gameId, parsed);
      toast.success('Balancing parameters updated globally');
      logAction(`Updated Balance: ${gameId}`);
    } catch (e: unknown) {
      const error = e as Error;
      toast.error('Invalid configuration payload: ' + error.message);
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // --- AUDIT TRAIL ---
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; timestamp: Date }[]>([]);

  const logAction = useCallback((action: string) => {
    setAuditLogs((prev) =>
      [
        { id: Math.random().toString(36).substr(2, 9), action, timestamp: new Date() },
        ...prev,
      ].slice(0, 50)
    );
  }, []);

  // Initial audit log
  useEffect(() => {
    logAction('Secure Boot Sequence Initiated');
    logAction('Admin Authenticated // Clearance level 9');
  }, [logAction]);

  // --- HELPER WRAPPERS ---

  const fetchEnv = async () => {
    try {
      setIsEnvLoading(true);
      let baseUrl: string;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = 'https://localhost:3001';
      } else {
        baseUrl = window.location.origin;
      }
      baseUrl = baseUrl.replace(/\/$/, '');

      const res = await fetch(`${baseUrl}/api/admin/env`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      const data = await res.json();
      if (data.content !== undefined) {
        setEnvContent(data.content);
        toast.success('Configuration loaded');
      } else {
        toast.error('Failed to load config');
      }
    } catch {
      toast.error('Failed to connect to server config');
    } finally {
      setIsEnvLoading(false);
    }
  };

  const saveEnv = async () => {
    try {
      setIsEnvLoading(true);
      let baseUrl: string;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = 'https://localhost:3001';
      } else {
        baseUrl = window.location.origin;
      }
      baseUrl = baseUrl.replace(/\/$/, '');

      const res = await fetch(`${baseUrl}/api/admin/env`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify({ content: envContent }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Configuration saved. Server restart required.');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error during save');
    } finally {
      setIsEnvLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    navigate('/COSPERA_ADMIN88/login');
  };

  return (
    <div className='min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-red-500/30 overflow-x-hidden relative'>
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      <div className='fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_0_30px_rgba(220,38,38,0.5)] z-50' />

      <header className='relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8'>
        <div className='flex items-center gap-6'>
          <motion.div
            initial={{ rotate: -45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            className='w-14 h-14 bg-gradient-to-br from-red-600 to-red-950 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.3)] border border-red-500/50 group'
          >
            <ShieldCheck className='w-8 h-8 text-white group-hover:scale-110 transition-transform' />
          </motion.div>
          <div>
            <h1 className='text-3xl font-black uppercase tracking-tighter text-white'>
              COSPIRA<span className='text-red-600'>PRIME</span>
            </h1>
            <div className='flex items-center gap-3 mt-1.5'>
              <Badge className='bg-red-500/10 text-red-500 border-red-500/20 text-[8px] font-black tracking-[0.2em] px-2 py-0'>
                CORE ACCESS
              </Badge>
              <span className='text-white/20 text-[10px] font-mono tracking-widest uppercase truncate max-w-[200px]'>
                Node: {window.location.hostname}
              </span>
            </div>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-4'>
          <div className='bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-3 backdrop-blur-xl flex items-center gap-8 text-right'>
            <div className='flex flex-col items-end'>
              <p className='text-[8px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-1'>
                <Activity className='w-2 h-2' />
                System Pulse
              </p>
              <div className='flex items-center gap-2'>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest ${isSystemLocked ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}
                >
                  {isSystemLocked ? 'Lockdown active' : 'All systems green'}
                </span>
                {isSystemLocked ? (
                  <ShieldAlert className='w-3 h-3 text-red-500 shadow-[0_0_8px_#ef4444]' />
                ) : (
                  <div className='w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]' />
                )}
              </div>
              <div className='text-[7px] font-mono text-white/30 truncate max-w-[120px] mt-1 uppercase italic'>
                {statusMessages[statusIndex]}
              </div>
            </div>
            <div className='w-px h-8 bg-white/5' />
            <div className='text-right'>
              <p className='text-[8px] font-black text-white/20 uppercase tracking-[0.2em]'>
                Last Sync
              </p>
              <p className='text-[10px] font-bold text-white/60 font-mono italic'>
                {formatDistanceToNow(lastSync, { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => fetchData()}
              disabled={isLoading}
              className='bg-white/5 border-white/10 hover:bg-white/10 h-10 rounded-xl transition-all active:scale-95'
            >
              <RefreshCw className={`w-4 h-4 text-red-500 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant='destructive'
              onClick={handleLogout}
              className='bg-red-600 hover:bg-red-500 h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all active:scale-95'
            >
              <LogOut className='w-4 h-4 mr-2' />
              Logoff
            </Button>
          </div>
        </div>
      </header>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12'>
        <StatsCard
          title='Neural Entities'
          value={activeEntities.length}
          icon={<Network className='w-6 h-6' />}
          color='red'
          risk='med'
          animate={true}
          footer={
            <div className='flex justify-between items-center text-[9px] font-black uppercase tracking-widest'>
              <span className='text-white/40'>Active Links</span>
              <span className='text-red-500'>{loggedInCount} SECURE</span>
            </div>
          }
        />
        <StatsCard
          title='Active Spheres'
          value={activeRooms.length}
          icon={<Globe className='w-6 h-6' />}
          color='orange'
          risk='low'
          footer={
            <div className='flex justify-between items-center text-[9px] font-black uppercase tracking-widest'>
              <span className='text-white/40'>Cluster Load</span>
              <span className='text-orange-500'>12%</span>
            </div>
          }
        />
        <StatsCard
          title='Identity Cache'
          value={users.length}
          icon={<Database className='w-6 h-6' />}
          color='emerald'
          risk='low'
          footer={
            <div className='flex justify-between items-center text-[9px] font-black uppercase tracking-widest'>
              <span className='text-white/40'>Registered</span>
              <span className='text-emerald-500'>
                {users.filter((u) => u.is_enterprise).length} CORP
              </span>
            </div>
          }
        />
        <StatsCard
          title='Intelligence Snippets'
          value={feedbacks.length}
          icon={<BrainCircuit className='w-6 h-6' />}
          color='blue'
          risk='med'
          footer={
            <div className='flex justify-between items-center text-[9px] font-black uppercase tracking-widest'>
              <span className='text-white/40'>Open Signals</span>
              <span className='text-blue-500'>{feedbacks.length} NEW</span>
            </div>
          }
        />
      </div>

      <div className='mb-12'>
        <div className='flex items-center gap-4 mb-6'>
          <div className='p-2 bg-red-600 rounded-lg'>
            <Terminal className='w-4 h-4 text-white' />
          </div>
          <h2 className='text-xs font-black uppercase tracking-[0.3em] text-white'>
            Neural Command Center
          </h2>
          <div className='h-px flex-1 bg-gradient-to-r from-red-600/50 via-white/5 to-transparent' />
        </div>

        <div className='grid md:grid-cols-4 gap-4'>
          <CommandAction
            title='Pulse Sync'
            desc='Re-align neural nodes across all workers.'
            icon={<RefreshCw className='w-4 h-4' />}
            onHold={() => {
              socket?.emit('admin:force-sync', { adminKey: ADMIN_KEY });
              logAction('Neural Pulse Broadcasted');
              fetchData();
            }}
          />
          <CommandAction
            title='Lockdown'
            desc='Initiate protocol 9. Stop all new entry.'
            icon={<Lock className='w-4 h-4' />}
            isActive={isSystemLocked}
            onHold={() => {
              socket?.emit('admin:lockdown', { adminKey: ADMIN_KEY });
              logAction('System Lockdown Enabled');
            }}
          />
          <CommandAction
            title='Release'
            desc='Restore normal operations and entry.'
            icon={<Unlock className='w-4 h-4' />}
            onHold={() => {
              socket?.emit('admin:release', { adminKey: ADMIN_KEY });
              logAction('System Released');
            }}
          />
          <CommandAction
            title='Kill Switch'
            desc='Emergency system termination'
            icon={<Skull className='w-5 h-5' />}
            onHold={() => {
              socket?.emit('admin:kill-switch', { adminKey: ADMIN_KEY });
              logAction('EMERGENCY KILL SWITCH ENGAGED');
            }}
            danger
          />
          <CommandAction
            title='Global Break'
            desc='Inject system-wide rest period'
            icon={<Clock className='w-5 h-5' />}
            onHold={() => {
              socket?.emit('admin:broadcast', {
                message: 'SYSTEM-WIDE BREAK INITIATED (15:00)',
                adminKey: ADMIN_KEY,
              });
              toast.warning('Global break signal dispatched');
            }}
          />
          <CommandAction
            title='Resume All'
            desc='Synchronize all node clocks'
            icon={<Play className='w-5 h-5' />}
            onHold={() => {
              socket?.emit('admin:force-sync', { adminKey: ADMIN_KEY });
              toast.success('Operational synchronization complete');
            }}
          />
        </div>
      </div>

      <Tabs defaultValue='overview' className='w-full relative z-10'>
        <TabsList className='bg-white/5 border border-white/10 p-1 mb-8 rounded-2xl md:inline-flex hidden'>
          {[
            { id: 'overview', icon: <Eye className='w-3 h-3' />, label: 'Neural Map' },
            { id: 'users', icon: <Users className='w-3 h-3' />, label: 'Database' },
            { id: 'shell', icon: <Terminal className='w-3 h-3' />, label: 'System Shell' },
            { id: 'feedback', icon: <BrainCircuit className='w-3 h-3' />, label: 'Intelligence' },
            { id: 'env', icon: <Sliders className='w-3 h-3' />, label: 'Config' },
            { id: 'balance', icon: <Bug className='w-3 h-3' />, label: 'Game Balance' },
            { id: 'audit', icon: <History className='w-3 h-3' />, label: 'Audit Log' },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className='data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(220,38,38,0.3)] rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all gap-2'
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value='overview'>
          <div className='grid lg:grid-cols-3 gap-8'>
            <div className='lg:col-span-2'>
              <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4 flex items-center gap-2'>
                <Radio className='w-3 h-3 text-red-500 animate-pulse' />
                Live Network Topology & Neural Traffic
              </h3>
              <div className='grid md:grid-cols-2 gap-6 mb-8'>
                <NeuralMap rooms={activeRooms} />
                <div className='bg-white/[0.02] border border-white/5 rounded-3xl p-6 h-[400px]'>
                  <h4 className='text-[8px] font-black uppercase tracking-widest text-white/20 mb-4'>
                    Neural Traffic Activity (Live)
                  </h4>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={trafficData}>
                      <defs>
                        <linearGradient id='colorWave' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor='#ef4444' stopOpacity={0.3} />
                          <stop offset='95%' stopColor='#ef4444' stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray='3 3' stroke='#ffffff05' vertical={false} />
                      <XAxis dataKey='time' hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          fontSize: '10px',
                        }}
                        itemStyle={{ color: '#ef4444' }}
                      />
                      <YAxis hide domain={[0, 'auto']} />
                      <Area
                        type='monotone'
                        dataKey='load'
                        stroke='#ef4444'
                        fillOpacity={1}
                        fill='url(#colorWave)'
                        strokeWidth={2}
                      />
                      <Area
                        type='monotone'
                        dataKey='entities'
                        stroke='#3b82f6'
                        fillOpacity={0}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className='mt-8'>
                <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4'>
                  Active Session Nodes
                </h3>
                <div className='grid gap-4'>
                  {activeRooms.map((room) => (
                    <div
                      key={room.id}
                      className='bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center group hover:bg-white/[0.04] transition-all'
                    >
                      <div className='flex items-center gap-4'>
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center border ${room.userCount > 0 ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-white/5 border-white/10 text-white/20'}`}
                        >
                          <Radio className='w-6 h-6' />
                        </div>
                        <div>
                          <h4 className='text-sm font-black text-white'>{room.name}</h4>
                          <p className='text-[10px] font-mono text-white/30 truncate max-w-[200px]'>
                            {room.id}
                          </p>
                        </div>
                      </div>

                      <div className='flex flex-wrap items-center gap-6 mt-4 md:mt-0'>
                        <div className='text-right'>
                          <p className='text-[8px] font-black text-white/20 uppercase tracking-[0.2em]'>
                            Population
                          </p>
                          <p className='text-xs font-black text-white tracking-widest'>
                            {room.userCount} ENTITIES
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <div className='flex items-center bg-black/40 border border-white/5 rounded-xl px-2 h-9'>
                            <Clock className='w-3 h-3 text-white/20 mr-2' />
                            <input
                              type='number'
                              className='bg-transparent border-none text-[10px] font-mono w-8 focus:outline-none text-white/50'
                              value={roomTimerMinutes}
                              onChange={(e) => setRoomTimerMinutes(e.target.value)}
                            />
                            <span className='text-[8px] text-white/20 font-black ml-1'>MIN</span>
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              socket?.emit('admin:set-timer', {
                                roomId: room.id,
                                duration: parseInt(roomTimerMinutes) * 60,
                                adminKey: ADMIN_KEY,
                              });
                              toast.info(`Timer set for ${room.name}`);
                            }}
                            className='bg-white/5 border-white/10 rounded-xl h-9 hover:bg-white/10 text-[10px] uppercase font-black tracking-widest px-4'
                          >
                            Timer
                          </Button>
                          <Button
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                              socket?.emit('admin:close-room', {
                                roomId: room.id,
                                adminKey: ADMIN_KEY,
                              });
                              logAction(`Terminated Node: ${room.name}`);
                            }}
                            className='bg-red-600/10 text-red-500 border-red-600/20 hover:bg-red-600 hover:text-white rounded-xl h-9 text-[10px] uppercase font-black tracking-widest px-4'
                          >
                            Kill
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {activeRooms.length === 0 && (
                    <div className='h-64 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]'>
                      <Radio className='w-8 h-8 text-white/10 mb-4 animate-pulse' />
                      <p className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20 text-center'>
                        No Neural Signals Detected
                        <br />
                        Across Main Cluster
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='space-y-8'>
              <div className='bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden group'>
                <div className='absolute top-0 right-0 w-24 h-24 bg-red-600/5 blur-2xl rounded-full' />
                <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-2'>
                  <Sparkles className='w-3 h-3 text-red-500' />
                  Security Status
                </h3>
                <div className='space-y-6'>
                  <div className='flex items-center justify-between'>
                    <span className='text-[10px] font-bold text-white/40 uppercase'>
                      Cluster Load
                    </span>
                    <span className='text-xs font-black text-emerald-500'>OPTIMAL</span>
                  </div>
                  <div className='h-1 bg-white/5 rounded-full overflow-hidden'>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(activeEntities.length * 2, 100)}%` }}
                      className='h-full bg-red-600'
                    />
                  </div>
                  <p className='text-[10px] text-white/30 font-mono leading-relaxed group-hover:text-white/50 transition-colors'>
                    Core infrastructure responding within{' '}
                    <span className='text-white font-bold'>14ms</span>. Metadata injection is active
                    and verified.
                  </p>
                </div>
              </div>

              <div className='bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden group'>
                <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-2'>
                  <Send className='w-3 h-3 text-red-500' />
                  Global Neural Broadcast
                </h3>
                <div className='space-y-4'>
                  <Input
                    placeholder='Enter transmission payload...'
                    className='bg-black/60 border-white/5 h-12 rounded-xl text-xs font-mono text-white/80'
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendGlobalBroadcast()}
                  />
                  <Button
                    onClick={sendGlobalBroadcast}
                    className='w-full bg-red-600 hover:bg-red-500 text-white h-10 rounded-xl font-black uppercase tracking-widest text-[9px]'
                  >
                    Dispatch Broadcast
                  </Button>
                </div>
              </div>

              <div>
                <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4'>
                  Pulse Log
                </h3>
                <div className='space-y-3'>
                  {auditLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className='flex gap-4 items-start border-l-2 border-red-600/20 pl-4 py-1 group/log'
                    >
                      <div className='min-w-[60px] text-right mt-1'>
                        <p className='text-[8px] font-black text-white/20 font-mono italic group-hover/log:text-red-500/40 transition-colors'>
                          {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <p className='text-[10px] font-bold text-white/80 uppercase tracking-widest group-hover/log:text-white transition-colors'>
                          {log.action}
                        </p>
                        <p className='text-[8px] font-mono text-white/10 group-hover/log:text-white/20'>
                          PID: {log.id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value='users'>
          <Card className='bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl'>
            <CardHeader className='p-8 border-b border-white/5 bg-white/[0.01]'>
              <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-6'>
                <div>
                  <h3 className='text-xl font-black uppercase tracking-tighter text-white'>
                    Identity Database
                  </h3>
                  <p className='text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-1'>
                    Found {users.length} entities in cache
                  </p>
                </div>
                <div className='flex items-center gap-3 w-full md:w-auto'>
                  <div className='relative flex-1 md:w-64'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20' />
                    <Input
                      placeholder='Search by ID or Email...'
                      className='bg-black/60 border-white/5 pl-12 h-11 rounded-xl text-xs font-mono text-white/80 placeholder:text-white/10 focus-visible:ring-red-500/20'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    size='icon'
                    className='bg-red-600 h-11 w-11 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                  >
                    <RefreshCw className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse'>
                  <thead>
                    <tr className='border-b border-white/5 bg-white/[0.02]'>
                      <th className='p-6 text-[9px] font-black uppercase tracking-[0.3em] text-white/40'>
                        Entity ID
                      </th>
                      <th className='p-6 text-[9px] font-black uppercase tracking-[0.3em] text-white/40'>
                        Identification
                      </th>
                      <th className='p-6 text-[9px] font-black uppercase tracking-[0.3em] text-white/40'>
                        Clearance
                      </th>
                      <th className='p-6 text-[9px] font-black uppercase tracking-[0.3em] text-white/40'>
                        Origin
                      </th>
                      <th className='p-6 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 text-right'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-white/5'>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className='group hover:bg-white/[0.03] transition-all'>
                        <td className='p-6'>
                          <div className='flex items-center gap-3'>
                            <div
                              className={`w-2 h-2 rounded-full ${onlineUserIds.has(user.id) ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-white/10'}`}
                            />
                            <span className='text-[10px] font-mono text-white/40 font-black'>
                              {user.id.substring(0, 12)}...
                            </span>
                          </div>
                        </td>
                        <td className='p-6'>
                          <div className='flex flex-col gap-1'>
                            <span className='text-xs font-black text-white'>
                              {user.display_name || 'Anonymous Entity'}
                            </span>
                            <span className='text-[10px] font-mono text-white/20 italic'>
                              {user.email || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className='p-6'>
                          <Badge
                            className={`${user.is_enterprise ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-white/5 text-white/40 border-white/10'} text-[8px] font-black tracking-widest`}
                          >
                            {user.is_enterprise ? 'ENTERPRISE' : 'STANDARD'}
                          </Badge>
                        </td>
                        <td className='p-6 text-[10px] font-mono text-white/40 uppercase'>
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </td>
                        <td className='p-6 text-right space-x-2'>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-8 w-8 rounded-lg hover:bg-white/5 text-white/20 hover:text-white'
                          >
                            <UserCheck className='w-3.5 h-3.5' />
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            onClick={() => {
                              socket?.emit('admin:deactivate-user', {
                                userId: user.id,
                                adminKey: ADMIN_KEY,
                              });
                              toast.error(`Banned User: ${user.id}`);
                            }}
                            className='h-8 w-8 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-500'
                          >
                            <Skull className='w-3.5 h-3.5' />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='shell'>
          <Card className='bg-black/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl h-[600px] flex flex-col'>
            <CardHeader className='p-6 border-b border-white/5 bg-white/[0.01] flex flex-row items-center justify-between'>
              <div className='flex items-center gap-3'>
                <Monitor className='w-4 h-4 text-emerald-500' />
                <h3 className='text-sm font-black uppercase tracking-widest text-white'>
                  System Terminal
                </h3>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                <span className='text-[8px] font-black text-emerald-500 uppercase tracking-widest'>
                  Active Link
                </span>
              </div>
            </CardHeader>
            <CardContent className='flex-1 p-0 flex flex-col overflow-hidden'>
              <div className='flex-1 p-6 font-mono text-xs overflow-y-auto space-y-1 scrollbar-hide'>
                {terminalLines.map((line, i) => (
                  <div
                    key={i}
                    className={`${line.type === 'cmd' ? 'text-white' : line.type === 'err' ? 'text-rose-500' : 'text-emerald-500/80'}`}
                  >
                    {line.text}
                  </div>
                ))}
                <div ref={terminalScrollRef} />
              </div>
              <form
                onSubmit={handleTerminalCmd}
                className='p-4 bg-black/40 border-t border-white/5 flex items-center gap-3'
              >
                <ChevronRight className='w-4 h-4 text-emerald-500' />
                <input
                  className='bg-transparent border-none focus:outline-none flex-1 font-mono text-xs text-white'
                  placeholder="Type 'help' for protocol instructions..."
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                />
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='feedback'>
          <div className='grid gap-6'>
            <div className='flex items-center justify-between'>
              <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-white/40'>
                Neural Signals
              </h3>
              <div className='flex gap-4'>
                <Badge className='bg-red-500/10 text-red-500 border-red-500/20 text-[8px] font-black tracking-widest'>
                  BUGS: {feedbacks.filter((f) => f.type === 'bug').length}
                </Badge>
                <Badge className='bg-blue-500/10 text-blue-500 border-blue-500/20 text-[8px] font-black tracking-widest'>
                  FEATURES: {feedbacks.filter((f) => f.type === 'feature').length}
                </Badge>
              </div>
            </div>

            <div className='grid md:grid-cols-2 gap-6'>
              {feedbacks.map((item) => (
                <div
                  key={item.id}
                  className='bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.05] transition-all relative overflow-hidden group'
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${item.type === 'bug' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`}
                  />
                  <div className='flex justify-between items-start mb-4'>
                    <Badge
                      className={`text-[8px] font-black tracking-widest ${item.type === 'bug' ? 'bg-red-500 text-white' : 'bg-white/10 text-white/40'}`}
                    >
                      {item.type.toUpperCase()}
                    </Badge>
                    <span className='text-[9px] font-mono text-white/20 uppercase'>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className='text-sm font-medium text-white/80 leading-relaxed mb-6 italic'>
                    "{item.comment}"
                  </p>
                  <div className='flex items-center justify-between pt-6 border-t border-white/5'>
                    <span className='text-[9px] font-mono text-white/10 italic'>
                      Source ID: {item.user_id?.substring(0, 8) || 'ANON-NODE'}
                    </span>
                    <div className='flex gap-1'>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-3 rounded-full ${i < item.rating ? (item.rating < 3 ? 'bg-red-500' : 'bg-emerald-500') : 'bg-white/5'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {feedbacks.length === 0 && (
                <div className='md:col-span-2 h-64 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center bg-white/[0.01]'>
                  <BrainCircuit className='w-8 h-8 text-white/10 mb-4' />
                  <p className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20'>
                    No intelligence signals in cache
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value='env'>
          <Card className='bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl'>
            <CardHeader className='p-8 border-b border-white/5 bg-white/[0.01] flex flex-row items-center justify-between'>
              <div>
                <h3 className='text-xl font-black uppercase tracking-tighter text-white'>
                  System Configuration
                </h3>
                <p className='text-[10px] font-black text-rose-500/60 uppercase tracking-[0.3em] mt-1 flex items-center gap-2'>
                  <AlertTriangle className='w-3 h-3' />
                  Warning: Live injection zone
                </p>
              </div>
              <Button
                variant='outline'
                onClick={fetchEnv}
                className='bg-white/5 border-white/10 rounded-xl h-10 hover:bg-white/10 text-[10px] uppercase font-black tracking-widest px-4'
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 text-rose-500 ${isEnvLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className='p-8'>
              <div className='relative group'>
                <textarea
                  className='w-full h-[500px] bg-black/60 border border-white/5 rounded-2xl p-6 font-mono text-xs text-emerald-500 focus:outline-none focus:border-red-500/30 resize-none selection:bg-red-500/20 leading-relaxed scrollbar-hide'
                  value={envContent}
                  onChange={(e) => setEnvContent(e.target.value)}
                  spellCheck={false}
                />
                <div className='absolute top-4 right-4 px-3 py-1 bg-red-600/10 border border-red-600/20 rounded-md text-[8px] font-black text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity'>
                  Raw Meta Editor
                </div>
              </div>
              <div className='flex justify-end mt-8'>
                <Button
                  onClick={saveEnv}
                  disabled={isEnvLoading}
                  className='bg-red-600 hover:bg-red-500 text-white h-12 px-8 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_30px_rgba(220,38,38,0.2)] transition-all active:scale-95'
                >
                  <Save className='w-4 h-4 mr-2' />
                  Commit Parameters
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='balance'>
          <Card className='bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl'>
            <CardHeader className='p-8 border-b border-white/5 bg-white/[0.01]'>
              <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-6'>
                <div>
                  <h3 className='text-xl font-black uppercase tracking-tighter text-white'>
                    Neural Balance Tuning
                  </h3>
                  <p className='text-[10px] font-black text-orange-500/60 uppercase tracking-[0.3em] mt-1 flex items-center gap-2'>
                    <Zap className='w-3 h-3' />
                    Real-time weight adjustment
                  </p>
                </div>
                <div className='flex items-center gap-3 w-full md:w-auto'>
                  <Select value={gameId} onValueChange={setGameId}>
                    <SelectTrigger className='bg-black/60 border-white/5 h-11 w-48 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60'>
                      <SelectValue placeholder='Select Cluster' />
                    </SelectTrigger>
                    <SelectContent className='bg-zinc-900 border-white/10 text-white'>
                      <SelectItem
                        value='chess'
                        className='text-[10px] font-black uppercase tracking-widest'
                      >
                        Chess Hub
                      </SelectItem>
                      <SelectItem
                        value='ludo'
                        className='text-[10px] font-black uppercase tracking-widest'
                      >
                        Ludo Hub
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className='p-8'>
              <div className='relative group'>
                <textarea
                  className='w-full h-[400px] bg-black/60 border border-white/5 rounded-2xl p-6 font-mono text-xs text-orange-400 focus:outline-none focus:border-orange-500/30 resize-none selection:bg-orange-500/20 leading-relaxed'
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className='flex justify-end mt-8'>
                <Button
                  onClick={saveBalance}
                  disabled={isBalanceLoading}
                  className='bg-orange-600 hover:bg-orange-500 text-white h-12 px-8 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_30px_rgba(249,115,22,0.2)] transition-all active:scale-95'
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isBalanceLoading ? 'animate-spin' : ''}`} />
                  Synchronize Weights
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='audit'>
          <Card className='bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl'>
            <CardHeader className='p-8 border-b border-white/5 bg-white/[0.01]'>
              <h3 className='text-xl font-black uppercase tracking-tighter text-white'>
                System Audit Trail
              </h3>
              <p className='text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-1'>
                Full-spectrum trace reporting
              </p>
            </CardHeader>
            <CardContent className='p-0'>
              <div className='p-6 space-y-4'>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className='flex gap-6 items-start p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all group'
                  >
                    <div className='mt-1'>
                      <div className='w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444]' />
                    </div>
                    <div className='flex-1'>
                      <div className='flex justify-between items-start mb-1'>
                        <h4 className='text-[10px] font-black uppercase tracking-widest text-white/80 group-hover:text-red-500 transition-colors'>
                          {log.action}
                        </h4>
                        <span className='text-[9px] font-mono text-white/20 italic'>
                          {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <p className='text-[8px] font-mono text-white/10 uppercase tracking-tighter'>
                        EXEC-ID: {log.id} // ORIGIN: SUPERADMIN-PRIME
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className='h-64 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]'>
                    <Radio className='w-8 h-8 text-white/10 mb-4 animate-pulse' />
                    <p className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20'>
                      Audit trace buffer empty
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
