import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Terminal, ShieldCheck } from 'lucide-react';
import { Magnetic } from './VisualEffects';
import { GlowingEffect } from '@/components/ui/glowing-effect';

// ── AMBIENT DATA FIELD ───────────────────────────────────────────────────────
const DataField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 0.8 + 0.2,
      o: Math.random() * 0.4 + 0.1,
      v: Math.random() * 0.2 + 0.05
    }));
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.y -= p.v;
        if (p.y < 0) p.y = canvas.height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 150, 255, ${p.o})`;
        ctx.fill();
        if (Math.random() > 0.99) {
          ctx.beginPath();
          ctx.moveTo(p.x - 2, p.y);
          ctx.lineTo(p.x + 2, p.y);
          ctx.strokeStyle = `rgba(147, 150, 255, 0.2)`;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }} />;
};

const EnvironmentCommand = () => {
  return (
    <section className="hp-section relative py-40 md:py-64 overflow-hidden bg-[#030407]">
      <DataField />
      
      {/* Cinematic Background Elements */}
      <div className="hp-orb absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] opacity-20" 
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
      
      <div className="hp-container relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-24 items-center">
          
          {/* Left: Tactical Narratives */}
          <div className="relative z-20">
            <motion.div 
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="flex items-center gap-3 mb-10"
            >
               <div className="w-10 h-px bg-indigo-500/30" />
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Environment Protocol</span>
            </motion.div>

            <motion.h2 
              className="text-6xl md:text-[7rem] font-black italic uppercase tracking-tighter text-white mb-10 leading-[0.85]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              Control the <br />
              <span className="hp-grad-hero">Environment.</span>
            </motion.h2>

            <motion.p 
              className="text-xl md:text-2xl text-white/40 font-medium italic mb-14 leading-tight max-w-lg"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Cospira provides the absolute substrate for real-time presence. 
              Configure your reality, deploy your tools, and exit without a trace.
            </motion.p>

            <div className="space-y-6 mb-16">
               {[
                 { label: 'Latency Optimization', val: '0.12ms Edge' },
                 { label: 'Security Handshake', val: 'AES_256_GCM' },
                 { label: 'Neural Recaps', val: 'Context_Active' }
               ].map((stat, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, x: -20 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: 0.4 + (i * 0.1) }}
                   className="flex items-center gap-6"
                 >
                    <div className="text-[10px] font-mono text-white/10 uppercase tracking-widest min-w-[140px]">{stat.label}</div>
                    <div className="h-px flex-1 bg-white/5" />
                    <div className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest">{stat.val}</div>
                 </motion.div>
               ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
            >
              <Magnetic>
                <Link to="/dashboard" className="hp-btn-primary group relative px-14 py-7 text-xl hover:scale-105 transition-all duration-500">
                  <span className="relative z-10 flex items-center gap-4">
                    Initiate Deployment
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl rounded-full" />
                </Link>
              </Magnetic>
            </motion.div>
          </div>

          {/* Right: The Command Console Visualization */}
          <div className="relative">
             <div className="absolute -inset-4 bg-indigo-500/5 blur-[80px] rounded-full opacity-50 pulse-slow" />
             
             <motion.div
               initial={{ opacity: 0, rotateY: 20, rotateX: 10, scale: 0.9 }}
               whileInView={{ opacity: 1, rotateY: 0, rotateX: 0, scale: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 1.2, ease: "circOut" }}
               className="relative z-20 rounded-[2.5rem] p-[2px] overflow-hidden group"
             >
               <GlowingEffect
                  spread={64}
                  glow={true}
                  disabled={false}
                  proximity={80}
                  inactiveZone={0.01}
                  borderWidth={2}
               />
               
               <div className="relative bg-[#05060c]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-12 overflow-hidden">
                  {/* Console Header */}
                  <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8">
                     <div className="flex items-center gap-4">
                        <Terminal className="w-5 h-5 text-white/40" />
                        <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.4em]">Environment_Console // Alpha v9</span>
                     </div>
                     <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500/40 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-indigo-500/40" />
                     </div>
                  </div>

                  {/* Console Grid */}
                  <div className="grid grid-cols-2 gap-8 mb-12">
                     <div className="space-y-6">
                        <div>
                           <div className="flex justify-between mb-2">
                              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">SFU Load</span>
                              <span className="text-[8px] font-mono text-indigo-400">14%</span>
                           </div>
                           <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div className="h-full bg-indigo-500" animate={{ width: ['20%', '14%', '18%'] }} transition={{ duration: 5, repeat: Infinity }} />
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between mb-2">
                              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Frame Sync</span>
                              <span className="text-[8px] font-mono text-emerald-400">99.98%</span>
                           </div>
                           <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div className="h-full bg-emerald-500" animate={{ width: ['95%', '99%', '98%'] }} transition={{ duration: 3, repeat: Infinity }} />
                           </div>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                           <div className="text-[8px] font-black text-white/10 uppercase tracking-widest mb-3 text-center">Active Shards</div>
                           <div className="flex justify-center gap-1">
                              {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 3 ? 'bg-indigo-500' : 'bg-white/5'}`} />)}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Console Logs */}
                  <div className="space-y-2 font-mono text-[9px] text-white/10 uppercase tracking-tight italic">
                     <div>{">"} Protocol_init: secure_handshake(success)</div>
                     <div className="text-white/20">{">"} Environment_Kernel: mounting_room_cluster...</div>
                     <div className="text-white/40">{">"} AI_Agent: neural_indexing_active</div>
                     <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: [0, 1, 0] }}
                       transition={{ duration: 1, repeat: Infinity }}
                       className="text-emerald-500/60"
                     >{">"} Ready_to_deploy_cluster_v4.2.1-stable</motion.div>
                  </div>

                  {/* Decorative Circuit */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 border border-white/5 rounded-full opacity-20 pointer-events-none" />
                  <div className="absolute -top-10 -left-10 w-60 h-60 border border-indigo-500/10 rounded-full opacity-20 pointer-events-none" />
               </div>
             </motion.div>

             {/* Vision Shield Badge */}
             <motion.div 
               className="absolute -top-12 -right-8 p-6 rounded-2xl bg-[#070811] border border-white/10 backdrop-blur-xl z-30"
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
             >
                <ShieldCheck className="w-8 h-8 text-indigo-400 mb-2 mx-auto" />
                <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] text-center">Hardened Protocol</div>
             </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnvironmentCommand;
