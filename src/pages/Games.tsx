import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    X, 
    Check, 
    Play, 
    Zap, 
    User as UserIcon,
    Search,
    Trophy,
    Award,
    ChevronRight,
    Sword,
    Shuffle
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { toast } from 'sonner';
import { GuestNotification } from '@/components/GuestNotification';

// Import game posters
import chessP from '@/assets/chess_game_poster_1769337462731.png';
import ludoP from '@/assets/ludo_game_poster_1769337480481.png';
import connect4P from '@/assets/connect4_poster_1769337496441.png';
import tictactoeP from '@/assets/tictactoe_poster_1769337515157.png';
import battleshipP from '@/assets/battleship_poster_1769337532384.png';

type GameId = 'xoxo' | 'ultimate-xoxo' | 'chess' | 'ludo' | 'snakeladder' | 'connect4' | 'checkers' | 'battleship';

const Games = () => {
    const { users, startGame, socket } = useWebSocket();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { playClick } = useSoundEffects();

    const [isSearching, setIsSearching] = useState(false);
    const [waitTime, setWaitTime] = useState(0);
    const [estimatedWait, setEstimatedWait] = useState(30);

    const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
    const [selectedOpponents, setSelectedOpponents] = useState<string[]>([]);
    const [isTeamMode] = useState(false);

    // Metadata
    const availableGames = [
        { id: 'chess', name: 'Grand Chess', desc: 'The ultimate test of intellect', category: 'Strategy', available: true, color: '#D4AF37', featured: true, players: 1248, poster: chessP, tags: ['Competitive', 'Ranked'] },
        { id: 'ludo', name: 'Ludo Pro', desc: 'Strategic chance dominance', category: 'Multiplayer', available: true, color: '#10B981', featured: false, players: 892, poster: ludoP, tags: ['Casual', 'Social'] },
        { id: 'connect4', name: 'Connect Four', desc: 'Gravity-defying strategy', category: 'Strategy', available: true, color: '#3B82F6', featured: false, players: 654, poster: connect4P, tags: ['Arcade', 'Fast'] },
        { id: 'xoxo', name: 'Tic-Tac-Toe', desc: 'Cyberpunk tactical warfare', category: 'Casual', available: true, color: '#8B5CF6', featured: false, players: 423, poster: tictactoeP, tags: ['Arcade', 'Quick'] },
        { id: 'ultimate-xoxo', name: 'Ultimate XOXO', desc: '9 Boards. 1 Master Plan.', category: 'Strategy', available: true, color: '#F59E0B', featured: false, players: 234, poster: tictactoeP, tags: ['Hardcore', 'Brain'] },
        { id: 'snakeladder', name: 'Apex Serpents', desc: 'Ruthless climb to the top', category: 'Casual', available: true, color: '#EF4444', featured: false, players: 567, poster: ludoP, tags: ['Casual', 'Luck'] },
        { id: 'checkers', name: 'Checkers', desc: 'Kingdom capture tactics', category: 'Strategy', available: true, color: '#DC2626', featured: false, players: 345, poster: chessP, tags: ['Classic', 'Board'] },
        { id: 'battleship', name: 'Battleship', desc: 'Naval warfare strategy', category: 'Strategy', available: true, color: '#06B6D4', featured: false, players: 189, poster: battleshipP, tags: ['Tactical', 'War'] },
    ];

    const tournaments = [
        { id: '1', title: 'Cyber Chess Open', prize: '5000 XP', time: 'Starts in 2h', participants: 42, color: 'from-amber-500/20 to-transparent' },
        { id: '2', title: 'Ludo Master Series', prize: '2500 XP', time: 'Active Now', participants: 128, color: 'from-emerald-500/20 to-transparent' },
    ];

    const featuredGame = availableGames.find(g => g.featured) || availableGames[0];
    const competitiveGames = availableGames.filter(g => g.category === 'Strategy');
    const casualGames = availableGames.filter(g => g.category !== 'Strategy');

    const getCurrentGame = () => availableGames.find(g => g.id === selectedGame);

    const handleStartGame = () => {
        if (!selectedGame || selectedOpponents.length === 0) {
            toast.error('Protocol Violation: Select target(s) before engaging.');
            return;
        }
        startGame(selectedGame, [user?.id || '', ...selectedOpponents], { teamMode: isTeamMode });
        setSelectedGame(null);
        setSelectedOpponents([]);
    };

    const handleJoinQueue = () => {
        if (!selectedGame || !socket) return;
        socket.emit('join-matchmaking', { gameType: selectedGame, mode: 'casual' });
        setIsSearching(true);
        setWaitTime(0);
        setSelectedGame(null);
    };

    const handleCancelQueue = () => {
        if (socket) socket.emit('leave-matchmaking');
        setIsSearching(false);
        setWaitTime(0);
    };

    useEffect(() => {
        if (!socket) return;
        const onQueueJoined = (data: { estimatedWait?: number }) => {
            setIsSearching(true);
            setEstimatedWait(data.estimatedWait || 30);
            toast.success('Joined Public Queue');
        };
        const onMatchFound = (data: { roomId: string; gameType: string; mode: string }) => {
            setIsSearching(false);
            navigate(`/room/${data.roomId}?game=${data.gameType}&mode=${data.mode}`);
        };
        const onQueueLeft = () => setIsSearching(false);
        const onMatchmakingError = (data: { message: string }) => { setIsSearching(false); toast.error(data.message); };

        socket.on('queue-joined', onQueueJoined);
        socket.on('match-found', onMatchFound);
        socket.on('queue-left', onQueueLeft);
        socket.on('matchmaking-error', onMatchmakingError);

        return () => {
            socket.off('queue-joined', onQueueJoined);
            socket.off('match-found', onMatchFound);
            socket.off('queue-left', onQueueLeft);
            socket.off('matchmaking-error', onMatchmakingError);
        };
    }, [socket, navigate]);

    useEffect(() => {
        if (!isSearching) return;
        const interval = setInterval(() => setWaitTime(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, [isSearching]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="p-6 md:p-8 min-h-full text-white pb-32 bg-[#05070a] overflow-y-auto custom-scrollbar">
            <GuestNotification />
            
            <div className="max-w-[1600px] mx-auto space-y-12">
                {/* HEADER & XP BAR */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">Combat <span className="text-indigo-400">Hub</span></h1>
                        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Enter the arena and claim your dominance</p>
                    </div>
                    
                    <div className="flex items-center gap-6 bg-white/[0.03] border border-white/5 p-4 rounded-3xl backdrop-blur-xl">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Neural Level</span>
                            <span className="text-xl font-black text-white italic">LVL 42</span>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="w-48 space-y-2">
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40">
                                <span>XP Progress</span>
                                <span>2,400 / 3,000</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-[80%] bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* HERO & TOURNAMENTS GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="xl:col-span-8 relative min-h-[450px] rounded-[32px] overflow-hidden border border-white/10 group"
                    >
                        <div className="absolute inset-0 bg-black">
                            <img src={featuredGame.poster} className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform group-hover:scale-105 duration-[10000ms]" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#05080f] via-[#05080f]/60 to-transparent" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-center px-12 py-16 max-w-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">Season Event</span>
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Double XP Active</span>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter uppercase mb-6 leading-none">{featuredGame.name}</h2>
                            <p className="text-md text-white/70 max-w-md font-medium leading-relaxed mb-10 border-l-2 border-indigo-500 pl-6 lowercase first-letter:uppercase">{featuredGame.desc}</p>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => { playClick(); setSelectedGame(featuredGame.id as GameId); }}
                                    className="h-14 px-8 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all shadow-2xl flex items-center gap-3 text-sm"
                                >
                                    <Play size={20} fill="currentColor" /> Play Now
                                </button>
                                <button className="h-14 px-8 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all text-xs">Details</button>
                            </div>
                        </div>
                    </motion.div>

                    <div className="xl:col-span-4 space-y-6">
                        <div className="h-full flex flex-col bg-[#0c1016]/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-400" /> Tournaments
                                </h3>
                                <button className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-white transition-colors">View All</button>
                            </div>
                            
                            <div className="space-y-4 flex-1">
                                {tournaments.map((t) => (
                                    <div key={t.id} className={`p-6 rounded-2xl bg-gradient-to-br ${t.color} border border-white/5 hover:border-white/20 transition-all cursor-pointer group`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t.time}</span>
                                            <span className="flex items-center gap-1.5 text-amber-400 font-black text-xs">
                                                <Award className="w-3.5 h-3.5" /> {t.prize}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-black text-white uppercase italic mb-2">{t.title}</h4>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase">
                                                <Users size={12} /> {t.participants} Registered
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:translate-x-1 group-hover:text-white transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <button className="w-full h-14 mt-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-indigo-500 hover:text-white transition-all">
                                Create Tournament
                            </button>
                        </div>
                    </div>
                </div>

                {/* GAME CATEGORIES */}
                <div className="space-y-12 pb-24">
                    {/* Competitive */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                                <Sword className="w-5 h-5 text-cyan-400" /> Ranked Arena
                            </h2>
                            <div className="h-px flex-1 bg-white/5 ml-6" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {competitiveGames.map((game) => (
                                <motion.div 
                                    key={game.id}
                                    whileHover={{ y: -8 }}
                                    onClick={() => { playClick(); setSelectedGame(game.id as GameId); }}
                                    className="group relative aspect-[4/5] rounded-[28px] overflow-hidden border border-white/5 cursor-pointer"
                                >
                                    <img src={game.poster} alt={game.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-6">
                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-2">{game.category}</span>
                                        <h3 className="text-xl font-black text-white uppercase italic mb-1">{game.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{game.players} Online</span>
                                        </div>
                                    </div>
                                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Play size={16} fill="white" className="ml-1" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Casual */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                                <Shuffle className="w-5 h-5 text-purple-400" /> Casual Sector
                            </h2>
                            <div className="h-px flex-1 bg-white/5 ml-6" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {casualGames.map((game) => (
                                <motion.div 
                                    key={game.id}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => { playClick(); setSelectedGame(game.id as GameId); }}
                                    className="flex items-center gap-5 p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                                        <img src={game.poster} alt={game.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-white uppercase italic leading-none mb-1">{game.name}</h4>
                                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Connect</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white transition-colors" />
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* LAUNCHER OVERLAY */}
            <AnimatePresence>
                {selectedGame && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
                        onClick={(e) => { if (e.target === e.currentTarget) setSelectedGame(null); }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-xl bg-[#0b1220] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl"
                        >
                            <div className="h-40 relative">
                                <img src={getCurrentGame()?.poster} alt={getCurrentGame()?.name} className="w-full h-full object-cover opacity-30" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] to-transparent" />
                                <div className="absolute bottom-8 left-10">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2 block">Protocol Initiation</span>
                                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">{getCurrentGame()?.name}</h2>
                                </div>
                                <button onClick={() => setSelectedGame(null)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-10 space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 px-2">Invite Agents</label>
                                    <div className="grid gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {users.filter(u => u.id !== user?.id).length > 0 ? (
                                            users.filter(u => u.id !== user?.id).map(u => (
                                                <button 
                                                    key={u.id}
                                                    onClick={() => {
                                                        const isSelected = selectedOpponents.includes(u.id);
                                                        if (isSelected) setSelectedOpponents(prev => prev.filter(id => id !== u.id));
                                                        else setSelectedOpponents(prev => [...prev, u.id]);
                                                    }}
                                                    className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${selectedOpponents.includes(u.id) ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                                                            <UserIcon size={20} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-black text-white uppercase italic">{u.name}</div>
                                                            <div className="text-[9px] font-bold text-white/20 uppercase">Available</div>
                                                        </div>
                                                    </div>
                                                    {selectedOpponents.includes(u.id) && <Check size={16} className="text-indigo-400" />}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="py-8 text-center text-white/20 border border-dashed border-white/10 rounded-2xl">
                                                <Users size={24} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No Active Agents Found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button 
                                        onClick={handleJoinQueue}
                                        className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all shadow-xl"
                                    >
                                        <Search size={18} /> Public Matchmaking
                                    </button>
                                    <button 
                                        onClick={handleStartGame}
                                        disabled={selectedOpponents.length === 0}
                                        className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-20 hover:bg-white/10 transition-all"
                                    >
                                        <Zap size={18} fill="currentColor" /> Private Sector Challenge
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SEARCHING OVERLAY */}
            <AnimatePresence>
                {isSearching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-[#05080f]/95 backdrop-blur-xl flex items-center justify-center p-8"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="max-w-md w-full text-center space-y-12"
                        >
                            <div className="relative mx-auto w-32 h-32">
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                                />
                                <div className="absolute inset-4 rounded-full border border-white/5 bg-white/5 flex items-center justify-center">
                                    <Search className="w-8 h-8 text-indigo-400" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Scanning...</h2>
                                <p className="text-slate-400 font-medium tracking-wide">
                                    Searching for available opponents in the <span className="text-indigo-400 font-bold">{getCurrentGame()?.name}</span> arena.
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-12 py-8 bg-white/5 rounded-[2rem] border border-white/5">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Wait Time</p>
                                    <p className="text-3xl font-mono font-black text-white">{formatTime(waitTime)}</p>
                                </div>
                                <div className="h-10 w-px bg-white/10" />
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Est. Wait</p>
                                    <p className="text-3xl font-mono font-black text-white/40">~{estimatedWait}s</p>
                                </div>
                            </div>

                            <button
                                onClick={handleCancelQueue}
                                className="px-12 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 hover:text-red-400 hover:border-red-400/50 transition-all text-xs"
                            >
                                Cancel Operation
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Games;
