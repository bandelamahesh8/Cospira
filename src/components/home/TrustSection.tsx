import { motion } from 'framer-motion';
import { ShieldCheck, Globe, Cpu, Database, Network, Lock, Zap, Server } from 'lucide-react';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const COMPLIANCE = [
  { label: 'ISO 27001', icon: <ShieldCheck className="w-4 h-4" /> },
  { label: 'GDPR PRIVACY', icon: <Lock className="w-4 h-4" /> },
  { label: 'SOC 2 TYPE II', icon: <ShieldCheck className="w-4 h-4" /> },
  { label: 'HIPAA READY', icon: <Lock className="w-4 h-4" /> },
  { label: 'ZERO-KNOWLEDGE', icon: <Lock className="w-4 h-4" /> },
];

const STACK = [
  { layer: 'Application Edge', tech: 'React · Vite · Next.js', icon: <Cpu className="w-4 h-4" />, color: '#6366f1' },
  { layer: 'Signaling Fabric', tech: 'Socket.IO · WebRTC · Redis', icon: <Network className="w-4 h-4" />, color: '#8b5cf6' },
  { layer: 'Media Orchestration', tech: 'Mediasoup · FFmpeg · Rust', icon: <Server className="w-4 h-4" />, color: '#06b6d4' },
  { layer: 'Neural Processing', tech: 'Dynamic Indexing · Sentiment Analysis · Gist Engine', icon: <Zap className="w-4 h-4" />, color: '#10b981' },
  { layer: 'Persistent Layer', tech: 'MongoDB · S3 · Edge Caching', icon: <Database className="w-4 h-4" />, color: '#f59e0b' },
];

const NodeStatus = ({ city, ping, status }: { city: string, ping: string, status: 'online' | 'optimizing' }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 opacity-50 hover:opacity-100 transition-opacity">
    <div className="flex items-center gap-3">
      <div className={`w-1 h-1 rounded-full ${status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
      <span className="text-[10px] font-black text-white uppercase tracking-widest">{city}</span>
    </div>
    <div className="flex items-center gap-4">
       <span className="text-[9px] font-mono text-white/30">{ping}</span>
       <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">{status}</span>
    </div>
  </div>
);

const TrustSection = () => {
  const badges = [...COMPLIANCE, ...COMPLIANCE, ...COMPLIANCE];

  return (
    <section className="hp-section relative overflow-hidden bg-[#030407] py-32">
      {/* Background Ambience */}
      <div className="hp-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />

      <div className="hp-container relative z-10">
        {/* Compliance Marquee Section */}
        <div className="hp-section-label mb-12">
          <span>09</span>
          <div className="hp-section-label-line" />
          <span>Trust Protocols</span>
        </div>

        <div className="relative mb-32 group">
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#030407] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#030407] to-transparent z-10" />
          
          <div className="flex overflow-hidden">
            <motion.div 
              className="flex gap-8 py-4 flex-shrink-0"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
              {badges.map((b, i) => (
                <div key={i} className="flex items-center gap-4 px-8 py-4 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
                   <div className="text-indigo-400 opacity-60">{b.icon}</div>
                   <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] whitespace-nowrap">{b.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Core Infrastructure Upgrade */}
        <div className="grid lg:grid-cols-2 gap-24 items-start">
           <div>
             <div className="hp-section-label mb-8">
               <span>&middot;</span>
               <div className="hp-section-label-line" />
               <span>Global Infrastructure</span>
             </div>
             
             <motion.h2
               className="hp-h2 mb-8"
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8 }}
             >
               Architected for <br />
               <span className="hp-grad-hero italic">Infinite Scale.</span>
             </motion.h2>

             <motion.p
               className="hp-body text-white/40 mb-12 max-w-lg"
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, delay: 0.1 }}
             >
               The Cospira fabric is built on a custom-engineered WebRTC stack that 
               distributes processing across 24 global edge nodes. Zero single points of 
               failure. Military-grade isolation.
             </motion.p>

             {/* Node Monitor Card */}
             <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Network Topology</span>
                   </div>
                   <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                      Stable // 99.9% Uptime
                   </div>
                </div>

                <div className="space-y-1">
                   <NodeStatus city="San Francisco" ping="12ms" status="online" />
                   <NodeStatus city="London Node A" ping="24ms" status="online" />
                   <NodeStatus city="Singapore" ping="18ms" status="online" />
                   <NodeStatus city="Tokyo Core" ping="32ms" status="optimizing" />
                   <NodeStatus city="Frankfurt" ping="21ms" status="online" />
                </div>

                <div className="mt-8 flex justify-center">
                   <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-500"
                        animate={{ width: ["10%", "95%", "40%", "80%"] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                      />
                   </div>
                </div>
             </div>
           </div>

           {/* Stack Layering 3D effect */}
           <div className="relative pt-12">
              <div className="absolute -top-12 right-0 flex items-center gap-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
                 <span className="italic">Kernel Architecture</span>
                 <div className="w-20 h-px bg-white/10" />
              </div>

              <div className="space-y-4">
                 {STACK.map((s, i) => (
                   <motion.div
                     key={s.layer}
                     initial={{ opacity: 0, x: 40 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.6, delay: i * 0.1 }}
                     className="relative group"
                   >
                     <div className="relative rounded-2xl p-[1px] overflow-hidden">
                        <GlowingEffect
                          spread={40}
                          glow={true}
                          disabled={false}
                          proximity={64}
                          inactiveZone={0.01}
                          borderWidth={2}
                        />
                        <div className="relative bg-[#05060c] rounded-2xl p-6 border border-white/5 flex items-center justify-between group-hover:bg-[#070810] transition-colors">
                           <div className="flex items-center gap-6">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                                style={{ background: `${s.color}15`, border: `1px solid ${s.color}30`, color: s.color }}
                              >
                                 {s.icon}
                              </div>
                              <div>
                                 <div className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em] mb-1">{s.layer}</div>
                                 <div className="text-sm font-black text-white/70 group-hover:text-white transition-colors uppercase tracking-tight italic">{s.tech}</div>
                              </div>
                           </div>
                           <motion.div 
                             className="w-1.5 h-1.5 rounded-full"
                             style={{ background: s.color }}
                             animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                             transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                           />
                        </div>
                     </div>
                   </motion.div>
                 ))}
              </div>

              {/* Security Badge Float */}
              <motion.div 
                className="absolute -bottom-12 -right-12 p-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-xl flex flex-col items-center gap-2"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                 <Lock className="w-6 h-6 text-indigo-400" />
                 <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest text-center">AES-256 <br/> Hardened</span>
              </motion.div>
           </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
