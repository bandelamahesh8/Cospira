import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Bot, 
    Zap, 
    Sparkles, 
    Gamepad2, 
    Rocket,
    Brain,
    Search
} from 'lucide-react';

interface AiAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const KNOWLEDGE_BASE = [
    {
        category: "Operational Modes",
        icon: <Zap className="w-4 h-4 text-amber-400" />,
        items: [
            {
                title: "Fun Mode",
                description: "Optimized for social interactions. Features dynamic filters, casual gaming integration, and relaxed security protocols for high-speed engagement."
            },
            {
                title: "Pro Mode",
                description: "The gold standard for collaboration. Focused on low-latency screen sharing, high-fidelity audio, and productivity-first UI layouts."
            },
            {
                title: "Ultra Mode",
                description: "Maximum bandwidth allocation. Utilizes advanced SFU routing for 4K video streams and sub-50ms latency for critical real-time tasks."
            },
            {
                title: "Mixed Mode",
                description: "Our most versatile state. Automatically balances social features with professional tools based on current room activity."
            }
        ]
    },
    {
        category: "Gaming Ecosystem",
        icon: <Gamepad2 className="w-4 h-4 text-indigo-400" />,
        items: [
            {
                title: "How to Play",
                description: "Open the 'Games' tab in any room to access the engine. Select a title (Chess, Ludo, Battleship) to initialize a synchronized session for all agents."
            },
            {
                title: "Engine Features",
                description: "Includes real-time state synchronization, ELO-based matchmaking statistics, and move history analysis."
            }
        ]
    },
    {
        category: "System Navigation",
        icon: <Rocket className="w-4 h-4 text-emerald-400" />,
        items: [
            {
                title: "Upcoming Features",
                description: "Visit the 'Development' sector to view our live roadmap. Features include AI-driven video synthesis and VR workspace integration."
            },
            {
                title: "System Settings",
                description: "Customizable via the gear icon. Control neural filters, audio suppression, and global privacy settings."
            },
            {
                title: "Agent Profile",
                description: "Your digital identity. Manage your DiceBear avatar, display name, and historical contribution stats."
            }
        ]
    }
];

export const AiAssistantModal = ({ isOpen, onClose }: AiAssistantModalProps) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredKnowledge = KNOWLEDGE_BASE.map(cat => ({
        ...cat,
        items: cat.items.filter(item => 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.items.length > 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-[#0c1016] border border-white/10 rounded-[32px] shadow-2xl z-[101] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 bg-gradient-to-b from-indigo-500/10 to-transparent">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
                                        <Bot className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">AI Assistant: Online</h2>
                                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] animate-pulse">Neural Assist Mode Activated</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                                    <X className="w-4 h-4 text-white/40" />
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <input 
                                    type="text"
                                    placeholder="ASK ABOUT MODES, GAMES, OR NAVIGATION..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 text-xs font-bold placeholder:text-white/10 focus:border-indigo-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0c1016]">
                            <div className="space-y-10">
                                {filteredKnowledge.map((cat, idx) => (
                                    <div key={idx} className="space-y-4">
                                        <div className="flex items-center gap-2 mb-6">
                                            {cat.icon}
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">{cat.category}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {cat.items.map((item, i) => (
                                                <motion.div 
                                                    key={i}
                                                    whileHover={{ x: 4 }}
                                                    className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                                                >
                                                    <h4 className="text-sm font-black text-white uppercase italic mb-2 group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                                                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                                                        {item.description}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {filteredKnowledge.length === 0 && (
                                    <div className="py-20 text-center">
                                        <Brain className="w-12 h-12 text-white/5 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No matching neural patterns found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Always learning provided by Cospira Intelligence</span>
                            </div>
                            <span className="text-[9px] font-mono text-white/10">ST-NODE: 0x8842</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
