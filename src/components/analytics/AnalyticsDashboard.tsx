import { useState, useEffect } from 'react';
import { AnalyticsService, EloHistoryPoint } from '@/services/AnalyticsService';
import { RoomAnalyticsService, RoomAnalytics } from '@/services/RoomAnalyticsService';
import { useAuth } from '@/hooks/useAuth';
// import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
    History, 
    PlayCircle, 
    Target, 
    Zap, 
    Activity,
    Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface AnalyticsMatch {
    id?: string;
    gameType?: string;
    winnerId?: string;
    players?: { id: string; username: string }[];
}

export const AnalyticsDashboard = () => {
    const { user } = useAuth();
    // const { recentRooms } = useWebSocket(); // Unused
    const [eloHistory, setEloHistory] = useState<EloHistoryPoint[]>([]);
    const [recentMatches, setRecentMatches] = useState<AnalyticsMatch[]>([]);
    const [analytics, setAnalytics] = useState<RoomAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            setLoading(true);
            
            // Fetch all analytics data
            const [history, matches, analyticsData] = await Promise.all([
                AnalyticsService.getEloHistory(user.id, 'chess'),
                AnalyticsService.getRecentMatches(user.id),
                RoomAnalyticsService.getAllAnalytics(user.id)
            ]);
            
            setEloHistory(history);
            setRecentMatches(matches);
            setAnalytics(analyticsData);
            setLoading(false);
        };
        load();

        // Auto-refresh every 30 seconds
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [user]);

    // Removed external loadData to fix dependency warning

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { matchId: string } }[]; label?: string }) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-[#0c1016]/90 border border-emerald-500/30 p-3 rounded-xl backdrop-blur-xl shadow-2xl">
              <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">{label || 'Match ' + payload[0].payload.matchId}</p>
              <p className="text-white font-black text-lg">
                {payload[0].value} <span className="text-emerald-500/50 text-xs font-normal">ELO</span>
              </p>
            </div>
          );
        }
        return null;
    };

    return (
        <div className="w-full flex-1 min-h-[600px] text-white animate-in fade-in duration-500">
            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { 
                        label: 'Total Rooms Created', 
                        value: loading ? '...' : (analytics?.totalRoomsCreated || 0).toString(), 
                        icon: Target, 
                        color: 'text-cyan-500', 
                        bg: 'bg-cyan-500/10', 
                        border: 'border-cyan-500/20' 
                    },
                    { 
                        label: 'Total Time Spent', 
                        value: loading ? '...' : RoomAnalyticsService.formatDuration(analytics?.totalTimeSpentSeconds || 0), 
                        icon: Clock, 
                        color: 'text-emerald-500', 
                        bg: 'bg-emerald-500/10', 
                        border: 'border-emerald-500/20' 
                    },
                    { 
                        label: 'Time in Ultra', 
                        value: loading ? '...' : RoomAnalyticsService.formatDuration(analytics?.ultraModeTimeSeconds || 0), 
                        icon: Zap, 
                        color: 'text-purple-500', 
                        bg: 'bg-purple-500/10', 
                        border: 'border-purple-500/20' 
                    },
                ].map((stat, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`relative group overflow-hidden bg-white/5 border ${stat.border} p-4 rounded-2xl md:min-h-[120px] flex flex-col justify-between`}
                    >   
                        <div className={`absolute top-0 right-0 p-4 opacity-20 ${stat.color} group-hover:opacity-40 group-hover:scale-110 transition-all duration-500`}>
                            <stat.icon className="w-12 h-12" />
                        </div>
                        <div className="relative z-10">
                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2 mb-2 ${stat.color}`}>
                                <stat.icon className="w-3 h-3" /> {stat.label}
                            </p>
                            <h3 className="text-2xl md:text-4xl font-black tracking-tighter text-white">{stat.value}</h3>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '70%' }}
                                transition={{ delay: 0.5 + (idx * 0.1), duration: 1 }}
                                className={`h-full ${stat.color.replace('text-', 'bg-')}`} 
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Main Chart Area */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="col-span-1 lg:col-span-2 relative group"
                >
                    <div className="absolute inset-0 bg-emerald-500/5 blur-[50px] rounded-full opacity-20" />
                    <div className="relative h-full bg-[#0c1016]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col min-h-[450px]">
                        <div className="flex items-center justify-between mb-8">
                             <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <Activity className="w-6 h-6 text-emerald-500" />
                                    Performance Matrix
                                </h3>
                                <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">Chess ELO Progression • Last 30 Days</p>
                             </div>
                             <div className="flex gap-2">
                                {['1W', '1M', '3M', 'ALL'].map(period => (
                                    <button key={period} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${period === '1M' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                                        {period}
                                    </button>
                                ))}
                             </div>
                        </div>

                        <div className="flex-1 w-full min-h-[300px]">
                             {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                             ) : eloHistory.length > 0 ? (
                                 <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={eloHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={['auto', 'auto']} stroke="#ffffff20" tick={{fill: '#ffffff40', fontSize: 10}} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Area 
                                            type="monotone" 
                                            dataKey="elo" 
                                            stroke="#10b981" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorElo)" 
                                        />
                                    </AreaChart>
                                 </ResponsiveContainer>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
                                     <Activity className="w-12 h-12 mb-4 opacity-20" />
                                     <p className="font-bold uppercase tracking-widest text-sm">No Signal Detected</p>
                                     <p className="text-xs mt-2">Engage in ranked matches to generate data.</p>
                                 </div>
                             )}
                        </div>
                    </div>
                </motion.div>

                {/* Match History List */}
                <motion.div 
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.3 }}
                     className="bg-[#0c1016]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 lg:h-full flex flex-col"
                >
                    <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2 px-2">
                        <History className="w-4 h-4 text-indigo-400" /> Operational Log
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 max-h-[400px] lg:max-h-none">
                        {recentMatches.map((match, i) => (
                            <motion.div 
                                key={match.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + (i * 0.05) }}
                                className="group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-10 rounded-full ${match.winnerId === user?.id ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{match.gameType}</span>
                                            <span className="text-[10px] text-white/20">•</span>
                                            <span className="text-[10px] text-white/30">2m ago</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black uppercase ${match.winnerId === user?.id ? "text-emerald-400" : "text-red-400"}`}>
                                                {match.winnerId === user?.id ? "VICTORY" : "DEFEAT"}
                                            </span>
                                            <span className={`text-sm font-black uppercase ${match.winnerId === user?.id ? "text-emerald-400" : "text-red-400"}`}>
                                                {match.winnerId === user?.id ? "VICTORY" : "DEFEAT"}
                                            </span>
                                            <span className="text-white/40 text-xs font-bold">vs {match.players?.find((p) => p.id !== user?.id)?.username || 'Opponent'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-full">
                                        <PlayCircle className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                        {recentMatches.length === 0 && (
                            <p className="text-center text-white/20 text-xs py-8 font-bold uppercase tracking-widest">No recent operations.</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
