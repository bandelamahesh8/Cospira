import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGameStats } from '@/hooks/usePlayerProfile';
import { GameType } from '@/types/player';
import { Loader2, Trophy, Users, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MatchMode = 'ranked' | 'casual';

export function MatchmakingModal({ isOpen, onClose }: MatchmakingModalProps) {
  const [gameType, setGameType] = useState<GameType>('chess');
  const [mode, setMode] = useState<MatchMode>('ranked');
  const [isSearching, setIsSearching] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(30);

  const { socket } = useWebSocket();
  const { stats, loading: statsLoading } = useGameStats(gameType);

  const games = [
    { id: 'chess' as GameType, name: 'Chess', icon: '♟️', color: 'from-amber-500 to-orange-600' },
    { id: 'xoxo' as GameType, name: 'Tic-Tac-Toe', icon: '⭕', color: 'from-blue-500 to-cyan-600' },
    { id: 'ludo' as GameType, name: 'Ludo', icon: '🎲', color: 'from-green-500 to-emerald-600' },
    { id: 'snakeladder' as GameType, name: 'Snakes & Ladders', icon: '🐍', color: 'from-purple-500 to-pink-600' },
  ];

  const startSearch = () => {
    if (!socket) return;

    socket.emit('join-matchmaking', { gameType, mode });
    setIsSearching(true);
    setWaitTime(0);
  };

  const cancelSearch = () => {
    if (!socket) return;

    socket.emit('leave-matchmaking');
    setIsSearching(false);
    setWaitTime(0);
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('queue-joined', (data) => {
      setIsSearching(true);
      setEstimatedWait(data.estimatedWait || 30);
    });

    socket.on('match-found', (data) => {
      setIsSearching(false);
      // Navigate to game room
      window.location.href = `/room/${data.roomId}?game=${data.gameType}&mode=${data.mode}`;
    });

    socket.on('queue-left', () => {
      setIsSearching(false);
      setWaitTime(0);
    });

    socket.on('matchmaking-error', (data) => {
      console.error('Matchmaking error:', data.message);
      setIsSearching(false);
    });

    return () => {
      socket.off('queue-joined');
      socket.off('match-found');
      socket.off('queue-left');
      socket.off('matchmaking-error');
    };
  }, [socket]);

  // Timer
  useEffect(() => {
    if (!isSearching) return;

    const interval = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSearching]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-950 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-white">
            {isSearching ? '🔍 Finding Opponent...' : '🎮 Find Match'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!isSearching ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Game Selection */}
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                  Select Game
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {games.map((game) => (
                    <Card
                      key={game.id}
                      onClick={() => setGameType(game.id)}
                      className={cn(
                        'p-4 cursor-pointer transition-all border-2',
                        gameType === game.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('text-4xl bg-gradient-to-br p-3 rounded-xl', game.color)}>
                          {game.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{game.name}</h3>
                          {!statsLoading && stats && gameType === game.id && (
                            <p className="text-xs text-slate-400">ELO: {stats.elo}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                  Select Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    onClick={() => setMode('ranked')}
                    className={cn(
                      'p-6 cursor-pointer transition-all border-2',
                      mode === 'ranked'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Trophy className="w-8 h-8 text-amber-500" />
                      <h3 className="font-bold text-white">Ranked</h3>
                      <p className="text-xs text-slate-400 text-center">
                        Competitive • ELO-based matching
                      </p>
                      {stats && (
                        <div className="mt-2 px-3 py-1 bg-slate-800 rounded-full">
                          <span className="text-xs font-bold text-amber-400">
                            {stats.elo} ELO • {stats.rank}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card
                    onClick={() => setMode('casual')}
                    className={cn(
                      'p-6 cursor-pointer transition-all border-2',
                      mode === 'casual'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-blue-500" />
                      <h3 className="font-bold text-white">Casual</h3>
                      <p className="text-xs text-slate-400 text-center">
                        For fun • No ELO changes
                      </p>
                      <div className="mt-2 px-3 py-1 bg-slate-800 rounded-full">
                        <span className="text-xs font-bold text-blue-400">Quick Match</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Start Button */}
              <Button
                onClick={startSearch}
                disabled={!socket}
                className="w-full h-14 text-lg font-black bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Zap className="w-5 h-5 mr-2" />
                Find Match
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 space-y-8"
            >
              {/* Searching Animation */}
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-black text-white mb-2">
                    Searching for opponent...
                  </h3>
                  <p className="text-slate-400">
                    {mode === 'ranked' ? 'Finding player with similar ELO' : 'Finding any available player'}
                  </p>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-4 px-6 py-3 bg-slate-900 rounded-xl border border-slate-700">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase">Wait Time</p>
                    <p className="text-2xl font-mono font-bold text-white">{formatTime(waitTime)}</p>
                  </div>
                  <div className="w-px h-12 bg-slate-700" />
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase">Est. Wait</p>
                    <p className="text-2xl font-mono font-bold text-slate-400">
                      ~{estimatedWait}s
                    </p>
                  </div>
                </div>

                {/* Game Info */}
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-lg">
                  <span className="text-2xl">{games.find((g) => g.id === gameType)?.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {games.find((g) => g.id === gameType)?.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {mode === 'ranked' ? `${stats?.elo || 1000} ELO` : 'Casual Mode'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancel Button */}
              <Button
                onClick={cancelSearch}
                variant="outline"
                className="w-full h-12 border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Search
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
