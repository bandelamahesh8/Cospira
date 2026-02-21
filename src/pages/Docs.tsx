import { motion } from 'framer-motion';
import { 
    BookOpen, 
    Rocket, 
    Shield, 
    Zap, 
    Users, 
    Lock, 
    FileText, 
    ChevronRight,
    Terminal,
    Globe
} from 'lucide-react';

const Docs = () => {
    const DOC_SECTIONS = [
        {
            title: "Foundation",
            items: [
                { icon: Rocket, label: "Core Concept", desc: "Understand the Cospira network architecture." },
                { icon: Users, label: "Identity Matrix", desc: "Neural signatures and user authentication." },
                { icon: Shield, label: "Deep Security", desc: "Encryption standards and session safety." }
            ]
        },
        {
            title: "Capabilities",
            items: [
                { icon: Zap, label: "Real-time Sync", desc: "Ultra-low latency communication protocols." },
                { icon: Lock, label: "Private Sectors", desc: "Password-protected and hidden room logic." },
                { icon: FileText, label: "Asset Sharing", desc: "Secure file propagation and presentation." }
            ]
        }
    ];

    return (
        <div className="flex-1 min-h-full bg-[#05070a] text-white overflow-y-auto custom-scrollbar">
            <div className="w-full px-4 md:px-10 lg:px-12 py-8 md:py-12 space-y-16 max-w-[1600px] mx-auto pb-32">
                
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-8"
                >
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <BookOpen className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">System Manual</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white italic uppercase leading-[0.8]">
                            Technical <span className="text-white/20">Docs</span>
                        </h1>
                        <p className="text-lg text-white/40 font-medium max-w-2xl leading-relaxed uppercase tracking-tight text-sm">
                            Master the Cospira environment with our comprehensive protocol documentation and system guidelines.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 p-6 rounded-[32px] backdrop-blur-xl">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">Current Version</span>
                            <span className="text-xl font-black text-white italic">v4.2 ALPHA</span>
                        </div>
                        <div className="w-px h-10 bg-white/10 mx-2" />
                        <Terminal size={24} className="text-emerald-400 opacity-50" />
                    </div>
                </motion.div>

                {/* Main Content Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {DOC_SECTIONS.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20 whitespace-nowrap">{section.title}</h2>
                                <div className="h-px w-full bg-white/5" />
                            </div>

                            <div className="grid gap-4">
                                {section.items.map((item, iIdx) => (
                                    <motion.div
                                        key={iIdx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: (sIdx * 3 + iIdx) * 0.05 }}
                                        whileHover={{ x: 10 }}
                                        className="group p-8 bg-[#0c1016]/60 backdrop-blur-xl border border-white/5 rounded-[40px] hover:border-emerald-500/30 transition-all cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -translate-y-16 translate-x-16 group-hover:bg-emerald-500/10 transition-all" />
                                        
                                        <div className="flex items-center gap-6 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-xl">
                                                <item.icon size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter group-hover:text-emerald-400 transition-colors">{item.label}</h3>
                                                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">{item.desc}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/10 group-hover:bg-white group-hover:text-black transition-all">
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Insight */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="p-12 rounded-[48px] bg-gradient-to-br from-[#0c1016] to-[#05070a] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-12 group"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Globe className="w-6 h-6 text-indigo-400 animate-pulse" />
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Global <span className="text-white/20">Uplink</span></h2>
                        </div>
                        <p className="text-sm font-bold text-white/30 uppercase tracking-[0.1em] max-w-lg leading-relaxed">
                            Access our full API reference and developer console for enterprise-level automation and deep-scale integrations.
                        </p>
                    </div>

                    <button className="px-10 h-16 bg-white text-black rounded-[24px] font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:bg-emerald-500 hover:text-white transition-all shadow-2xl shrink-0">
                        Developer Console <ArrowRight size={16} />
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

export default Docs;
