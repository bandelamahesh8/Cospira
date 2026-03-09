import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, Rocket, Info, LogOut, Clock } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatActivityTimestamp } from '@/utils/activityHelpers';

export const ProfilePopup = ({ onViewActivity }: { onViewActivity?: () => void }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { socket, isConnected } = useWebSocket();
  const [recentRooms, setRecentRooms] = useState<
    { name: string; time: string; status: 'active' | 'expired'; id: string }[]
  >([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    interface HistoryItem {
      id: string;
      name: string;
      isActive: boolean;
      joinedAt?: string | number;
      lastActive?: string | number;
    }

    socket.emit(
      'get-user-history',
      { userId: user?.id },
      (res: { success: boolean; history?: HistoryItem[] }) => {
        if (res.success && res.history) {
          const mapped = res.history.slice(0, 3).map((item) => ({
            id: item.id,
            name: item.name || 'Unnamed Room',
            time: formatActivityTimestamp(new Date(item.joinedAt || item.lastActive || Date.now())),
            status: item.isActive ? 'active' : ('expired' as 'active' | 'expired'),
          }));
          setRecentRooms(mapped);
        }
      }
    );
  }, [socket, isConnected, user?.id]);

  const handleSignOut = () => {
    signOut();
    navigate('/auth');
  };

  return (
    <div className='w-[320px] p-1'>
      {/* Header: User Info */}
      <div className='bg-white/5 rounded-xl p-4 mb-4 flex items-center gap-4'>
        <div className='w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/10'>
          <img
            src={
              user?.user_metadata?.photo_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`
            }
            alt='Profile'
            className='w-full h-full object-cover'
          />
        </div>
        <div>
          <h3 className='text-white font-bold text-base'>
            {user?.user_metadata?.display_name || 'User'}
          </h3>
          <p className='text-white/40 text-xs'>{user?.email}</p>
        </div>
      </div>

      {/* Recent Rooms */}
      <div className='mb-6 space-y-3'>
        <h4 className='text-[10px] font-black uppercase tracking-widest text-white/30 px-1'>
          Recent Rooms
        </h4>

        {recentRooms.length > 0 ? (
          <div className='space-y-1'>
            {recentRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className='w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left'
              >
                <div className='flex flex-col gap-0.5'>
                  <span className='text-xs font-bold text-white/80 group-hover:text-white truncate max-w-[140px] italic'>
                    {room.name}
                  </span>
                  <div className='flex items-center gap-1.5'>
                    <Clock size={8} className='text-white/20' />
                    <span className='text-[9px] text-white/30'>{room.time}</span>
                  </div>
                </div>
                <span
                  className={`text-[8px] px-1.5 py-0.5 rounded-full border font-black uppercase tracking-tighter ${
                    room.status === 'active'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-white/5 border-white/5 text-white/30'
                  }`}
                >
                  {room.status === 'active' ? 'Live' : 'Closed'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className='text-center py-6 text-white/20 text-xs italic'>
            No recent sessions found
          </div>
        )}

        <button
          onClick={() => onViewActivity?.()}
          className='w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-white/60 hover:text-white transition-colors uppercase tracking-wider'
        >
          View All Activity
        </button>
      </div>

      {/* Privacy & Security */}
      <div className='mb-6 space-y-3'>
        <h4 className='text-[10px] font-black uppercase tracking-widest text-white/30 px-1'>
          Privacy & Security
        </h4>
        <div className='grid grid-cols-2 gap-3'>
          <div className='bg-white/5 rounded-xl p-3 border border-white/5'>
            <Shield className='w-4 h-4 text-emerald-400 mb-2' />
            <p className='text-[10px] text-white/40 mb-0.5'>Encryption</p>
            <p className='text-xs font-bold text-white'>Active (AES)</p>
          </div>
          <div className='bg-white/5 rounded-xl p-3 border border-white/5'>
            <Lock className='w-4 h-4 text-emerald-400 mb-2' />
            <p className='text-[10px] text-white/40 mb-0.5'>Session</p>
            <p className='text-xs font-bold text-white'>Verified</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className='space-y-1'>
        <button
          onClick={() => navigate('/upcoming')}
          className='w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center px-4 gap-3 transition-colors group'
        >
          <Rocket className='w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform' />
          <span className='text-sm font-medium text-white/80 group-hover:text-white'>
            Upcoming Features
          </span>
        </button>
        <button
          onClick={() => navigate('/about')}
          className='w-full h-10 rounded-xl hover:bg-white/5 flex items-center px-4 gap-3 transition-colors group'
        >
          <Info className='w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors' />
          <span className='text-sm font-medium text-white/40 group-hover:text-white/80'>
            About Cospira
          </span>
        </button>
        <button
          onClick={handleSignOut}
          className='w-full h-10 rounded-xl hover:bg-red-500/10 flex items-center px-4 gap-3 transition-colors group mt-2'
        >
          <LogOut className='w-4 h-4 text-white/40 group-hover:text-red-400 transition-colors' />
          <span className='text-sm font-black uppercase tracking-widest text-white/40 group-hover:text-red-400'>
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
};
