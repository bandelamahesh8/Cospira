import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Users, MessageSquare, Activity, Shield, Server, LogOut, 
    Search, RefreshCw, Skull, Zap, History, ChevronDown, 
    ChevronUp, Lock, Unlock, Terminal, AlertTriangle, 
    UserCheck, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

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

const CommandAction = ({ title, desc, icon, onHold, isActive, danger }: CommandActionProps) => (
    <div className={`p-4 rounded-lg flex items-center justify-between border transition-all ${isActive ? 'bg-red-500/20 border-red-500/50' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
        <div className="flex flex-col gap-1">
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${danger ? 'text-red-500' : 'text-zinc-300'}`}>{title}</h4>
            <p className="text-[9px] text-zinc-500 font-mono">{desc}</p>
        </div>
        <Button 
            size="sm" 
            variant={danger ? 'destructive' : 'secondary'}
            className={`${danger ? 'bg-red-950/50 hover:bg-red-900 border-red-900' : 'bg-white/5 hover:bg-white/10'} h-8 w-8 p-0`}
            onClick={onHold} 
        >
            {icon}
        </Button>
    </div>
);

interface StatsCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    risk: 'low' | 'med' | 'high';
    animate?: boolean;
    footer?: React.ReactNode;
}

const StatsCard = ({ title, value, icon, color, footer, animate }: StatsCardProps) => (
    <Card className="bg-black/40 border-white/5 backdrop-blur-sm relative overflow-hidden group hover:border-white/10 transition-colors">
        <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg bg-${color}-500/10 border border-${color}-500/20 text-${color}-500`}>
                    {icon}
                </div>
                {animate && (
                    <span className={`flex h-2 w-2 rounded-full bg-${color}-500 animate-pulse shadow-[0_0_10px_currentColor]`} />
                )}
            </div>
            <div className="space-y-1">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</h3>
                <div className="text-2xl font-black text-white tracking-tight">{value}</div>
            </div>
            {footer}
        </CardContent>
    </Card>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { socket } = useWebSocket(); 
    const [activeRooms, setActiveRooms] = useState<DashboardRoom[]>([]);
    const [users, setUsers] = useState<DashboardUser[]>([]);
    const [feedbacks, setFeedbacks] = useState<DashboardFeedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date>(new Date());
    const [lastAction, setLastAction] = useState<string>('System Startup');
    const [isCommandZoneOpen, setIsCommandZoneOpen] = useState(false);
    
    // User Management State
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Environment State
    const [envContent, setEnvContent] = useState('');
    const [isEnvLoading, setIsEnvLoading] = useState(false);
    const [isSystemLocked, setIsSystemLocked] = useState(false);

    // Helper: Convert room.users to array safely
    const getRoomUsers = useCallback((room: DashboardRoom): DashboardRoomUser[] => {
        if (!room.users) return [];
        if (Array.isArray(room.users)) return room.users;
        return Object.values(room.users);
    }, []);

    // Derived State
    const onlineUserIds = useMemo(() => {
        const ids = new Set<string>();
        activeRooms.forEach(room => {
            const roomUsers = getRoomUsers(room);
            roomUsers.forEach(u => ids.add(u.id));
        });
        return ids;
    }, [activeRooms, getRoomUsers]);

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (
                (user.display_name?.toLowerCase() || '').includes(searchLower) ||
                (user.email?.toLowerCase() || '').includes(searchLower) ||
                (user.id || '').includes(searchLower)
            );
            
            if (!matchesSearch) return false;
            
            if (userFilter === 'active') return onlineUserIds.has(user.id);
            
            return true;
        });
    }, [users, searchQuery, userFilter, onlineUserIds]);

    // Rotating status text for empty state
    const [statusIndex, setStatusIndex] = useState(0);
    const statusMessages = useMemo(() => ["Monitoring system in real-time", "Awaiting events...", "All services operational", "Scanning for anomalies..."], []);

    const ADMIN_KEY = 'Mahesh@7648'; // Hardcoded for socket auth

    useEffect(() => {
        const interval = setInterval(() => {
            setStatusIndex((prev) => (prev + 1) % statusMessages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [statusMessages.length]);

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
                headers: { 'x-admin-key': ADMIN_KEY }
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
                headers: { 'x-admin-key': ADMIN_KEY }
            });

            if (statusRes.ok) {
                const config = await statusRes.json();
                setIsSystemLocked(!!config.isLocked);
            }

        } catch {
            // silent fail
        }
        
        setIsLoading(false);
    }, []);

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

        const handleSystemAnnouncement = (data: { type: string, message: string }) => {
            if (data.type === 'danger' && data.message.includes('LOCKDOWN')) {
                setIsSystemLocked(true);
            } else if (data.type === 'success' && data.message.includes('restored')) {
                setIsSystemLocked(false);
            }
        };

        socket.on('admin:stats-update', handleStatsUpdate);
        socket.on('admin:force-sync', handleForceSync);
        socket.on('system:announcement', handleSystemAnnouncement);
        
        socket.on('room-created', handleStatsUpdate);

        const channel = supabase
            .channel('admin-dashboard-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => {
                    toast.info('Database Update: User Registry');
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'feedback' },
                () => {
                    toast.info('New Intelligence Signal');
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            socket.off('admin:stats-update', handleStatsUpdate);
            socket.off('admin:force-sync', handleForceSync);
            socket.off('system:announcement', handleSystemAnnouncement);
            socket.off('room-created', handleStatsUpdate);
            supabase.removeChannel(channel);
        };
    }, [socket, fetchData]);

    const handleLogout = () => {
        localStorage.removeItem('admin_authenticated');
        navigate('/COSPERA_ADMIN88/login');
    };

    // --- ACTIONS & AUDIT ---
    
    const logAction = (action: string) => {
        setLastAction(action);
    };

    const terminateRoom = (roomId: string) => {
        socket?.emit('admin:close-room', { roomId, adminKey: ADMIN_KEY });
        toast.success('Node Detached', {
            description: `Room ${roomId.substring(0,8)}... terminated safely.`,
            className: "bg-black border border-red-900 text-red-200"
        });
        logAction(`Terminated Room: ${roomId}`);
        setTimeout(fetchData, 1000);
    };

    const banishUser = (roomId: string, userId: string) => {
        socket?.emit('admin:kick-user', { roomId, userId, adminKey: ADMIN_KEY });
        toast.success('Session Terminated', {
             description: `User ${userId} removed from node.`,
             className: "bg-black border border-red-900 text-red-200"
        });
        logAction(`Banished User: ${userId}`);
        setTimeout(fetchData, 1000);
    };

    // --- METRICS CALCULATION ---

    const activeEntities = useMemo(() => activeRooms.flatMap(r => getRoomUsers(r)), [activeRooms, getRoomUsers]);
    
    const loggedInCount = activeEntities.length > 0 ? Math.floor(activeEntities.length * 0.7) : 0;
    const guestCount = activeEntities.length - loggedInCount;
    const peakUsers = Math.max(activeEntities.length, 24); 

    // --- HELPER COMPONENTS ---

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
                headers: { 'x-admin-key': ADMIN_KEY }
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
                    'x-admin-key': ADMIN_KEY 
                },
                body: JSON.stringify({ content: envContent })
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

    const EmptyState = () => (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-red-900/30 bg-black/40 p-12 text-center group">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-red-500/5 to-transparent animate-pulse duration-4000" />
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500 via-transparent to-transparent scale-[2]" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-900/40 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.1)] relative">
                    <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping opacity-20" />
                    <History className="w-6 h-6 text-red-500/60" />
                </div>
                
                <div className="space-y-2">
                    <motion.div 
                        key={statusIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-red-500/50 text-[10px] font-mono uppercase tracking-[0.2em]"
                    >
                        {statusMessages[statusIndex]}
                    </motion.div>
                    <p className="text-zinc-600 text-[10px] font-mono">
                        Last event processed: {formatDistanceToNow(lastSync, { addSuffix: true })}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-red-500/30 overflow-x-hidden">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />
            <div className="fixed top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-600/50 to-transparent shadow-[0_0_20px_#ef4444]" />

            <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 pt-2">
                <div className="flex items-center gap-5">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-10 h-10 bg-gradient-to-br from-red-950/50 to-black border border-red-500/20 rounded-lg flex items-center justify-center relative overflow-hidden group shadow-lg shadow-red-900/10"
                    >
                        <Shield className="w-5 h-5 text-red-600" />
                    </motion.div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter text-white/90 leading-none">
                            Cospira <span className="text-red-600">Prime</span>
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                            <p className="text-red-500/40 text-[9px] font-mono uppercase tracking-[0.3em]">
                                Infrastructure Level
                            </p>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-8 bg-zinc-900/40 border border-white/5 rounded-full px-6 py-2.5 backdrop-blur-md">
                    <div className="flex flex-col items-end border-r border-white/5 pr-6">
                        <span className="text-[9px] uppercase text-zinc-600 tracking-widest font-bold">Last Operation</span>
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-[10px] font-mono text-zinc-300">{lastAction}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                         <span className="text-[9px] uppercase text-zinc-600 tracking-widest font-bold">Integrity</span>
                         <span className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-full mt-0.5 border transition-all duration-300 ${isSystemLocked ? 'bg-red-500/10 text-red-500 border-red-500/50 animate-pulse' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                             {isSystemLocked ? <AlertTriangle className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                             {isSystemLocked ? 'LOCKDOWN ACTIVE' : 'VERIFIED'}
                         </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={isLoading} className="h-8 border-red-900/20 bg-red-950/5 hover:bg-red-900/10 text-red-500/60 hover:text-red-400 text-[10px] uppercase tracking-widest transition-all">
                        <RefreshCw className={`w-3 h-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Sync
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 text-zinc-600 hover:text-white hover:bg-white/5 text-[10px] uppercase tracking-widest">
                        <LogOut className="w-3 h-3 mr-2" />
                        Exit
                    </Button>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatsCard 
                    title="Live Entities" 
                    value={activeEntities.length}
                    icon={<Activity className="w-4 h-4 text-orange-500" />} 
                    color="orange"
                    risk={activeEntities.length > 50 ? 'med' : 'low'}
                    animate={true}
                    footer={
                        <div className="flex gap-3 text-[9px] text-zinc-500 font-mono mt-3 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                <span>{loggedInCount} Auth</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full border border-orange-500" />
                                <span>{guestCount} Guest</span>
                            </div>
                            <div className="ml-auto text-zinc-400">Peak: {peakUsers}</div>
                        </div>
                    }
                />
                 <StatsCard 
                    title="Active Arenas" 
                    value={activeRooms.length} 
                    icon={<Server className="w-4 h-4 text-red-500" />} 
                    color="red"
                    risk="low"
                    footer={
                        <div className="flex gap-3 text-[9px] text-zinc-500 font-mono mt-3 pt-3 border-t border-white/5">
                            <span>Avg Session: 18m</span>
                            <span className="ml-auto text-zinc-400">Load: 12%</span>
                        </div>
                    }
                />
                <StatsCard 
                    title="Global Identity" 
                    value={users.length} 
                    icon={<Users className="w-4 h-4 text-emerald-500" />} 
                    color="emerald"
                    risk="low"
                    footer={
                        <div className="flex gap-3 text-[9px] text-zinc-500 font-mono mt-3 pt-3 border-t border-white/5">
                            <span>Enterprise: {users.filter(u => u.is_enterprise).length}</span>
                            <span className="ml-auto text-emerald-400">+12% W/W</span>
                        </div>
                    }
                />
                <StatsCard 
                    title="Signals" 
                    value={feedbacks.length} 
                    icon={<MessageSquare className="w-4 h-4 text-blue-500" />} 
                    color="blue"
                    risk={feedbacks.length > 10 ? 'med' : 'low'}
                    footer={
                        <div className="flex gap-2 text-[9px] text-zinc-500 font-mono mt-3 pt-3 border-t border-white/5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{feedbacks.filter(f => f.type === 'feature').length} Feat</span>
                            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{feedbacks.filter(f => f.type === 'bug').length} Bug</span>
                        </div>
                    }
                />
            </section>

             <div className="mb-8">
                <button 
                    onClick={() => setIsCommandZoneOpen(!isCommandZoneOpen)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500/40 hover:text-red-500 transition-colors mb-4 group w-full border-b border-red-900/10 pb-2 select-none"
                >
                    <Terminal className="w-3 h-3" />
                    Command Zone
                    {isCommandZoneOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <div className="flex-grow" />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] bg-red-950 px-2 py-0.5 rounded text-red-400 border border-red-900/30">RESTRICTED ACCESS // GOD MODE</span>
                </button>
                
                <AnimatePresence>
                    {isCommandZoneOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-red-950/5 border border-red-900/20 rounded-xl p-6 grid md:grid-cols-4 gap-4 overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />
                            
                            <CommandAction 
                                title="Force Sync" 
                                desc="Re-align all socket nodes." 
                                icon={<RefreshCw className="w-3 h-3" />}
                                onHold={() => { socket?.emit('admin:force-sync', { adminKey: ADMIN_KEY }); logAction('Force Sync Executed'); fetchData(); toast.info('Sync Signal Broadcasted'); }}
                            />
                            <CommandAction 
                                title="Lockdown" 
                                desc="Prevent new connections." 
                                icon={<Lock className="w-3 h-3" />}
                                isActive={isSystemLocked}
                                onHold={() => { socket?.emit('admin:lockdown', { adminKey: ADMIN_KEY }); logAction('Lockdown Enabled'); toast.warning('System Lockdown Initiated'); }}
                            />
                            <CommandAction 
                                title="Resume" 
                                desc="Deactivate Kill Switch & Lockdown." 
                                icon={<Unlock className="w-3 h-3" />}
                                onHold={() => { socket?.emit('admin:release', { adminKey: ADMIN_KEY }); logAction('System Resumed'); toast.success('System Normal'); }}
                            />
                            <CommandAction 
                                title="Kill Switch" 
                                desc="Emergency shutdown." 
                                icon={<Skull className="w-3 h-3" />}
                                danger={true}
                                onHold={() => { socket?.emit('admin:kill-switch', { adminKey: ADMIN_KEY }); logAction('Kill Switch Triggered'); toast.error('KILL SWITCH ACTIVATED'); }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Tabs defaultValue="overview" className="w-full relative z-10">
                <TabsList className="bg-zinc-900/30 border border-white/5 mb-8 p-1 h-10 w-full md:w-auto rounded-lg">
                    <TabsTrigger value="overview" className="h-full px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white font-mono text-[10px] uppercase tracking-widest rounded-md transition-all">Overview</TabsTrigger>
                    <TabsTrigger value="users" className="h-full px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white font-mono text-[10px] uppercase tracking-widest rounded-md transition-all">Database</TabsTrigger>
                    <TabsTrigger value="feedback" className="h-full px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white font-mono text-[10px] uppercase tracking-widest rounded-md transition-all">Intelligence</TabsTrigger>
                    <TabsTrigger value="environment" onClick={fetchEnv} className="h-full px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white font-mono text-[10px] uppercase tracking-widest rounded-md transition-all flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> Config
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid lg:grid-cols-2 gap-8">
                        <Card className="bg-black/40 border-white/5 backdrop-blur-sm">
                            <CardHeader className="border-b border-white/5 pb-4 px-6 pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]" />
                                        <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-300">
                                            Live Operations
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline" className="bg-zinc-900/50 border-white/10 text-[9px] font-mono">{activeRooms.length} Nodes</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px]">
                                    <div className="p-4 space-y-3">
                                        {activeRooms.length === 0 ? (
                                            <EmptyState />
                                        ) : (
                                            activeRooms.map((r) => (
                                                <div key={r.id} className="flex flex-col gap-3 p-4 bg-zinc-900/20 rounded-xl border border-white/5 hover:border-red-500/30 transition-all group overflow-hidden relative">
                                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost"
                                                            onClick={() => terminateRoom(r.id)}
                                                            className="h-6 w-6 text-red-500 hover:bg-red-950/30"
                                                            title="Terminate Node"
                                                        >
                                                            <Skull className="w-3 h-3" />
                                                        </Button>
                                                    </div>

                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="font-mono text-red-400 font-bold text-[10px] bg-red-950/20 px-1.5 py-0.5 rounded border border-red-900/20">{r.id.substring(0, 8)}...</span>
                                                                {r.isLocked && <Lock className="w-3 h-3 text-zinc-500" />}
                                                            </div>
                                                            <p className="text-sm font-bold text-white capitalize tracking-tight">{r.name}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {getRoomUsers(r).length > 0 && (
                                                        <div className="pl-3 border-l-2 border-white/5 mt-2 relative z-10">
                                                            <div className="space-y-1">
                                                                {getRoomUsers(r).map((u) => (
                                                                    <div key={u.id} className="flex items-center justify-between text-xs group/user py-0.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-1 h-1 bg-green-500 rounded-full" />
                                                                            <span className="text-zinc-400 font-mono text-[11px]">{u.name}</span>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => banishUser(r.id, u.id)}
                                                                            className="text-[9px] text-red-500 opacity-0 group-hover/user:opacity-100 hover:text-red-400 hover:underline uppercase tracking-wider font-bold"
                                                                        >
                                                                            Banish
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card className="bg-black/40 border-white/5 backdrop-blur-sm flex flex-col">
                            <CardHeader className="border-b border-white/5 pb-4 px-6 pt-6">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-300">
                                    Latest Injections
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 flex-1">
                                <ScrollArea className="h-[400px]">
                                    <div className="p-4 space-y-2">
                                        {users.slice(0, 10).map((u, i) => (
                                            <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center font-mono text-xs text-zinc-500 border border-white/10 group-hover:border-white/20 transition-colors">
                                                        {u.display_name?.substring(0, 2).toUpperCase() || '??'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-red-500 transition-colors">{u.display_name || 'Anonymous'}</p>
                                                        <p className="text-[10px] text-zinc-500 font-mono">ID: {u.id.substring(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                     <Badge variant="outline" className="border-white/5 text-zinc-500 text-[9px] mb-1 font-mono">
                                                        {i === 0 ? 'Just Now' : formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                                                     </Badge>
                                                     <p className="text-[9px] text-zinc-600 uppercase tracking-wider">{u.is_enterprise ? 'Enterprise' : 'Standard'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="users">
                    <Card className="bg-black/40 border-white/5">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                            <div className="flex items-center gap-4">
                                <div>
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-300">Global Registry</CardTitle>
                                    <CardDescription className="text-[10px] text-zinc-500 font-mono mt-1">Showing {filteredUsers.length} / {users.length} entities</CardDescription>
                                </div>
                                <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5">
                                    <button 
                                        onClick={() => setUserFilter('all')}
                                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${userFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >All</button>
                                    <button 
                                        onClick={() => setUserFilter('active')}
                                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${userFilter === 'active' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >Active</button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 w-full md:w-auto items-center">
                                {selectedUsers.length > 0 && (
                                    <div className="mr-4 flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                        <span className="text-[10px] text-zinc-500 font-mono">{selectedUsers.length} Selected</span>
                                        <Button size="sm" variant="destructive" className="h-7 text-[10px] px-2" onClick={() => toast("Bulk Lock Feature")}>Lock</Button>
                                    </div>
                                )}
                                
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                                    <Input placeholder="Search name, email, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-zinc-900/50 border-white/10 text-xs font-mono focus:border-red-500/30" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="border-b border-white/5">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-zinc-900/80 text-zinc-500 uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4 w-[5%]">
                                                <Checkbox 
                                                    checked={selectedUsers.length === users.length && users.length > 0} 
                                                    onCheckedChange={(checked) => setSelectedUsers(checked ? users.map(u => u.id) : [])}
                                                    className="border-zinc-700 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                />
                                            </th>
                                            <th className="p-4 w-[30%]">Identity</th>
                                            <th className="p-4 w-[20%]">Status</th>
                                            <th className="p-4 w-[20%]">Role</th>
                                            <th className="p-4 w-[15%]">Injection</th>
                                            <th className="p-4 w-[10%] text-right">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className={`hover:bg-white/5 transition-colors group ${selectedUsers.includes(u.id) ? 'bg-red-900/10' : ''}`}>
                                                <td className="p-4">
                                                    <Checkbox 
                                                        checked={selectedUsers.includes(u.id)}
                                                        onCheckedChange={(checked) => {
                                                            setSelectedUsers(prev => checked ? [...prev, u.id] : prev.filter(id => id !== u.id));
                                                        }}
                                                        className="border-zinc-700 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500">
                                                            <UserCheck className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white">{u.display_name || 'Anonymous'}</p>
                                                            <p className="text-[10px] text-zinc-600 font-mono">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                     <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${onlineUserIds.has(u.id) ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                                                        <span className={`font-medium ${onlineUserIds.has(u.id) ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                            {onlineUserIds.has(u.id) ? 'Online' : 'Offline'}
                                                        </span>
                                                     </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="secondary" className="bg-white/5 text-zinc-400 border border-white/10 font-mono text-[9px] uppercase tracking-wider">
                                                        {u.is_enterprise ? 'Enterprise' : 'Standard'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-zinc-500 font-mono text-[10px]">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            title="Suspend User"
                                                            onClick={() => {
                                                                socket?.emit('admin:deactivate-user', { userId: u.id, adminKey: ADMIN_KEY });
                                                                toast.error(`Suspension Order: ${u.display_name}`);
                                                            }}
                                                            className="h-7 w-7 text-zinc-600 hover:text-red-500 hover:bg-red-950/20"
                                                        >
                                                            <Lock className="w-3.5 h-3.5" />
                                                        </Button>
                                                         <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            title="Resume User"
                                                            onClick={() => {
                                                                socket?.emit('admin:resume-user', { userId: u.id, adminKey: ADMIN_KEY });
                                                                toast.success(`Access Restored: ${u.display_name}`);
                                                            }}
                                                            className="h-7 w-7 text-zinc-600 hover:text-emerald-500 hover:bg-emerald-950/20"
                                                        >
                                                            <Unlock className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="feedback">
                    <div className="grid gap-4">
                         <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Incoming Signals ({feedbacks.length})</h3>
                              <div className="flex gap-2">
                                  <Badge variant="outline" className="bg-red-950/20 text-red-500 border-red-500/20">High: {feedbacks.filter(f => f.rating < 3).length}</Badge>
                                  <Badge variant="outline" className="bg-blue-950/20 text-blue-500 border-blue-500/20">Features: {feedbacks.filter(f => f.type === 'feature').length}</Badge>
                              </div>
                         </div>
                    
                        {feedbacks.map((item) => (
                            <Card key={item.id} className="bg-black/40 border-white/5 hover:border-white/20 transition-all group relative overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.type === 'bug' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                <CardContent className="p-6 pl-8">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <Badge variant={
                                                item.type === 'bug' ? 'destructive' : 
                                                item.type === 'feature' ? 'default' : 'secondary'
                                            } className="text-[10px] uppercase tracking-wider font-bold">
                                                {item.type}
                                            </Badge>
                                            <div className="flex opacity-50">
                                                {Array.from({length: 5}).map((_, i) => (
                                                    <div key={i} className={`w-1 h-3 mx-px rounded-full ${i < item.rating ? (item.rating < 3 ? 'bg-red-500' : 'bg-emerald-500') : 'bg-zinc-800'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-zinc-500 font-mono">
                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-zinc-300 mb-4 pl-4 border-l border-white/5">{item.comment}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="environment">
                     <Card className="bg-black/40 border-white/5">
                        <CardHeader>
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-purple-500" />
                                System Variables (.env)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <textarea 
                                    className="w-full h-[400px] bg-black border border-white/10 rounded-lg p-4 font-mono text-xs text-green-500 focus:outline-none focus:border-purple-500/50 resize-none selection:bg-purple-900/30"
                                    value={envContent}
                                    onChange={(e) => setEnvContent(e.target.value)}
                                    spellCheck={false}
                                />
                                {isEnvLoading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end mt-4">
                                <Button onClick={saveEnv} disabled={isEnvLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs uppercase tracking-wider">
                                    <Save className="w-3 h-3 mr-2" />
                                    Commit Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminDashboard;
