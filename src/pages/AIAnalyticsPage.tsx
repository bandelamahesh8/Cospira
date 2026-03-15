import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Shield,
  Zap,
  Users,
  Target,
  Activity,
  Layers,
  RefreshCw,
  Search,
  Globe,
  Lock,
  Cpu,
  Check,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { AlertCircle, Trash2 } from 'lucide-react';

const PurgeConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className='bg-[#0c1016] border border-red-500/30 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative overflow-hidden'
      >
        <div className='absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full' />
        <div className='flex items-center gap-4 mb-6'>
          <div className='w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]'>
            <AlertCircle size={28} />
          </div>
          <div>
            <h3 className='text-2xl font-black italic uppercase tracking-tighter text-white'>
              Neural Purge
            </h3>
            <p className='text-[10px] font-bold text-red-500/50 uppercase tracking-widest mt-1'>
              Irreversible Operation
            </p>
          </div>
        </div>
        <p className='text-sm text-white/60 leading-relaxed uppercase font-bold tracking-tight mb-8 italic'>
          Are you sure you want to clear your neural history? This will reset all your analytics,
          activity feeds, and sector connectivity logs.
        </p>
        <div className='flex gap-4'>
          <button
            onClick={onClose}
            disabled={loading}
            className='flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bold'
          >
            Abbreviate
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className='flex-1 py-4 rounded-2xl bg-red-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-red-400 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2'
          >
            {loading ? <RefreshCw className='animate-spin' size={14} /> : <Trash2 size={14} />}
            Confirm Purge
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const AIAnalyticsPage = () => {
  const { user } = useAuth();
  const { isConnected, socket } = useWebSocket();

  interface HistoryItem {
    id: string;
    name: string;
    role: string;
    participantCount: number;
    isActive: boolean;
    type: 'organization' | 'private';
    joinedAt: string;
  }

  interface AIInsights {
    totalTimeSpentMinutes: number;
    totalMessages: number;
    totalShares: number;
    totalGames: number;
    roomsCreated: number;
    roomsJoined: number;
    averageSessionDuration: number;
    peakStability: number;
    activityPulse: { date: string; value: number }[];
    sectorBreakdown: { organization: number; private: number };
    securityCompliance: number;
    rank: string;
    topOrganizations: { name: string; count: number }[];
  }

  interface ActivityItem {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    time: string;
    duration?: number;
    endTime?: string;
    roomId?: string;
  }

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'sectors' | 'signals'>(
    'overview'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'organization' | 'private'>('all');
  const [isPurging, setIsPurging] = useState(false);

  const fetchData = useCallback(
    (silent = false) => {
      if (!socket || !isConnected) return;
      if (!silent) setLoading(true);

      let completed = 0;
      const checkDone = () => {
        completed++;
        if (completed === 3) setLoading(false);
      };

      // Fetch historical data
      socket.emit(
        'get-user-history',
        { userId: user?.id, limit: 100, filterType },
        (res: { success: boolean; history?: HistoryItem[] }) => {
          if (res.success && res.history) setHistory(res.history);
          checkDone();
        }
      );

      // Fetch AI insights
      socket.emit(
        'get-user-ai-insights',
        { userId: user?.id },
        (res: { success: boolean; insights?: AIInsights }) => {
          if (res.success && res.insights) setInsights(res.insights);
          checkDone();
        }
      );

      // Fetch User Activity
      socket.emit(
        'get-user-activity',
        { limit: 100, userId: user?.id },
        (res: { success: boolean; activities?: ActivityItem[] }) => {
          if (res.success && res.activities) setActivities(res.activities);
          checkDone();
        }
      );
    },
    [socket, isConnected, user, filterType]
  );

  // Fetch real data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time signal listener
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleSignalUpdate = () => {
      fetchData(true); // Silent refresh
    };

    socket.on('neural-signal-update', handleSignalUpdate);
    // Listen for history cleared event if it exists
    socket.on('history-cleared', handleSignalUpdate);

    return () => {
      socket.off('neural-signal-update', handleSignalUpdate);
      socket.off('history-cleared', handleSignalUpdate);
    };
  }, [socket, isConnected, fetchData]);

  const handleClearHistory = () => {
    setPurgeModalOpen(true);
  };

  const confirmPurge = () => {
    if (!socket) return;
    setIsPurging(true);
    socket.emit('clear-user-history', (res: { success: boolean }) => {
      setIsPurging(false);
      setPurgeModalOpen(false);
      if (res.success) {
        fetchData();
      } else {
        alert('Failed to clear history.');
      }
    });
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [history, searchQuery, filterType]);

  const userStats = [
    {
      label: 'Sectors Controlled',
      value: (insights?.roomsCreated || 0).toString(),
      icon: Target,
      color: '#06b6d4',
      trend: `LVL: ${insights?.rank || 'Initiate'}`,
    },
    {
      label: 'Security Compliance',
      value: `${(insights?.securityCompliance || 100).toFixed(1)}%`,
      icon: Shield,
      color: '#10b981',
      trend: (insights?.securityCompliance || 100) > 95 ? 'Elite' : 'Nominal',
    },
    {
      label: 'Neural Depth',
      value: `${insights?.totalTimeSpentMinutes || 0}m`,
      icon: Clock,
      color: '#a855f7',
      trend: 'Sync Time',
    },
    {
      label: 'Network Pulse',
      value: `${insights?.totalMessages || 0}`,
      icon: Zap,
      color: '#f97316',
      trend: 'Activities',
    },
  ];

  const ChartTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { value: number; payload: { date: string } }[];
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-[#0c1016]/90 border border-cyan-500/40 px-3 py-2 rounded-xl backdrop-blur-xl shadow-2xl'>
          <p className='text-[10px] font-black text-white/40 uppercase tracking-widest'>
            {payload[0].payload.date}
          </p>
          <p className='text-sm font-black text-cyan-400 uppercase italic'>
            {payload[0].value} Events
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className='flex-1 min-h-full bg-[#05070a] text-white overflow-y-auto custom-scrollbar selection:bg-cyan-500/30'>
      <div className='w-full px-4 md:px-10 lg:px-12 py-8 md:py-12 space-y-12 max-w-[1600px] mx-auto pb-32'>
        {/* Header Section */}
        <div className='relative'>
          <div className='absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/10 blur-[150px] pointer-events-none' />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10'
          >
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <div className='h-px w-12 bg-gradient-to-r from-cyan-500 to-transparent' />
                <span className='text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400'>
                  AI Neural Analytics v4.0
                </span>
              </div>
              <h1 className='text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.85] italic uppercase mb-6'>
                Neural <span className='text-cyan-400'>Signature</span>
              </h1>
              <div className='flex flex-wrap items-center gap-4 text-white/40 font-bold uppercase tracking-tight text-sm'>
                <span>
                  Analyzing signature:{' '}
                  <span className='text-white italic'>
                    {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
                  </span>
                </span>
                <div className='w-1.5 h-1.5 rounded-full bg-cyan-500/30' />
                <span>
                  Sector Integrity:{' '}
                  <span className='text-emerald-400'>
                    {(insights?.securityCompliance || 100).toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>

            <div className='flex flex-col gap-4'>
              <div className='flex items-center gap-4 px-6 py-4 bg-white/[0.03] border border-white/5 rounded-3xl backdrop-blur-2xl shadow-2xl'>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-cyan-500 animate-pulse' : 'bg-red-500'} shadow-[0_0_10px_rgba(6,182,212,0.5)]`}
                />
                <span className='text-[10px] font-black uppercase tracking-widest text-white/60'>
                  {isConnected ? 'Neural Link Active' : 'Uplink Failed'}
                </span>
                <div className='w-px h-8 bg-white/10 mx-2' />
                <button
                  onClick={handleClearHistory}
                  className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors group'
                >
                  <RefreshCw
                    size={12}
                    className='group-hover:rotate-180 transition-transform duration-500'
                  />
                  <span>Purge Cache</span>
                </button>
              </div>
              <div className='flex gap-2'>
                {(['overview', 'activity', 'sectors', 'signals'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTab === tab
                        ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode='wait'>
          {activeTab === 'overview' && (
            <motion.div
              key='overview'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='space-y-12'
            >
              {/* Stats Grid */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                {userStats.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className='group relative'
                  >
                    <div className='relative bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-3xl border border-white/10 rounded-[44px] p-10 hover:border-cyan-500/40 transition-all hover:-translate-y-2 overflow-hidden shadow-2xl'>
                      <div className='absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full group-hover:scale-150 transition-transform duration-700' />

                      <div className='flex items-start justify-between mb-8'>
                        <div className='w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform border border-white/10 shadow-inner'>
                          <stat.icon size={32} />
                        </div>
                        <div className='text-[10px] font-black px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest'>
                          {stat.trend}
                        </div>
                      </div>
                      <p className='text-[11px] font-black uppercase tracking-[0.4em] text-white/30 mb-2'>
                        {stat.label}
                      </p>
                      <p className='text-5xl font-black text-white tracking-tighter italic uppercase leading-none'>
                        {stat.value}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Central Map & Activity */}
              <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
                {/* Neural Pulse Chart */}
                <div className='lg:col-span-8 space-y-8'>
                  <div className='bg-[#0c1016]/60 backdrop-blur-3xl border border-white/10 rounded-[48px] p-10 relative overflow-hidden h-[400px] shadow-2xl'>
                    <div className='absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/[0.03] blur-[120px] -translate-y-1/2 translate-x-1/2' />
                    <div className='flex items-center justify-between mb-12 relative z-10'>
                      <div className='flex items-center gap-4'>
                        <div className='w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20'>
                          <Activity size={24} />
                        </div>
                        <div>
                          <h3 className='text-2xl font-black uppercase tracking-tighter italic'>
                            Neural Connectivity Pulse
                          </h3>
                          <p className='text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1'>
                            Signal density over 7 cycles
                          </p>
                        </div>
                      </div>
                      <div className='flex gap-3'>
                        {[
                          { label: 'Density', val: (insights?.totalMessages || 0) / 7 },
                          { label: 'Stability', val: '98.9%' },
                        ].map((m) => (
                          <div
                            key={m.label}
                            className='px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl'
                          >
                            <p className='text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1'>
                              {m.label}
                            </p>
                            <p className='text-sm font-black text-cyan-400 italic'>{m.val}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className='h-[200px] w-full relative z-10 mt-10'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <AreaChart
                          data={insights?.activityPulse || []}
                          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id='mainPulse' x1='0' y1='0' x2='0' y2='1'>
                              <stop offset='0%' stopColor='#06b6d4' stopOpacity={0.4} />
                              <stop offset='100%' stopColor='#06b6d4' stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey='date' hide />
                          <YAxis hide />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type='monotone'
                            dataKey='value'
                            stroke='#06b6d4'
                            strokeWidth={4}
                            fillOpacity={1}
                            fill='url(#mainPulse)'
                            animationDuration={2500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Sector Intelligence Quick View */}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                    <div className='bg-[#0c1016]/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 overflow-hidden relative group shadow-xl'>
                      <div className='flex items-center gap-4 mb-6 relative z-10'>
                        <div className='w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20'>
                          <Globe size={24} />
                        </div>
                        <h3 className='text-xl font-black uppercase tracking-tighter italic'>
                          Web Sector Intelligence
                        </h3>
                      </div>
                      <p className='text-sm text-white/40 uppercase font-bold tracking-tight mb-8 relative z-10'>
                        Most connected clusters within the Cospira network.
                      </p>
                      <div className='space-y-4 relative z-10'>
                        {(insights?.topOrganizations || []).map((org, i) => (
                          <div
                            key={i}
                            className='flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors group/item cursor-pointer'
                          >
                            <div className='flex items-center gap-4'>
                              <div className='w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xs font-black italic border border-cyan-500/10'>
                                {i + 1}
                              </div>
                              <span className='font-black uppercase italic text-sm text-white/80 group-hover/item:text-cyan-400 transition-colors'>
                                {org.name}
                              </span>
                            </div>
                            <span className='text-[10px] font-mono font-bold text-white/20 uppercase'>
                              {org.count} Logins
                            </span>
                          </div>
                        ))}
                        {(!insights?.topOrganizations ||
                          insights.topOrganizations.length === 0) && (
                          <div className='text-center py-4 text-[10px] font-black uppercase text-white/20 italic'>
                            No network clusters detected
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='bg-[#0c1016]/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 overflow-hidden relative group shadow-xl'>
                      <div className='flex items-center gap-4 mb-6 relative z-10'>
                        <div className='w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20'>
                          <Lock size={24} />
                        </div>
                        <h3 className='text-xl font-black uppercase tracking-tighter italic'>
                          Security Vector
                        </h3>
                      </div>
                      <div className='space-y-6 relative z-10'>
                        <div className='flex items-end justify-between'>
                          <div>
                            <p className='text-sm font-black italic uppercase text-white/40'>
                              Encryption Health
                            </p>
                            <p className='text-4xl font-black text-white italic tracking-tighter uppercase'>
                              Stable
                            </p>
                          </div>
                          <p className='text-4xl font-black text-emerald-400 italic tracking-tighter'>
                            {(insights?.securityCompliance || 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className='h-2 bg-white/5 rounded-full overflow-hidden'>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${insights?.securityCompliance || 100}%` }}
                            className='h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                            transition={{ duration: 2, ease: 'easeOut' }}
                          />
                        </div>
                        <div className='p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl'>
                          <p className='text-[9px] font-black uppercase text-emerald-400/60 leading-relaxed tracking-widest italic'>
                            Neural guard active. No significant breaches detected in recent cycles.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Capacity & Overview */}
                <div className='lg:col-span-4 space-y-8'>
                  <div className='bg-gradient-to-b from-[#0c1016] to-transparent backdrop-blur-3xl border border-white/10 rounded-[48px] p-10 shadow-2xl flex flex-col h-full'>
                    <div className='flex items-center gap-4 mb-10'>
                      <div className='w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-xl'>
                        <Cpu className='w-6 h-6' />
                      </div>
                      <h2 className='text-2xl font-black text-white italic uppercase tracking-tighter'>
                        Signature <span className='text-white/20'>Capacity</span>
                      </h2>
                    </div>

                    <div className='flex-1 space-y-12'>
                      {/* Breakdown Bars */}
                      {[
                        {
                          label: 'Organization Units',
                          icon: Globe,
                          value: insights?.sectorBreakdown?.organization || 0,
                          color: '#a855f7',
                        },
                        {
                          label: 'Private Clusters',
                          icon: Lock,
                          value: insights?.sectorBreakdown?.private || 0,
                          color: '#06b6d4',
                        },
                      ].map((item, i) => (
                        <div key={i} className='space-y-4'>
                          <div className='flex justify-between items-end'>
                            <span className='text-[10px] font-black uppercase tracking-[0.3em] text-white/30'>
                              {item.label}
                            </span>
                            <span className='text-2xl font-black italic text-white'>
                              {item.value}
                            </span>
                          </div>
                          <div className='h-4 bg-white/5 rounded-full p-1 overflow-hidden'>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${item.value > 0 ? Math.max(2, (item.value / ((insights?.roomsJoined || 1) + 1)) * 100) : 0}%`,
                              }}
                              className='h-full rounded-full shadow-lg'
                              style={{
                                backgroundColor: item.color,
                                boxShadow: `0 0 15px ${item.color}66`,
                              }}
                              transition={{ duration: 1.5, delay: i * 0.3 }}
                            />
                          </div>
                        </div>
                      ))}

                      <div className='mt-12 p-8 rounded-[40px] bg-[#14b8a6]/5 border border-[#14b8a6]/20 relative overflow-hidden group hover:border-[#14b8a6]/40 transition-colors'>
                        <div className='absolute -bottom-8 -right-8 w-24 h-24 bg-[#14b8a6]/20 blur-[30px] rounded-full' />
                        <div className='flex items-center gap-3 mb-4'>
                          <Layers className='text-[#14b8a6] w-4 h-4' />
                          <span className='text-[10px] font-black uppercase tracking-widest text-[#14b8a6]'>
                            Intelligence Rank
                          </span>
                        </div>
                        <h4 className='text-3xl font-black text-white italic uppercase tracking-tighter mb-2'>
                          {insights?.rank}
                        </h4>
                        <p className='text-xs text-white/40 uppercase font-bold tracking-tight italic'>
                          Validated across {insights?.roomsCreated} creation events and{' '}
                          {insights?.roomsJoined} network joins.
                        </p>
                      </div>

                      <div className='pt-8 border-t border-white/5 space-y-4'>
                        <div className='flex items-center justify-between text-[11px] font-black uppercase text-white/30 tracking-widest'>
                          <span>Average Session</span>
                          <span className='text-white italic'>
                            {insights?.averageSessionDuration}m
                          </span>
                        </div>
                        <div className='flex items-center justify-between text-[11px] font-black uppercase text-white/30 tracking-widest'>
                          <span>Total Network Pulse</span>
                          <span className='text-white italic'>
                            {insights?.totalMessages} Events
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sectors' && (
            <motion.div
              key='sectors'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='space-y-12'
            >
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
                <div className='bg-[#0c1016]/60 backdrop-blur-3xl border border-white/10 rounded-[48px] p-12 shadow-2xl'>
                  <h3 className='text-3xl font-black italic uppercase tracking-tighter mb-8'>
                    Sector <span className='text-cyan-400'>Dominance</span>
                  </h3>
                  <div className='h-[400px] w-full'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={[
                          {
                            name: 'Organization',
                            value: insights?.sectorBreakdown?.organization || 0,
                          },
                          { name: 'Private', value: insights?.sectorBreakdown?.private || 0 },
                        ]}
                      >
                        <XAxis dataKey='name' hide />
                        <YAxis hide />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          content={({ active, payload }) => {
                            if (active && payload?.[0]) {
                              return (
                                <div className='bg-[#0c1016]/90 border border-white/10 p-4 rounded-3xl backdrop-blur-xl'>
                                  <p className='text-[10px] font-black text-white/40 uppercase tracking-widest mb-1'>
                                    {payload[0].payload.name}
                                  </p>
                                  <p className='text-2xl font-black text-cyan-400 italic'>
                                    {payload[0].value} Rooms
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey='value'
                          radius={[20, 20, 20, 20]}
                          barSize={80}
                          minPointSize={10}
                        >
                          {[
                            {
                              name: 'Organization',
                              value: insights?.sectorBreakdown?.organization || 0,
                            },
                            { name: 'Private', value: insights?.sectorBreakdown?.private || 0 },
                          ].map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? '#a855f7' : '#06b6d4'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className='flex justify-center gap-12 mt-8 font-black uppercase italic tracking-tighter'>
                    <div className='flex items-center gap-3'>
                      <div className='w-3 h-3 rounded-full bg-purple-500' />{' '}
                      <span>Organization</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <div className='w-3 h-3 rounded-full bg-cyan-500' /> <span>Private</span>
                    </div>
                  </div>
                </div>

                <div className='space-y-8'>
                  <div className='bg-[#0c1016]/40 border border-white/5 rounded-[40px] p-10 flex flex-col justify-center'>
                    <div className='flex items-center gap-4 mb-8'>
                      <div className='w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/10'>
                        <Target size={24} />
                      </div>
                      <h3 className='text-2xl font-black uppercase tracking-tighter italic'>
                        Creation Analytics
                      </h3>
                    </div>
                    <div className='grid grid-cols-2 gap-6'>
                      <div className='bg-white/5 p-6 rounded-3xl border border-white/5'>
                        <p className='text-[10px] font-black text-white/20 uppercase tracking-widest mb-2'>
                          Rooms Created
                        </p>
                        <p className='text-4xl font-black italic'>{insights?.roomsCreated || 0}</p>
                      </div>
                      <div className='bg-white/5 p-6 rounded-3xl border border-white/5'>
                        <p className='text-[10px] font-black text-white/20 uppercase tracking-widest mb-2'>
                          Creation Rank
                        </p>
                        <p className='text-2xl font-black italic uppercase text-cyan-400'>
                          {insights?.rank.split(' ')[0]}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='bg-[#0c1016]/40 border border-white/5 rounded-[40px] p-10'>
                    <h4 className='text-sm font-black uppercase text-white/30 tracking-[0.2em] mb-8 italic'>
                      Sector Distribution Summary
                    </h4>
                    <div className='space-y-8'>
                      <p className='text-lg font-bold text-white/60 leading-relaxed uppercase italic tracking-tight font-black'>
                        {(insights?.sectorBreakdown?.organization || 0) +
                          (insights?.sectorBreakdown?.private || 0) >
                        0 ? (
                          <>
                            Your signature predominantly operates within{' '}
                            <span className='text-cyan-400'>
                              {(insights?.sectorBreakdown?.organization || 0) >
                              (insights?.sectorBreakdown?.private || 0)
                                ? 'ORGANIZATION'
                                : 'PRIVATE'}
                            </span>{' '}
                            clusters, which account for{' '}
                            <span className='text-white'>
                              {(
                                (Math.max(
                                  insights?.sectorBreakdown?.organization || 0,
                                  insights?.sectorBreakdown?.private || 0
                                ) /
                                  ((insights?.sectorBreakdown?.organization || 0) +
                                    (insights?.sectorBreakdown?.private || 0))) *
                                100
                              ).toFixed(1)}
                              %
                            </span>{' '}
                            of your total signal footprint.
                          </>
                        ) : (
                          'No significant sector dominance detected in recent neural cycles.'
                        )}
                      </p>
                      <div className='p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-6 relative overflow-hidden group/heur'>
                        <div className='absolute inset-0 bg-cyan-500/5 opacity-0 group-hover/heur:opacity-100 transition-opacity' />
                        <div
                          className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all duration-1000 ${
                            loading
                              ? 'border-cyan-500 border-t-transparent animate-spin'
                              : 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                          }`}
                        >
                          {loading ? null : <Check size={24} className='text-cyan-400' />}
                        </div>
                        <div className='relative z-10'>
                          <p className='text-xs font-black text-white italic uppercase tracking-wider'>
                            {loading
                              ? 'Analyzing Network Tendencies...'
                              : 'Heuristic Analysis Complete'}
                          </p>
                          <p className='text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1'>
                            {loading
                              ? 'Mapping neural sector signatures...'
                              : 'Heuristic analysis suggests a high collaborative affinity.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              key='activity'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='space-y-12'
            >
              <div className='bg-[#0c1016]/60 backdrop-blur-3xl border border-white/10 rounded-[48px] p-6 md:p-12 shadow-2xl'>
                <div className='flex items-center gap-4 mb-12'>
                  <div className='w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]'>
                    <Activity size={28} />
                  </div>
                  <div>
                    <h3 className='text-3xl font-black italic uppercase tracking-tighter text-white'>
                      Neural <span className='text-cyan-400'>Timeline</span>
                    </h3>
                    <p className='text-xs font-bold text-white/30 uppercase tracking-widest mt-1'>
                      Chronological flow of your actions
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className='flex justify-center p-20'>
                    <RefreshCw className='animate-spin text-cyan-500 size-12 opacity-50' />
                  </div>
                ) : activities.length > 0 ? (
                  <div className='space-y-6 relative before:absolute before:inset-0 before:ml-7 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/5 before:to-transparent'>
                    {activities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className='relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active'
                      >
                        <div className='flex items-center justify-center w-14 h-14 rounded-full border border-white/10 bg-[#0c1016] text-white/40 shadow-2xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all z-10'>
                          {activity.type === 'room' ? (
                            <Globe size={18} />
                          ) : activity.type === 'social' ? (
                            <Users size={18} />
                          ) : (
                            <Zap size={18} />
                          )}
                        </div>

                        <div className='w-[calc(100%-4.5rem)] md:w-[calc(50%-3rem)] p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 group-hover:border-cyan-500/20 transition-all shadow-xl backdrop-blur-sm'>
                          <div className='flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3'>
                            <span className='text-[10px] font-black uppercase text-cyan-400 tracking-widest bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 w-fit'>
                              {activity.title}
                            </span>
                            <span className='text-[10px] font-bold text-white/20 uppercase tracking-widest'>
                              {new Date(activity.time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              • {new Date(activity.time).toLocaleDateString()}
                            </span>
                          </div>
                          <p className='text-sm font-black text-white/70 italic uppercase tracking-tight'>
                            {activity.subtitle}
                          </p>
                          {activity.duration && (
                            <div className='mt-4 pt-4 border-t border-white/5'>
                              <p className='text-[10px] font-mono text-white/30'>
                                DURATION:{' '}
                                <span className='text-cyan-400/80 font-bold'>
                                  {(activity.duration / 60).toFixed(1)} MIN
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-20 border border-dashed border-white/5 rounded-[40px]'>
                    <p className='text-xl text-white/20 font-black uppercase italic tracking-[0.2em]'>
                      No neural activity detected.
                    </p>
                    <p className='text-xs text-white/10 uppercase tracking-widest mt-4'>
                      Your footprint is currently clean.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'signals' && (
            <motion.div
              key='signals'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='space-y-12'
            >
              {/* History Search and Filter */}
              <div className='flex flex-col md:flex-row gap-6 items-center justify-between'>
                <div className='relative w-full md:w-96 group'>
                  <Search
                    className='absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-cyan-400 transition-colors'
                    size={20}
                  />
                  <input
                    type='text'
                    placeholder='SEARCH SIGNAL ID OR NAME...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full bg-[#0c1016] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-black uppercase tracking-widest focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10'
                  />
                </div>
                <div className='flex gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-none'>
                  {(['all', 'organization', 'private'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        filterType === type
                          ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* History Grid */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {loading ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className='h-48 bg-white/5 rounded-[40px] animate-pulse' />
                  ))
                ) : filteredHistory.length > 0 ? (
                  filteredHistory.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className='group bg-[#0c1016]/40 backdrop-blur-3xl border border-white/5 rounded-[44px] p-8 hover:border-cyan-500/40 transition-all cursor-default relative overflow-hidden flex flex-col justify-between h-56'
                    >
                      <div className='absolute top-0 right-0 p-6'>
                        <div
                          className={`w-3 h-3 rounded-full ${item.isActive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-white/10'} transition-all`}
                        />
                      </div>

                      <div className='relative z-10'>
                        <div className='flex items-center gap-4 mb-4'>
                          <div
                            className={`p-3 rounded-xl ${item.type === 'organization' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}
                          >
                            {item.type === 'organization' ? (
                              <Globe size={20} />
                            ) : (
                              <Lock size={20} />
                            )}
                          </div>
                          <span className='text-[10px] font-black uppercase tracking-widest text-white/30'>
                            {item.type}
                          </span>
                        </div>
                        <h3 className='text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-cyan-400 transition-colors truncate max-w-[80%]'>
                          {item.name}
                        </h3>
                      </div>

                      <div className='flex items-center justify-between pt-6 border-t border-white/5 mt-6'>
                        <div className='flex items-center gap-2'>
                          <Users size={14} className='text-white/20' />
                          <span className='text-[10px] font-black uppercase text-white/40 tracking-widest'>
                            {item.participantCount || 0} Agents
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className='col-span-full h-96 flex flex-col items-center justify-center bg-white/[0.01] border border-dashed border-white/10 rounded-[60px] opacity-40'>
                    <RefreshCw size={64} className='mb-8 animate-spin-slow' />
                    <p className='text-xl font-black uppercase italic tracking-[0.3em]'>
                      System Standby: Zero Signals Found
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PurgeConfirmModal
        isOpen={purgeModalOpen}
        onClose={() => setPurgeModalOpen(false)}
        onConfirm={confirmPurge}
        loading={isPurging}
      />
    </div>
  );
};

export default AIAnalyticsPage;
