import { motion } from 'framer-motion';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Brain, Sparkles, Languages, ShieldAlert, FileText, Zap } from 'lucide-react';

const AI_FEATURES = [
  {
    icon: <Languages className="w-6 h-6" />,
    title: 'Adaptive Linguistics',
    desc: 'Neural-mesh translation in 40+ dialects. It doesn\'t just translate words; it captures cultural nuance and intent in real-time.',
    color: '#6366f1',
    size: 'medium'
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'Contextual Synthesis',
    desc: 'The engine builds a vector database of your session. Gist, decisions, and logic gaps are identified as they happen.',
    color: '#8b5cf6',
    size: 'large'
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Generative Interactivity',
    desc: 'Turn any shared document or clip into an instant AI-powered quiz or poll for all participants.',
    color: '#06b6d4',
    size: 'medium'
  },
  {
    icon: <ShieldAlert className="w-6 h-6" />,
    title: 'Guardian Protocol',
    desc: 'Proprietary behavioural moderation. Detects toxic patterns and screen-capture attempts before they manifest.',
    color: '#10b981',
    size: 'medium'
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Room DNA Persistence',
    desc: 'Your project\'s intelligence persists. Late members get a neural catch-up summary in 4 seconds.',
    color: '#f59e0b',
    size: 'medium'
  },
];

const NeuralVisualizer = () => {
  return (
    <div className="relative w-full h-[340px] rounded-[2rem] border border-white/5 bg-[#05060c] overflow-hidden group">
      {/* Background Pulse */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <motion.div 
          className="w-[300px] h-[300px] rounded-full bg-violet-500/20 blur-[100px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
               <Zap className="w-4 h-4 fill-current" />
             </div>
             <div>
               <div className="text-[10px] font-black text-white uppercase tracking-widest">Neural Orchestrator</div>
               <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-0.5">Status: Active // Processing</div>
             </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <motion.div 
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-indigo-500/40"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>
        </div>

        {/* Central Core Visualization */}
        <div className="relative flex items-center justify-center py-10">
          <svg className="w-48 h-48 relative z-10" viewBox="0 0 100 100">
            <motion.circle 
              cx="50" cy="50" r="40" 
              stroke="rgba(99,102,241,0.1)" 
              strokeWidth="0.5" 
              fill="none" 
            />
            {/* Pulsing data rings */}
            {[0, 1, 2].map(i => (
              <motion.circle
                key={i}
                cx="50" cy="50" r={30 + i * 8}
                stroke="rgba(139,92,246,0.15)"
                strokeWidth="0.25"
                fill="none"
                animate={{ r: [30 + i * 8, 35 + i * 8, 30 + i * 8] }}
                transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
              />
            ))}
            
            {/* Core Nodes */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const r = 25;
              const x = 50 + r * Math.cos((angle * Math.PI) / 180);
              const y = 50 + r * Math.sin((angle * Math.PI) / 180);
              return (
                <motion.circle
                  key={i}
                  cx={x} cy={y} r="1.5"
                  fill="#ffffff"
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.5, 1] }}
                  transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                />
              );
            })}
          </svg>
          
          {/* Internal Log stream shimmet */}
          <div className="absolute bottom-[-20%] left-0 right-0 h-24 bg-gradient-to-t from-[#05060c] to-transparent z-20" />
        </div>

        {/* Neural Log Feed */}
        <div className="space-y-1.5 font-mono text-[8px] text-white/10 uppercase tracking-widest overflow-hidden h-12">
           <motion.div
             animate={{ y: [0, -100] }}
             transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
             className="space-y-1"
           >
             <div>[SYSTEM] INITIALIZING SESSION_DNA</div>
             <div>[AI] LINGUISTIC_MESH CONNECTED // EN</div>
             <div>[SEC] GUARDIAN_PROTOCOL_ACTIVE</div>
             <div>[DATA] VECTOR_INDEXING_ROOM_729</div>
             <div>[AI] CONTEXTUAL_SYNTHESIS_RUNNING</div>
             <div>[SYSTEM] HEARTBEAT_SYNC_OK</div>
             <div>[SEC] NO_THREAT_DETECTED</div>
           </motion.div>
        </div>
      </div>
    </div>
  );
};

const AISection = () => {
  return (
    <section className="hp-section overflow-hidden bg-[#030407]">
      <div 
        className="hp-orb absolute top-0 right-1/4 w-[600px] h-[500px]"
        style={{ background: 'rgba(139,92,246,0.06)' }} 
      />

      <div className="hp-container relative z-10">
        <div className="hp-section-label">
          <span>06</span>
          <div className="hp-section-label-line" />
          <span>Neural Engine</span>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-20 items-center mb-16">
          <div>
            <motion.h2
              className="hp-h2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              Intelligence is <br />
              <span className="hp-grad-violet">The Core Fabric.</span>
            </motion.h2>
            <motion.p
              className="hp-body text-white/50 mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.12 }}
            >
              Cospira doesn't just host rooms; it understands them. Our always-on neural 
              layer acts as a silent participant — observing, synthesizing, and 
              protecting from initialization to destruction.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <NeuralVisualizer />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AI_FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className={`${f.size === 'large' ? 'lg:col-span-2' : 'lg:col-span-1'}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/5 p-2 group">
                 <GlowingEffect
                   spread={40}
                   glow={true}
                   disabled={false}
                   proximity={64}
                   inactiveZone={0.01}
                   borderWidth={2}
                 />
                 <div className="relative h-full overflow-hidden rounded-xl border-[0.75px] bg-white/[0.01] p-6 shadow-sm transition-colors duration-500 group-hover:bg-white/[0.03]">
                   <div className="relative z-20 flex flex-col h-full">
                      <div className="mb-6 flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30 group-hover:text-white transition-all duration-500">
                          {f.icon}
                        </div>
                        <div className="h-0.5 w-8 rounded-full bg-white/5 group-hover:bg-transparent overflow-hidden">
                           <motion.div 
                             className="h-full bg-indigo-500" 
                             animate={{ x: ['-100%', '100%'] }} 
                             transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                           />
                        </div>
                      </div>
                      <div className="mt-auto">
                        <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2 italic">{f.title}</h3>
                        <p className="hp-body-sm text-white/40 leading-relaxed group-hover:text-white/60 transition-colors">
                           {f.desc}
                        </p>
                      </div>
                      
                      {/* Background accent */}
                      <div 
                        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none"
                        style={{ background: f.color }}
                      />
                   </div>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AISection;
