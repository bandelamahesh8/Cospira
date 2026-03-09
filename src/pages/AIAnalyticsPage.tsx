import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock, Shield, Zap, Users, History, Target, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const AIAnalyticsPage = () => {
  const { user } = useAuth();
  const { isConnected, socket } = useWebSocket();
  interface HistoryItem {
    id: string;
    name: string;
    role: string;
    participantCount: number;
    isActive: boolean;
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
  }

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real data on mount
  useEffect(() => {
    if (!socket || !isConnected) return;

    setLoading(true);

    // Batch fetch historical data and AI insights
    socket.emit(
      'get-user-history',
      { userId: user?.id },
      (res: { success: boolean; history?: HistoryItem[] }) => {
        if (res.success && res.history) {
          setHistory(res.history);
        }
      }
    );

    socket.emit('get-user-ai-insights', (res: { success: boolean; insights?: AIInsights }) => {
      if (res.success && res.insights) {
        setInsights(res.insights);
      }
      setLoading(false);
    });
  }, [socket, isConnected, user]);

  const userStats = [
    {
      label: 'Sectors Controlled',
      value: (insights?.roomsCreated || 0).toString(),
      icon: Target,
      color: 'cyan',
      trend: `Rank: ${insights?.roomsCreated && insights.roomsCreated > 10 ? 'Alpha' : 'Beta'}`,
    },
    {
      label: 'Signal Stability',
      value: `${insights?.peakStability || 0}%`,
      icon: Shield,
      color: 'emerald',
      trend: isConnected ? 'Locked' : 'Fluctuating',
    },
    {
      label: 'Neural Depth',
      value: `${insights?.totalTimeSpentMinutes || 0}m`,
      icon: Clock,
      color: 'purple',
      trend: 'Sync Time',
    },
    {
      label: 'Network Pulse',
      value: `${insights?.totalMessages || 0}`,
      icon: Zap,
      color: 'orange',
      trend: 'Activities',
    },
  ];

  const recentHistory = history.slice(0, 5).map((item) => ({
    name: item.name,
    id: item.id,
    users: item.participantCount || 0,
    type: item.role === 'host' ? 'Hosted' : 'Joined',
    status: item.isActive ? 'Active' : 'Archived',
  }));

  const ChartTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { value: number; payload: { date: string } }[];
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-[#0c1016] border border-cyan-500/20 px-3 py-2 rounded-xl backdrop-blur-xl shadow-2xl'>
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
    <div className='flex-1 min-h-full bg-[#05070a] text-white overflow-y-auto custom-scrollbar'>
      <div className='w-full px-4 md:px-10 lg:px-12 py-8 md:py-12 space-y-12 max-w-[1600px] mx-auto pb-32'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex flex-col md:flex-row md:items-end justify-between gap-6'
        >
          <div>
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-px w-12 bg-gradient-to-r from-cyan-500 to-transparent' />
              <span className='text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400'>
                Personal Intelligence
              </span>
            </div>
            <h1 className='text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9] italic uppercase mb-4'>
              User <span className='text-cyan-400'>Signal</span>
            </h1>
            <p className='text-lg text-white/40 font-medium max-w-2xl leading-relaxed uppercase tracking-tight text-sm'>
              Neural activity analysis for{' '}
              <span className='text-white font-black italic'>
                {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
              </span>
              . Syncing personal signatures with the global index.
            </p>
          </div>

          <div className='flex items-center gap-4 px-6 py-4 bg-white/[0.03] border border-white/5 rounded-3xl backdrop-blur-xl'>
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
            />
            <span className='text-[10px] font-black uppercase tracking-widest text-white/60'>
              {isConnected ? 'Uplink Synchronized' : 'Uplink Severed'}
            </span>
          </div>
        </motion.div>

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
              <div className='relative bg-[#0c1016]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-10 hover:border-cyan-500/30 transition-all hover:-translate-y-1 overflow-hidden'>
                <div className='absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -translate-y-16 translate-x-16 group-hover:bg-cyan-500/10 transition-all' />

                <div className='flex items-start justify-between mb-8'>
                  <div
                    className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform border border-white/5`}
                  >
                    <stat.icon size={28} />
                  </div>
                  <div
                    className={`text-[10px] font-black px-3 py-1.5 rounded-xl bg-white/5 text-white/40 border border-white/5 uppercase tracking-widest`}
                  >
                    {stat.trend}
                  </div>
                </div>
                <p className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-2'>
                  {stat.label}
                </p>
                <p className='text-4xl font-black text-white tracking-tighter italic uppercase leading-none'>
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Activity pulse chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className='bg-[#0c1016]/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 md:p-10 relative overflow-hidden h-[300px]'
        >
          <div className='absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] -translate-y-32 translate-x-32' />
          <div className='flex items-center justify-between mb-8 relative z-10'>
            <div className='flex items-center gap-3'>
              <Activity size={20} className='text-cyan-400' />
              <h3 className='text-xl font-black uppercase tracking-tighter italic'>
                Neural Activity Pulse
              </h3>
            </div>
            <div className='flex gap-2'>
              {['7 Days', 'Live'].map((label) => (
                <span
                  key={label}
                  className='text-[9px] font-black px-3 py-1 bg-white/5 border border-white/5 rounded-full uppercase text-white/40 tracking-widest'
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className='h-[180px] w-full relative z-10'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart
                data={insights?.activityPulse || []}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id='colorPulse' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#06b6d4' stopOpacity={0.2} />
                    <stop offset='95%' stopColor='#06b6d4' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey='date' hide />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type='monotone'
                  dataKey='value'
                  stroke='#06b6d4'
                  strokeWidth={3}
                  fillOpacity={1}
                  fill='url(#colorPulse)'
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Main Analysis Area */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-12'>
          {/* Detailed Activity Logs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className='lg:col-span-8 bg-[#0c1016]/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-10 md:p-12 shadow-2xl relative overflow-hidden'
          >
            <div className='absolute top-0 left-0 w-64 h-64 bg-cyan-500/5 blur-[100px] -translate-y-32 -translate-x-32' />

            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-6 border-b border-white/5'>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400'>
                  <History className='w-6 h-6' />
                </div>
                <h2 className='text-3xl font-black text-white italic uppercase tracking-tighter'>
                  Recent <span className='text-white/20'>Synchronizations</span>
                </h2>
              </div>
            </div>

            <div className='space-y-4'>
              {loading ? (
                <div className='space-y-4'>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className='h-24 bg-white/5 animate-pulse rounded-[28px]' />
                  ))}
                </div>
              ) : recentHistory.length > 0 ? (
                recentHistory.map((room, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-[28px] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all group overflow-hidden relative'
                  >
                    <div className='flex items-center gap-6 relative z-10'>
                      <div className='w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-cyan-400 transition-colors shadow-xl'>
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className='text-2xl font-black text-white uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors'>
                          {room.name || 'Secure Sector'}
                        </h3>
                        <div className='flex items-center gap-3 mt-1 opacity-40'>
                          <span className='text-[10px] font-mono font-bold uppercase tracking-widest'>
                            ID: {room.id.substring(0, 12)}
                          </span>
                          <div className='w-1 h-1 rounded-full bg-white/30' />
                          <span className='text-[10px] font-black uppercase tracking-widest'>
                            {room.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className='text-right relative z-10'>
                      <div className='text-base font-black text-white/60 tracking-tighter italic uppercase'>
                        {room.users} Agents
                      </div>
                      <div
                        className={`text-[10px] font-bold ${room.status === 'Active' ? 'text-emerald-400' : 'text-white/20'} uppercase tracking-[0.2em] mt-1`}
                      >
                        {room.status}
                      </div>
                    </div>
                    <div className='absolute right-0 top-0 h-full w-1 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-all' />
                  </div>
                ))
              ) : (
                <div className='h-64 flex flex-col items-center justify-center text-white/20 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]'>
                  <History size={48} className='mb-6 opacity-20' />
                  <p className='text-xs font-black uppercase tracking-[0.3em]'>
                    Zero Activity Signatures Detected
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Neural Projection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className='lg:col-span-4 bg-cyan-500/[0.03] backdrop-blur-xl border border-cyan-500/10 rounded-[40px] p-10 md:p-12 h-fit'
          >
            <div className='flex items-center gap-4 mb-12'>
              <div className='w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400'>
                <Brain className='w-6 h-6' />
              </div>
              <h2 className='text-3xl font-black text-white italic uppercase tracking-tighter'>
                Cognitive <span className='text-white/20'>Load</span>
              </h2>
            </div>

            <div className='space-y-12'>
              <div className='space-y-4'>
                <div className='flex justify-between text-[11px] font-black uppercase tracking-[0.2em] text-white/40'>
                  <span>Creation Velocity</span>
                  <span className='text-cyan-400 italic'>
                    {Math.min((insights?.roomsCreated || 0) * 10, 100).toFixed(0)}%
                  </span>
                </div>
                <div className='h-3 bg-white/5 rounded-full overflow-hidden p-0.5'>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((insights?.roomsCreated || 0) * 10, 100)}%` }}
                    className='h-full bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </div>
                <p className='text-[9px] font-bold text-white/20 uppercase tracking-widest italic text-right'>
                  {(insights?.roomsCreated || 0) > 5 ? 'High Output' : 'Nominal Output'}
                </p>
              </div>

              <div className='space-y-4'>
                <div className='flex justify-between text-[11px] font-black uppercase tracking-[0.2em] text-white/40'>
                  <span>Network Retention</span>
                  <span className='text-emerald-400 italic'>
                    {Math.min((insights?.averageSessionDuration || 0) * 2, 98)}%
                  </span>
                </div>
                <div className='h-3 bg-white/5 rounded-full overflow-hidden p-0.5'>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min((insights?.averageSessionDuration || 0) * 2, 98)}%`,
                    }}
                    className='h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
                <p className='text-[9px] font-bold text-white/20 uppercase tracking-widest italic text-right'>
                  Session Persistence
                </p>
              </div>

              <div className='p-8 rounded-[32px] bg-white/[0.03] border border-white/5 border-dashed relative overflow-hidden group'>
                <div className='absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity' />
                <p className='text-xs font-black text-white/30 uppercase tracking-[0.15em] italic leading-relaxed relative z-10'>
                  Neural signature validated across{' '}
                  <span className='text-white'>{insights?.roomsCreated || 0}</span> secure sectors.
                  Average pulse recorded at{' '}
                  <span className='text-cyan-400'>{insights?.averageSessionDuration || 0}m</span>{' '}
                  engagement. Status:{' '}
                  <span className='text-white'>
                    {(insights?.totalTimeSpentMinutes || 0) > 60
                      ? 'Master Architect'
                      : 'Strategic Operative'}
                  </span>
                  .
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalyticsPage;
