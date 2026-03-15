import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Play,
  History,
  Zap,
  Archive,
  ArrowRight,
  Search,
  Filter,
  Activity as ActivityIcon,
  Clock,
  Shield,
} from 'lucide-react';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { ActivitySkeleton } from '@/components/activity/ActivitySkeleton';

import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Activity as ActivityType } from '@/types/activity';
import { groupActivitiesByDate } from '@/utils/activityHelpers';

const ActivityPage = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useWebSocket();
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Define types for history items
  interface HistoryItem {
    id: string;
    name: string;
    isActive: boolean;
    role: 'host' | 'participant' | 'co-host';
    joinedAt?: string | number;
    lastActive?: string | number;
    participantCount: number;
  }

  // Fetch real data on mount
  useEffect(() => {
    if (!socket || !isConnected) return;

    setLoading(true);
    socket.emit('get-user-history', { userId: user?.id }, (res: { success: boolean; history?: HistoryItem[] }) => {
      if (res.success && res.history) {
        const mappedActivities: ActivityType[] = res.history.map((item) => ({
          id: item.id,
          type: 'room',
          title: item.name,
          subtitle: item.isActive ? 'Active Session' : 'Past Session',
          action: item.role === 'host' ? 'Hosted Room' : 'Joined Room',
          timestamp: new Date(item.joinedAt || item.lastActive || Date.now()),
          duration: 0,
          participants: item.participantCount,
          role: item.role,
          roomId: item.id,
        }));

        mappedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(mappedActivities);
      }
      setLoading(false);
    });
  }, [socket, isConnected]);

  const groupedActivities = groupActivitiesByDate(activities);

  // Stats Logic
  const totalRooms = activities.length;
  // Mock avg duration since we don't have it in data yet
  const avgDuration = totalRooms > 0 ? '42m' : '0m';

  return (
    <div className='flex-1 min-h-full bg-[#05070a] text-white overflow-y-auto custom-scrollbar'>
      <div className='w-full px-4 md:px-10 lg:px-12 py-8 md:py-12 space-y-12 max-w-[1600px] mx-auto pb-32'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex flex-col xl:flex-row xl:items-end justify-between gap-8'
        >
          <div className='space-y-4'>
            <div className='inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full'>
              <History className='w-4 h-4 text-indigo-400' />
              <span className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200'>
                Neural Memory
              </span>
            </div>
            <h1 className='text-4xl md:text-7xl font-black tracking-tighter text-white italic uppercase leading-none'>
              Protocol <span className='text-white/20'>History</span>
            </h1>
            <p className='text-lg text-white/40 font-medium max-w-xl leading-relaxed uppercase tracking-tight text-sm'>
              A decentralized audit trail of every sector engagement and collaborative cycle.
            </p>
          </div>

          <div className='flex items-center gap-4'>
            <div className='px-6 py-4 bg-white/[0.03] border border-white/5 rounded-3xl backdrop-blur-xl flex flex-col items-center min-w-[140px]'>
              <span className='text-[9px] font-black uppercase tracking-widest text-white/20 leading-none mb-2'>
                Total Cycles
              </span>
              <span className='text-3xl font-black text-white italic tracking-tighter'>
                {totalRooms}
              </span>
            </div>
            <div className='px-6 py-4 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl backdrop-blur-xl flex flex-col items-center min-w-[140px]'>
              <span className='text-[9px] font-black uppercase tracking-widest text-indigo-400/50 leading-none mb-2'>
                Avg Depth
              </span>
              <span className='text-3xl font-black text-indigo-400 italic tracking-tighter'>
                {avgDuration}
              </span>
            </div>
          </div>
        </motion.div>

        <div className='grid grid-cols-1 xl:grid-cols-12 gap-12'>
          {/* LEFT COLUMN: ACTIVITY FEED */}
          <div className='xl:col-span-8 space-y-8'>
            <div className='flex items-center justify-between'>
              <h2 className='text-[11px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-3 ml-1'>
                <Archive className='w-4 h-4 text-white/20' /> Timeline Logs
              </h2>
              <div className='flex-1 h-px bg-white/5 mx-8' />
              <div className='flex items-center gap-4'>
                <button className='p-3 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-white transition-colors'>
                  <Filter size={14} />
                </button>
                <button className='p-3 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-white transition-colors'>
                  <Search size={14} />
                </button>
              </div>
            </div>

            {loading ? (
              <ActivitySkeleton />
            ) : Object.keys(groupedActivities).length > 0 ? (
              <div className='relative border-l border-white/5 ml-4 pl-12 space-y-16 py-4'>
                {Object.entries(groupedActivities).map(([group, groupActivities], i) => (
                  <motion.div
                    key={group}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className='relative'
                  >
                    {/* Date Label */}
                    <div className='absolute -left-[54px] top-0 flex items-center bg-[#05070a] py-2 border border-white/5 rounded-xl px-3 min-w-[80px] justify-center z-10 shadow-2xl'>
                      <span className='text-[10px] font-black text-white/40 uppercase tracking-widest'>
                        {group.split(',')[0]}
                      </span>
                    </div>

                    <div className='space-y-6 pt-2'>
                      {groupActivities.map((activity) => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          isLatest={i === 0 && groupActivities[0].id === activity.id}
                          onResumeRoom={(id) => navigate(`/room/${id}`)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className='text-center py-32 bg-[#0c1016]/40 backdrop-blur-xl rounded-[40px] border border-dashed border-white/5 flex flex-col items-center'>
                <div className='w-20 h-20 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center mb-8 border border-white/5 shadow-2xl'>
                  <Zap className='w-10 h-10 text-indigo-400' />
                </div>
                <h3 className='text-2xl font-black text-white italic uppercase tracking-tighter'>
                  Memory Bank Empty
                </h3>
                <p className='text-[10px] text-white/20 mt-2 font-black uppercase tracking-[0.2em] max-w-xs'>
                  No activity signatures detected in your neural history logs.
                </p>

                <button
                  onClick={() => navigate('/dashboard')}
                  className='mt-12 px-10 h-14 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-400 hover:text-white transition-all shadow-2xl'
                >
                  Initialize First Sector
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: QUICK COMMANDS */}
          <div className='xl:col-span-4 space-y-8'>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className='bg-[#0c1016]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 md:p-10 sticky top-12'
            >
              <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-8 flex items-center gap-3'>
                <ActivityIcon className='w-4 h-4 text-indigo-400' /> Rapid Engagement
              </h3>

              <div className='space-y-4'>
                <button
                  onClick={() => navigate('/dashboard')}
                  className='w-full h-16 rounded-[24px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-white font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-between px-8 group'
                >
                  <span className='flex items-center gap-4'>
                    <Plus className='w-5 h-5 text-indigo-400' /> Create New
                  </span>
                  <ArrowRight className='w-4 h-4 text-white/10 group-hover:text-white transition-colors' />
                </button>

                {activities.length > 0 && (
                  <button
                    onClick={() => navigate(`/room/${activities[0].roomId}`)}
                    className='w-full h-16 rounded-[24px] bg-indigo-500 text-white font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-between px-8 group shadow-2xl shadow-indigo-500/20'
                  >
                    <span className='flex items-center gap-4'>
                      <Play className='w-5 h-5' /> Resume Last
                    </span>
                    <div className='flex gap-1 group-hover:scale-125 transition-transform'>
                      <div className='w-1 h-1 rounded-full bg-white animate-pulse' />
                      <div className='w-1 h-1 rounded-full bg-white animate-pulse [animation-delay:200ms]' />
                      <div className='w-1 h-1 rounded-full bg-white animate-pulse [animation-delay:400ms]' />
                    </div>
                  </button>
                )}
              </div>

              <div className='mt-12 pt-12 border-t border-white/5 space-y-6'>
                <div className='flex items-center gap-4 opacity-50'>
                  <Clock size={16} className='text-indigo-400 font-bold' />
                  <div className='flex flex-col'>
                    <span className='text-[9px] font-black uppercase tracking-widest leading-none mb-1'>
                      Last Update
                    </span>
                    <span className='text-xs font-bold uppercase tracking-tight'>Just Now</span>
                  </div>
                </div>
                <div className='flex items-center gap-4 opacity-50'>
                  <Shield size={16} className='text-emerald-400 font-bold' />
                  <div className='flex flex-col'>
                    <span className='text-[9px] font-black uppercase tracking-widest leading-none mb-1'>
                      Archival Protocol
                    </span>
                    <span className='text-xs font-bold uppercase tracking-tight'>V4 Secure</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
