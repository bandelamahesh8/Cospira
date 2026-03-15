import { motion } from 'framer-motion';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Shield, Users, Server, Activity, ArrowRight } from 'lucide-react';

const OrgSection = () => {
  return (
    <section className="hp-section overflow-hidden">
      <div 
        className="hp-orb absolute top-0 left-[-10%] w-[700px] h-[500px]"
        style={{ background: 'rgba(99,102,241,0.05)' }} 
      />

      <div className="hp-container relative z-10">
        <div className="hp-section-label">
          <span>07</span>
          <div className="hp-section-label-line" />
          <span>Organizations</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-20 items-center mb-20">
          <div>
            <motion.h2
              className="hp-h2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              Command and <br />
              <span className="hp-grad-indigo">Control.</span>
            </motion.h2>
            <motion.p
              className="hp-body mb-8 text-white/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.12 }}
            >
              Enterprise-grade infrastructure without the overhead. Isolated workspaces, 
              granular RBAC, and real-time audit trails for teams who prioritize 
              security and performance.
            </motion.p>
            
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: <Shield className="w-4 h-4 text-indigo-400" />, title: 'Zero-Trust Access', sub: 'SIEM integration' },
                { icon: <Users className="w-4 h-4 text-cyan-400" />, title: 'Smart Breakouts', sub: 'Matchmaking API' },
                { icon: <Activity className="w-4 h-4 text-emerald-400" />, title: 'Audit Logs', sub: 'Immutable history' },
                { icon: <Server className="w-4 h-4 text-amber-400" />, title: 'Siloed Compute', sub: 'Private instances' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="mb-3">{item.icon}</div>
                    <div className="text-xs font-black text-white uppercase tracking-tight">{item.title}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{item.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button 
              className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors group"
              whileHover={{ x: 5 }}
            >
              Contact Sales for Enterprise <ArrowRight className="w-3 h-3 group-hover:text-indigo-500" />
            </motion.button>
          </div>

          {/* Premium Org Dashboard Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-[2rem] border-[0.75px] border-white/5 p-3">
              <GlowingEffect
                spread={60}
                glow={true}
                disabled={false}
                proximity={80}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <div className="relative overflow-hidden rounded-[1.5rem] bg-[#05060c] border border-white/5 p-8 shadow-2xl">
                <div style={{ transformStyle: 'preserve-3d' }}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-400">A</div>
                      <div>
                        <div className="text-[10px] font-black text-white uppercase tracking-widest">Acme Global</div>
                        <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-0.5">Workspace Alpha-9</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                       {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/5" />)}
                    </div>
                  </div>
                  
                  {/* Active Grid Cells */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-white/60 uppercase">San Francisco HQ</span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-white italic tracking-tighter">18</span>
                        <span className="text-[9px] text-white/20 uppercase mb-1.5 font-bold">Active Rooms</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[9px] font-black text-white/60 uppercase">London Core</span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-white italic tracking-tighter">42</span>
                        <span className="text-[9px] text-white/20 uppercase mb-1.5 font-bold">Participants</span>
                      </div>
                    </div>
                  </div>

                  {/* Room Strip */}
                  <div className="space-y-2 mb-8">
                    {['Product Design', 'Engineering Sync', 'Security Audit'].map((room, i) => (
                      <div key={room} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-default">
                        <div className="w-1 h-8 rounded-full" style={{ background: i === 0 ? '#6366f1' : i === 1 ? '#06b6d4' : '#f59e0b' }} />
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-tight">{room}</span>
                        <div className="ml-auto flex -space-x-1.5">
                          {[1,2,3].map(p => <div key={p} className="w-5 h-5 rounded-full border border-[#05060c] bg-white/10" />)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex gap-4">
                      <div>
                        <div className="text-[8px] text-white/20 uppercase font-black mb-1">Bandwidth</div>
                        <div className="h-0.5 w-12 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-indigo-500" 
                            animate={{ width: ['20%', '60%', '40%'] }}
                            transition={{ duration: 4, repeat: Infinity }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] text-white/20 uppercase font-black mb-1">Latency</div>
                        <div className="h-0.5 w-12 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-emerald-500" 
                            animate={{ width: ['10%', '30%', '20%'] }}
                            transition={{ duration: 3, repeat: Infinity }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-[8px] font-mono text-white/40">v1.2 // SECURE_MESH</div>
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

export default OrgSection;
