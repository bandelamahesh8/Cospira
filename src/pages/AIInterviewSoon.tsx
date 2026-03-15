import { motion } from 'framer-motion';
import { Bot, Cpu, Shield, Zap, ArrowLeft, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AIInterviewSoon = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030407] text-white selection:bg-indigo-500/30 overflow-hidden flex flex-col items-center justify-center p-6 relative">
      {/* Background Cinematic Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center space-y-12 relative z-10"
      >
        {/* Header Section */}
        <div className="space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4"
          >
            <Bot className="w-5 h-5 text-indigo-400" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-200">
              Neural Deployment Pending
            </span>
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
            AI <span className="text-indigo-500">Interview.</span><br />
            <span className="text-white/20">Launching Soon.</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/40 font-medium italic max-w-2xl mx-auto leading-relaxed">
            The world's first autonomous, neural-driven technical assessment environment. Conducted by agents, validated by intelligence.
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Cpu className="w-5 h-5" />, t: 'Dynamic Logic', d: 'Adaptive questioning that evolves based on real-time candidate performance.' },
            { icon: <Shield className="w-5 h-5" />, t: 'Identity Vault', d: 'Secure, zero-knowledge verification of candidate expertise and integrity.' },
            { icon: <Zap className="w-5 h-5" />, t: 'Instant Synthesis', d: 'Comprehensive neural recaps delivered milliseconds after session termination.' }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (i * 0.1) }}
              className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 text-left group hover:bg-white/[0.04] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-sm font-black uppercase italic tracking-tight mb-3">{item.t}</h3>
              <p className="text-xs text-white/30 leading-relaxed font-medium">{item.d}</p>
            </motion.div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-8">
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase italic tracking-[0.2em] text-xs shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:bg-indigo-500 transition-all"
           >
             Request Beta Access
           </motion.button>
           
           <button 
             onClick={() => navigate('/dashboard')}
             className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors"
           >
             <ArrowLeft className="w-4 h-4" />
             Back to Command Center
           </button>
        </div>
      </motion.div>

      {/* Terminal Footer */}
      <div className="absolute bottom-10 left-0 w-full px-10 flex flex-col md:flex-row items-center justify-between opacity-10">
         <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">COSPIRA_V1 // NEURAL_INIT_PROT</span>
         </div>
         <div className="flex gap-8">
            <span className="text-[10px] font-black uppercase tracking-widest underline decoration-white/20">System Status: Stable</span>
            <span className="text-[10px] font-black uppercase tracking-widest underline decoration-white/20">Deployment: 84% Complete</span>
         </div>
      </div>
    </div>
  );
};

export default AIInterviewSoon;
