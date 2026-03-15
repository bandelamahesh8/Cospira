import { useState, useEffect } from 'react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User as UserIcon, X, Check, AlertTriangle, Users, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { FirstTimeFlags, hasSeenFirstTime, markFirstTimeSeen } from '@/utils/firstTimeHelpers';
import { GAME_MIN_ROOM_MEMBERS, getMaxOpponentSlots, type GameId } from './gameConfig';

// Import game posters
import chessP from '@/assets/chess_game_poster_1769337462731.png';
import ludoP from '@/assets/ludo_game_poster_1769337480481-D3yFmrZ9.png';
import connect4P from '@/assets/connect4_poster_1769337496441.png';
import tictactoeP from '@/assets/tictactoe_poster_1769337515157.png';
import kartP from '@/assets/kart_racing_poster.png';

export const GameHubModal = ({
  open,
  onOpenChange,
  isPrivate = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPrivate?: boolean;
}) => {
  const { users, startGame } = useWebSocket();
  const { user } = useAuth();
  const { playHover, playClick } = useSoundEffects();

  const memberCount = users.length;
  const hasMinMembers = memberCount >= GAME_MIN_ROOM_MEMBERS;

  // Internal state
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [selectedOpponents, setSelectedOpponents] = useState<string[]>([]);
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [isEstablishing, setIsEstablishing] = useState(false);

  // Categorization
  const availableGames = [
    {
      id: 'chess',
      name: 'Grand Chess',
      desc: 'The ultimate test of intellect',
      category: 'Strategy',
      available: true,
      color: '#D4AF37',
      featured: true,
      players: 1248,
      poster: chessP,
      tags: ['Competitive', 'Ranked'],
    },
    {
      id: 'ludo',
      name: 'Ludo Pro',
      desc: 'Strategic chance dominance',
      category: 'Multiplayer',
      available: true,
      color: '#10B981',
      featured: false,
      players: 892,
      poster: ludoP,
      tags: ['Casual', 'Social'],
    },
    {
      id: 'connect4',
      name: 'Connect Four',
      desc: 'Gravity-defying strategy',
      category: 'Strategy',
      available: true,
      color: '#3B82F6',
      featured: false,
      players: 654,
      poster: connect4P,
      tags: ['Arcade', 'Fast'],
    },
    {
      id: 'xoxo',
      name: 'Tic-Tac-Toe',
      desc: 'Cyberpunk tactical warfare',
      category: 'Casual',
      available: true,
      color: '#8B5CF6',
      featured: false,
      players: 423,
      poster: tictactoeP,
      tags: ['Arcade', 'Quick'],
    },
    {
      id: 'ultimate-xoxo',
      name: 'Ultimate XOXO',
      desc: '9 Boards. 1 Master Plan.',
      category: 'Strategy',
      available: true,
      color: '#F59E0B',
      featured: false,
      players: 234,
      poster: tictactoeP,
      tags: ['Hardcore', 'Brain'],
    },
    {
      id: 'snakeladder',
      name: 'Apex Serpents',
      desc: 'Ruthless climb to the top',
      category: 'Casual',
      available: true,
      color: '#EF4444',
      featured: false,
      players: 567,
      poster: ludoP,
      tags: ['Casual', 'Luck'],
    },
    {
      id: 'checkers',
      name: 'Checkers',
      desc: 'Kingdom capture tactics',
      category: 'Strategy',
      available: true,
      color: '#DC2626',
      featured: false,
      players: 345,
      poster: chessP,
      tags: ['Classic', 'Board'],
    },
    {
      id: 'kart-racing',
      name: 'Kart Racing',
      desc: 'High-speed multiplayer racing action',
      category: 'Arcade',
      available: true,
      color: '#f43f5e',
      featured: true,
      players: 2451,
      poster: kartP,
      tags: ['Multiplayer', 'Racing'],
    },
  ];

  const getCurrentGame = () => availableGames.find((g) => g.id === selectedGame);

  const handleStartGame = () => {
    if (!selectedGame) return;
    if (!hasMinMembers) {
      toast.error(`Minimum ${GAME_MIN_ROOM_MEMBERS} members required in the room to start a game.`);
      return;
    }
    const maxSlots = getMaxOpponentSlots(selectedGame);
    if (selectedOpponents.length === 0 || selectedOpponents.length > maxSlots) {
      toast.error(
        selectedOpponents.length === 0
          ? 'Select at least one opponent.'
          : `This game allows up to ${maxSlots} opponent${maxSlots === 1 ? '' : 's'}.`
      );
      return;
    }

    setIsEstablishing(true);
    setTimeout(() => {
      startGame(selectedGame, [user?.id || '', ...selectedOpponents], { teamMode: isTeamMode });
      onOpenChange(false);
      setSelectedGame(null);
      setSelectedOpponents([]);
      setIsTeamMode(false);
      setIsEstablishing(false);
    }, 1200);
  };

  // First time tooltip logic (kept minimal)
  useEffect(() => {
    if (open && !hasSeenFirstTime(FirstTimeFlags.COMBAT_STATIONS)) {
      markFirstTimeSeen(FirstTimeFlags.COMBAT_STATIONS); // Auto mark seen for now to avoid clutter
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[90vw] md:max-w-[1200px] h-[85vh] p-0 bg-[#05080f] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col focus:outline-none shadow-[0_50px_150px_rgba(0,0,0,0.8)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-300'>
        <DialogTitle className='sr-only'>Game Hub</DialogTitle>

        {/* MAIN SCROLL CONTENT */}
        <div className='flex-1 w-full h-full overflow-y-auto overflow-x-hidden pt-12 pb-24 custom-scrollbar bg-[#05080f]'>
          <div className='max-w-[1200px] mx-auto px-8 relative'>
            {/* Standalone Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className='absolute -top-4 right-0 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all z-50 text-white/40 hover:text-white'
            >
              <X size={24} />
            </button>

            <div className='flex items-center justify-between mb-8'>
              <h2 className='text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3'>
                <Zap className='w-8 h-8 text-yellow-400' />
                Arcade Center
              </h2>
              <div className='h-px flex-1 bg-white/10 ml-6' />
            </div>

            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
              {availableGames.map((game) => (
                <motion.div
                  key={game.id}
                  whileHover={{ y: -5, scale: 1.02 }}
                  onMouseEnter={() => playHover()}
                  onClick={() => {
                    playClick();
                    setSelectedGame(game.id as GameId);
                  }}
                  className='group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer bg-[#1a1f2e] border border-white/5 shadow-xl hover:shadow-2xl hover:border-white/20 transition-all'
                >
                  {/* Image Background */}
                  <div className='absolute inset-0'>
                    <img
                      src={game.poster}
                      alt={game.name}
                      className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 group-hover:opacity-80 transition-opacity' />
                  </div>

                  {/* Content Overlay */}
                  <div className='absolute inset-x-0 bottom-0 p-5 flex flex-col justify-end h-full'>
                    <div className='mb-auto flex justify-end'>
                      {game.id === 'chess' && (
                        <span className='px-2 py-1 rounded bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest shadow-lg'>
                          Premium
                        </span>
                      )}
                    </div>

                    <div>
                      <div className='flex gap-2 mb-2 flex-wrap'>
                        {game.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className='text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-0.5 rounded text-white'
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className='text-2xl font-black text-white uppercase italic tracking-tight leading-none mb-1'>
                        {game.name}
                      </h3>
                      <p className='text-[10px] text-white/60 font-medium line-clamp-1 mb-3'>
                        {game.desc}
                      </p>

                      <button className='w-full py-2 bg-white text-black rounded-lg font-black uppercase tracking-widest text-[10px] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg hover:bg-purple-500 hover:text-white'>
                        Play Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* OVERLAY FOR GAME CONFIG (When a game is selected) */}
        <AnimatePresence>
          {selectedGame && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className='fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-8'
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedGame(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className='w-full max-w-2xl bg-[#0b1220] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative'
              >
                {/* Modal Header */}
                <div className='h-32 relative overflow-hidden'>
                  <div className='absolute inset-0 bg-gradient-to-r from-purple-900 to-blue-900 opacity-50' />
                  <img
                    src={getCurrentGame()?.poster}
                    className='w-full h-full object-cover opacity-40 mix-blend-overlay'
                  />
                  <div className='absolute inset-0 pl-8 flex items-center justify-between pr-16 w-full'>
                    <h2 className='text-4xl font-black text-white italic uppercase tracking-tighter drop-shadow-xl'>
                      {getCurrentGame()?.name}
                    </h2>
                    {isPrivate && (
                      <div className='px-4 py-1.5 bg-amber-500/20 border border-amber-500/50 rounded-full flex items-center gap-2'>
                        <div className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' />
                        <span className='text-[10px] font-black text-amber-400 uppercase tracking-widest'>
                          Private Mode
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedGame(null)}
                    className='absolute top-4 right-4 w-10 h-10 rounded-full bg-black/20 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all'
                  >
                    <X className='w-5 h-5' />
                  </button>
                </div>

                {/* Modal Content - Opponent Selection */}
                <div className='p-8 space-y-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <label className='text-xs font-bold text-white/50 uppercase tracking-widest'>
                        Target Selection
                      </label>
                      <span className='text-xs font-bold text-purple-400 uppercase tracking-widest'>
                        {selectedOpponents.length} /{' '}
                        {selectedGame ? getMaxOpponentSlots(selectedGame) : 0} Slots
                      </span>
                    </div>
                    {!hasMinMembers && (
                      <div className='flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider'>
                        <Users className='w-4 h-4 shrink-0' />
                        Minimum {GAME_MIN_ROOM_MEMBERS} members in room required to start a game.
                      </div>
                    )}
                    {users.filter((u) => u.id !== user?.id).length > 0 ? (
                      <div className='grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar'>
                        {users
                          .filter((u) => u.id !== user?.id)
                          .map((u) => {
                            const isSelected = selectedOpponents.includes(u.id);
                            const maxSlots = selectedGame ? getMaxOpponentSlots(selectedGame) : 0;
                            return (
                              <div
                                key={u.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedOpponents((prev) =>
                                      prev.filter((id) => id !== u.id)
                                    );
                                  } else {
                                    if (maxSlots === 1) {
                                      playClick();
                                      setSelectedOpponents([u.id]);
                                    } else if (selectedOpponents.length < maxSlots) {
                                      playClick();
                                      setSelectedOpponents((prev) => [...prev, u.id]);
                                    }
                                  }
                                }}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'bg-purple-500/10 border-purple-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                              >
                                <div className='flex items-center gap-3'>
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40'}`}
                                  >
                                    {isSelected ? (
                                      <Check className='w-4 h-4' />
                                    ) : (
                                      <UserIcon className='w-4 h-4' />
                                    )}
                                  </div>
                                  <div>
                                    <div className='text-sm font-bold text-white uppercase tracking-wide'>
                                      {u.name}
                                    </div>
                                    <div className='text-[9px] text-white/30 uppercase tracking-widest font-medium'>
                                      Ready for combat
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className='w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]' />
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className='p-8 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center'>
                        <Users className='w-8 h-8 text-white/20 mb-3' />
                        <p className='text-sm text-white/40 font-medium'>
                          No active agents in lobby
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={handleStartGame}
                    disabled={
                      !selectedGame ||
                      selectedOpponents.length === 0 ||
                      isEstablishing ||
                      !hasMinMembers
                    }
                    className={`w-full h-16 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
                      selectedOpponents.length > 0
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:scale-[1.02]'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    {isEstablishing ? (
                      <>
                        <Loader2 className='w-5 h-5 animate-spin' />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Zap className='w-5 h-5 fill-current' />
                        Initialize Match
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export const AbandonGameModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { endGame } = useWebSocket();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='luxury-glass border-white/5 p-12 rounded-[3.5rem] bg-black/80 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-gradient'>
        <AlertDialogHeader className='mb-8'>
          <div className='w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-8'>
            <AlertTriangle className='w-10 h-10 text-red-500' />
          </div>
          <AlertDialogTitle className='text-4xl font-black uppercase italic tracking-tighter text-white'>
            ABANDON <span className='text-red-500'>QUEST?</span>
          </AlertDialogTitle>
          <AlertDialogDescription className='text-slate-400 font-medium pt-4 text-lg'>
            This will sever the game connection for all active combatants. Are you certain?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='gap-4'>
          <AlertDialogCancel className='h-16 rounded-3xl border-white/10 bg-white/5 text-white/50 uppercase font-black text-[10px] tracking-widest hover:bg-white/10'>
            STAY IN BATTLE
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              endGame();
              onOpenChange(false);
            }}
            className='h-16 rounded-3xl bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.3)] uppercase font-black text-[10px] tracking-widest hover:bg-red-600 transition-all border-none'
          >
            CONFIRM WITHDRAWAL
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
