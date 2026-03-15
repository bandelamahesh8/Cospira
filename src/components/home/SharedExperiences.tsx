import { motion } from 'framer-motion';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Monitor, Youtube, MousePointer2, Users, Layout, Zap } from 'lucide-react';

const SharedExperiences = () => {
  return (
    <section className="hp-section overflow-hidden bg-[#030407]">
      <div 
        className="hp-orb absolute top-1/3 right-0 w-[600px] h-[500px]"
        style={{ background: 'rgba(6,182,212,0.08)' }}
      />

      <div className="hp-container relative z-10">
        <div className="hp-section-label">
          <span>05</span>
          <div className="hp-section-label-line" />
          <span>Shared Experiences</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-20 items-end mb-20">
          <div>
            <motion.h2
              className="hp-h2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              The Web, <br />
              <span className="hp-grad-cyan">Synchronized.</span>
            </motion.h2>
          </div>
          <div>
            <motion.p
              className="hp-body text-white/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.12 }}
            >
              Every room in Cospira is equipped with a high-fidelity synchronized engine. 
              Whether it's a 4K frame-perfect stream or a fully shared virtual browser, 
              everyone sees exactly what you see — with zero perceptible lag.
            </motion.p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Panel 1: Sync Watch */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative h-full rounded-[2rem] border-[0.75px] border-white/5 p-2 md:p-3">
              <GlowingEffect
                spread={50}
                glow={true}
                disabled={false}
                proximity={80}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <div className="relative h-full overflow-hidden rounded-[1.5rem] bg-[#05060c] border border-white/5 p-8 shadow-2xl group">
                <div className="flex flex-col h-full relative z-20">
                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-3">
                         <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                           <Youtube className="w-5 h-5" />
                         </div>
                         <div className="text-[10px] font-black text-white uppercase tracking-widest">Cinema Engine // 4K Sync</div>
                       </div>
                       <div className="flex -space-x-2">
                         {[1,2,3,4].map(i => (
                           <div key={i} className="w-6 h-6 rounded-full border-2 border-[#05060c] bg-white/10" />
                         ))}
                       </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden bg-black/60 border border-white/5 relative aspect-video group/player">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div 
                          className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center backdrop-blur-md"
                          whileHover={{ scale: 1.1 }}
                        >
                          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                        </motion.div>
                      </div>
                      
                      <div className="absolute bottom-4 left-4 right-4 space-y-3">
                        <div className="flex justify-between items-center text-[8px] font-mono text-white/40 uppercase tracking-widest">
                          <span>04:20 / 12:00</span>
                          <span>Live // HQ</span>
                        </div>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-cyan-500"
                            animate={{ width: ['35%', '65%', '35%'] }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Sync Watch</h3>
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed mb-6">
                      Frame-perfect synchronization for YouTube and raw video files. One controller, 
                      infinite participants, zero drift.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {['4K SFU Sync', 'Live Reactions', 'Adaptive Bitrate', 'Audio Ducking'].map(tag => (
                        <div key={tag} className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                          <div className="w-1 h-1 rounded-full bg-cyan-500" />
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Panel 2: Co-Browse */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative h-full rounded-[2rem] border-[0.75px] border-white/5 p-2 md:p-3">
              <GlowingEffect
                spread={50}
                glow={true}
                disabled={false}
                proximity={80}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <div className="relative h-full overflow-hidden rounded-[1.5rem] bg-[#05060c] border border-white/5 p-8 shadow-2xl group">
                <div className="flex flex-col h-full relative z-20">
                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-3">
                         <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                           <Layout className="w-5 h-5" />
                         </div>
                         <div className="text-[10px] font-black text-white uppercase tracking-widest">Global Browser // Isolated</div>
                       </div>
                       <div className="flex gap-1">
                          {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/5" />)}
                       </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden bg-black/60 border border-white/5 relative aspect-video">
                      <div className="h-7 border-b border-white/5 bg-white/[0.02] flex items-center px-3 gap-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500/30" />
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/30" />
                        </div>
                        <div className="bg-white/5 rounded-md px-3 py-0.5 flex-1 max-w-[120px]">
                           <div className="w-16 h-1 bg-white/10 rounded-full" />
                        </div>
                      </div>
                      
                      <div className="p-4 flex items-center justify-center h-full relative">
                        <div className="text-center opacity-10">
                          <Users className="w-12 h-12 mx-auto mb-2" />
                          <div className="text-[10px] font-black uppercase tracking-[0.3em]">Collaborative Canvas</div>
                        </div>
                        
                        {/* Simulated Cursors */}
                        <motion.div 
                          className="absolute pointer-events-none flex items-center gap-2"
                          animate={{ 
                            x: [20, 100, 60, 20],
                            y: [10, 50, -20, 10]
                          }}
                          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <MousePointer2 className="w-4 h-4 text-indigo-500 fill-indigo-500" />
                          <div className="px-2 py-0.5 rounded bg-indigo-500 text-[8px] font-bold text-white uppercase">Alex</div>
                        </motion.div>
                        <motion.div 
                          className="absolute pointer-events-none flex items-center gap-2"
                          animate={{ 
                            x: [-40, 20, -10, -40],
                            y: [-30, 10, 40, -30]
                          }}
                          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        >
                          <MousePointer2 className="w-4 h-4 text-cyan-500 fill-cyan-500" />
                          <div className="px-2 py-0.5 rounded bg-cyan-500 text-[8px] font-bold text-white uppercase">Soma</div>
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center gap-3 mb-4">
                      <Monitor className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Virtual Co-Browse</h3>
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed mb-6">
                      A shared virtual machine optimized for high-speed browsing. No plugins required, 
                      no data persistence, total collective control.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {['Multi-Cursor', 'Remote Rendering', 'Secure Input', 'Zero Cache'].map(tag => (
                        <div key={tag} className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                          <div className="w-1 h-1 rounded-full bg-indigo-500" />
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SharedExperiences;
