import { useState, useEffect } from 'react';
import { MetaService, MetaPlayer } from '@/services/MetaService';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Swords, TrendingUp } from 'lucide-react';

export const MetaLeaderboard = () => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<MetaPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await MetaService.getTopPlayers(50);
      setPlayers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className='p-8 text-white'>Loading Meta Rankings...</div>;

  return (
    <div className='p-8 max-w-5xl mx-auto text-white'>
      <h1 className='text-4xl font-bold mb-2 flex items-center gap-3'>
        <Crown className='text-yellow-500 w-8 h-8' />
        Global Meta Rankings
      </h1>
      <p className='text-slate-400 mb-8'>
        The Elite Cospira Players. Ranked by Overall Skill Score (OSS).
      </p>

      <div className='space-y-2'>
        {/* Header */}
        <div className='flex items-center p-4 text-sm text-slate-500 font-bold uppercase tracking-wider'>
          <div className='w-16 text-center'>Rank</div>
          <div className='flex-1'>Player</div>
          <div className='w-32 text-center'>OSS</div>
          <div className='w-32 text-center hidden md:block'>Chess ELO</div>
          <div className='w-32 text-center hidden md:block'>Wins</div>
        </div>

        {/* List */}
        {players.map((p, index) => {
          const isMe = user?.id === p.id;
          const rank = index + 1;

          let rankColor = 'text-slate-400';
          if (rank === 1) rankColor = 'text-yellow-400';
          if (rank === 2) rankColor = 'text-slate-300';
          if (rank === 3) rankColor = 'text-amber-600';

          return (
            <Card
              key={p.id}
              className={`p-4 flex items-center border-0 ${isMe ? 'bg-indigo-900/40 ring-1 ring-indigo-500' : 'bg-slate-900/50'} hover:bg-slate-800 transition-colors`}
            >
              <div className={`w-16 text-center font-bold text-xl ${rankColor}`}>#{rank}</div>

              <div className='flex-1 flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700'>
                  <img
                    src={
                      p.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`
                    }
                    className='w-full h-full object-cover'
                  />
                </div>
                <div>
                  <div className='font-bold text-white flex items-center gap-2'>
                    {p.username || 'Unknown'}
                    {rank === 1 && <Crown className='w-3 h-3 text-yellow-500' />}
                  </div>
                  <div className='text-xs text-slate-500 flex gap-2'>
                    <span>User ID: {p.id.substring(0, 6)}...</span>
                  </div>
                </div>
              </div>

              <div className='w-32 text-center'>
                <Badge
                  variant='outline'
                  className='bg-slate-800 border-indigo-500 text-indigo-400 font-bold text-lg px-3 py-1'
                >
                  {p.oss}
                </Badge>
              </div>

              <div className='w-32 text-center hidden md:block text-slate-400 font-mono'>
                {p.chess_elo}
              </div>

              <div className='w-32 text-center hidden md:block text-slate-400 font-mono'>
                {p.total_wins}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
