import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ExternalLink, Activity, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { formatActivityTimestamp } from '@/utils/activityHelpers';
import { NeuralInformer } from '@/components/intelligence';

interface HistoryItem {
  id: string;
  name: string;
  isActive: boolean;
  joinedAt?: string | number;
  lastActive?: string | number;
}

interface RecentRoomsCardProps {
  title?: string;
  subtitle?: string;
  filterType?: 'private' | 'organization';
}

export const RecentRoomsCard = ({
  title = 'Recent Rooms',
  subtitle = 'Your Active & Past Sessions',
  filterType,
}: RecentRoomsCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket, isConnected } = useWebSocket();
  const [recentRooms, setRecentRooms] = useState<
    { name: string; time: string; status: 'active' | 'expired'; id: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [limit, setLimit] = useState(5);

  const fetchData = useCallback(() => {
    if (!socket || !isConnected) return;
    const effectiveUserId = user?.id || socket.id;
    if (!effectiveUserId) return;

    setIsLoading(true);
    socket.emit(
      'get-user-history',
      { userId: effectiveUserId, limit: Math.max(limit, 10), filterType },
      (res: { success: boolean; history?: HistoryItem[] }) => {
        setIsLoading(false);
        if (res.success && res.history) {
          const mapped = res.history.slice(0, limit).map((item) => ({
            id: item.id,
            name: item.name || 'Unnamed Room',
            time: formatActivityTimestamp(new Date(item.joinedAt || item.lastActive || Date.now())),
            status: item.isActive ? 'active' : ('expired' as 'active' | 'expired'),
          }));
          setRecentRooms(mapped);
        }
      }
    );
  }, [socket, isConnected, user?.id, limit, filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUpdate = () => {
      fetchData();
    };

    socket.on('neural-signal-update', handleUpdate);
    socket.on('history-cleared', () => setRecentRooms([]));

    return () => {
      socket.off('neural-signal-update', handleUpdate);
      socket.off('history-cleared');
    };
  }, [socket, isConnected, fetchData]);

  return (
    <div className='bg-[#0F1116] border border-white/5 rounded-[24px] p-6 h-full flex flex-col relative overflow-hidden group/card'>
      {/* Background Glow */}
      <div className='absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-700' />

      <div className='flex items-center justify-between mb-6 relative z-10'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10'>
            <Clock className='w-5 h-5 text-indigo-400' />
          </div>
          <div>
            <h3 className='text-sm font-black text-white uppercase tracking-widest'>{title}</h3>
            <p className='text-[10px] text-zinc-500 uppercase tracking-wider font-bold'>
              {subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className='w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors'
        >
          {isMinimized ? (
            <ChevronDown className='w-5 h-5 text-white' />
          ) : (
            <ChevronUp className='w-5 h-5 text-white' />
          )}
        </button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out relative z-10 flex flex-col gap-3 ${isMinimized ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100 flex-1'}`}
      >
        {!isMinimized && (
          <>
            {isLoading ? (
              <div className='flex-1 flex flex-col items-center justify-center gap-4 py-8'>
                <div className='w-6 h-6 border-b-2 border-indigo-500 rounded-full animate-spin' />
                <span className='text-[10px] text-zinc-500 uppercase tracking-widest font-bold'>
                  Loading History...
                </span>
              </div>
            ) : recentRooms.length > 0 ? (
              <>
                <div className='flex flex-col gap-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2'>
                  {recentRooms.map((room) => (
                    <NeuralInformer
                      key={room.id}
                      title={`Join: ${room.name}`}
                      description={
                        room.status === 'active'
                          ? 'This room is currently active. Rejoin immediately.'
                          : 'This session has expired, but you can try reconnecting.'
                      }
                    >
                      <div
                        onClick={() => room.status === 'active' && navigate(`/room/${room.id}`)}
                        className={`w-full bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between transition-all group/item ${room.status === 'active' ? 'cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/5' : 'cursor-default opacity-60'}`}
                      >
                        <div className='flex items-center gap-4'>
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${room.status === 'active' ? 'bg-emerald-500/10' : 'bg-white/5'}`}
                          >
                            <Activity
                              className={`w-4 h-4 ${room.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}`}
                            />
                          </div>
                          <div className='flex flex-col'>
                            <span className='text-xs font-bold text-white group-hover/item:text-indigo-400 transition-colors uppercase tracking-wider'>
                              {room.name}
                            </span>
                            <span className='text-[10px] font-mono text-zinc-500'>{room.time}</span>
                          </div>
                        </div>

                        <div className='flex items-center gap-3'>
                          <div
                            className={`px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-widest ${room.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                          >
                            {room.status === 'active' ? 'Active' : 'Expired'}
                          </div>
                          {room.status === 'active' && (
                            <ExternalLink className='w-4 h-4 text-zinc-600 group-hover/item:text-indigo-400 transition-colors' />
                          )}
                        </div>
                      </div>
                    </NeuralInformer>
                  ))}
                </div>

                {/* Full History Toggle */}
                <button
                  onClick={() => {
                    setIsLoading(true);
                    setLimit((prev) => (prev === 5 ? 50 : 5));
                  }}
                  className='mt-2 w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition-colors border border-white/5 text-zinc-400 hover:text-white'
                >
                  <History className='w-4 h-4 text-indigo-400' />
                  <span className='text-[10px] font-black uppercase tracking-widest'>
                    {limit === 5 ? 'See Full History' : 'Show Less'}
                  </span>
                </button>
              </>
            ) : (
              <div className='flex-1 flex flex-col items-center justify-center text-center px-4 py-8 bg-black/20 rounded-xl border border-white/5 border-dashed'>
                <Clock className='w-8 h-8 text-zinc-700 mb-3' />
                <span className='text-xs font-bold text-zinc-500 uppercase tracking-widest'>
                  No History Found
                </span>
                <span className='text-[10px] text-zinc-600 mt-1 max-w-[200px] leading-relaxed'>
                  Your recent room connections will appear here.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
