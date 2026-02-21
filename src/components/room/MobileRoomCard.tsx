import { Star, Users, Lock, Gamepad2, Brain, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileRoomCardProps {
    room: {
        id: string;
        name: string;
        userCount: number;
        requiresPassword?: boolean;
        mode?: string;
        isMock?: boolean;
    };
    onClick: () => void;
}

export const MobileRoomCard = ({ room, onClick }: MobileRoomCardProps) => {
    const isAI = room.mode === 'ai' || room.name.toLowerCase().includes('ai') || room.name.toLowerCase().includes('alpha') || room.name.toLowerCase().includes('nebulon');
    const isGaming = room.mode === 'gaming' || room.name.toLowerCase().includes('gaming') || room.name.toLowerCase().includes('sigma') || room.name.toLowerCase().includes('xenon') || room.name.toLowerCase().includes('cyber');

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="relative mx-6 p-5 rounded-[24px] bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden group"
        >
            {/* Subtle Gradient Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-50" />
            
            {/* Animated Glow Highlight */}
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />

            <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {/* Category Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                        isAI ? 'bg-indigo-500 text-white' : 
                        isGaming ? 'bg-blue-500 text-white' : 
                        'bg-purple-500 text-white'
                    }`}>
                        {isAI ? <Brain className="w-6 h-6" /> : 
                         isGaming ? <Gamepad2 className="w-6 h-6" /> : 
                         <Cpu className="w-6 h-6" />}
                    </div>

                    <div>
                        <h3 className="text-lg font-black text-white italic tracking-tight leading-none mb-1">
                            {room.name}
                        </h3>
                        <div className="flex items-center gap-1.5 opacity-40">
                            <div className="w-2 h-2 rounded-full border border-white/40" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                SECURELINK #{room.id.slice(0, 5)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Connect Button */}
                <button className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 shadow-xl group-hover:border-indigo-500/50 transition-all">
                    {room.requiresPassword ? <Lock size={12} className="text-white/60" /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    <span className="text-[11px] font-black uppercase tracking-widest text-white italic">Connect</span>
                </button>
            </div>

            {/* Rating & Stats Row */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} className={s <= 4 ? "fill-amber-400 text-amber-400" : "text-white/20"} />
                    ))}
                    <div className="h-4 w-[1px] bg-white/10 mx-2" />
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 opacity-60">
                            <Users size={12} className="text-white" />
                            <span className="text-[10px] font-black text-white">{room.userCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-60">
                            <Users size={12} className="text-white" />
                            <span className="text-[10px] font-black text-white">{room.userCount - 5 > 0 ? room.userCount - 5 : 5}</span>
                        </div>
                    </div>
                </div>
                
                {room.name.includes('Nebulon') && (
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[8px] font-black text-indigo-400 uppercase tracking-widest">Trending</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[8px] font-black text-rose-400 uppercase tracking-widest">Live</span>
                    </div>
                )}
            </div>

            {/* Bottom Gradient Border Highlight */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
        </motion.div>
    );
};
