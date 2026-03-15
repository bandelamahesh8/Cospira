import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Terminal, ShieldCheck, Zap } from 'lucide-react';
import { CospiraLogo } from '@/components/logo/CospiraLogo';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const FOOTER_LINKS = [
  { group: 'Intelligence', links: [
    { label: 'Neural Recaps' },
    { label: 'Sentiment Engine' },
    { label: 'Contextual Graph' },
    { label: 'Edge Synthesis' },
  ]},
  { group: 'Ecosystem', links: [
    { label: 'Private Hubs' },
    { label: 'Org Clusters' },
    { label: 'Global Arcade' },
    { label: 'API Fabric' },
  ]},
  { group: 'Protocol', links: [
    { label: 'Zero-Trace Policy' },
    { label: 'Audit Logs' },
    { label: 'E2E Architecture' },
    { label: 'OSS Core' },
  ]},
];

const FooterCTA = () => {
  return (
    <footer className="relative bg-[#030407] border-t border-white/5 overflow-hidden">
      {/* ── CLEAN FOOTER ARCHITECTURE ─────────────────────────────────────── */}
      <div className="bg-[#05060c] relative z-10 pt-24 pb-12">
        <div className="hp-container">
          
          {/* Visionary Signature (Founder Quote integrated into footer) */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="mb-24 border-b border-white/5 pb-24"
          >
             <h3 className="text-xl md:text-2xl font-black italic text-white/60 leading-tight tracking-tighter mb-8 max-w-2xl">
               "The internet connected people. Cospira lets them do something <span className="text-white">together.</span> The future of communication isn't just talking — it's <span className="text-white">interacting.</span>"
             </h3>
             <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                   <span className="text-[8px] font-black text-white/40">BM</span>
                </div>
                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Bandela Mahesh (Founder, Cospira)</span>
             </div>
          </motion.div>

          {/* Core Footer Link Grid */}
          <div className="grid lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-16 mb-24">
            {/* Brand Signature */}
            <div className="max-w-xs">
              <div className="flex items-center gap-4 mb-8 group cursor-default">
                 <CospiraLogo size={32} />
                 <div className="flex flex-col">
                    <span className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">Cospira</span>
                    <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em] mt-1">Intelligence Ecosystem</span>
                 </div>
              </div>
              <p className="text-sm font-medium text-white/30 leading-relaxed italic mb-8">
                The high-performance substrate for collaborative presence. Engineered in the edge for those who demand ultimate control and security.
              </p>
              {/* <div className="flex items-center gap-4">
                 {[Twitter, Github, Linkedin].map((Icon, i) => (
                   <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 hover:text-white hover:border-white/20 transition-all">
                      <Icon className="w-4 h-4" />
                   </a>
                 ))}
              </div> */}
            </div>

            {/* Links Sections */}
            {FOOTER_LINKS.map((group) => (
              <div key={group.group}>
                <h4 className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] mb-8">{group.group}</h4>
                <div className="flex flex-col gap-4">
                  {group.links.map((l) => (
                    <span key={l.label} className="text-[11px] font-black text-white/30 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-2 group">
                      <div className="w-1 h-1 rounded-full bg-white/0 group-hover:bg-indigo-400 transition-all" />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* System Telemetry Bar */}
          <div className="relative rounded-3xl p-[1px] overflow-hidden mb-12">
             <GlowingEffect
                spread={48}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={1}
             />
             <div className="relative bg-[#070811] rounded-3xl px-10 py-6 border border-white/5 flex flex-wrap justify-between items-center gap-8">
                <div className="flex items-center gap-12">
                   {[
                     { label: 'Security Protocol', val: 'V4.0_HARDENED', icon: <ShieldCheck className="w-3 h-3 text-emerald-400" /> },
                     { label: 'Network Fabric', val: 'MESH_P2P', icon: <Zap className="w-3 h-3 text-indigo-400" /> },
                     { label: 'System Kernel', val: 'OS_FABRIC_8', icon: <Terminal className="w-3 h-3 text-white/20" /> },
                   ].map(s => (
                     <div key={s.label}>
                        <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.2em] mb-1">{s.label}</div>
                        <div className="flex items-center gap-2">
                           {s.icon}
                           <span className="text-[9px] font-mono text-white/60">{s.val}</span>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-black text-emerald-400 uppercase">Core Systems Operational</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">© 2026 COSPIRA · GLOBAL CLUSTER SYSTEM</p>
                <div className="flex items-center gap-4 text-[9px] font-medium text-white/20 italic">
                   <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                   <div className="w-1 h-1 rounded-full bg-white/10" />
                   <Link to="/terms" className="hover:text-white transition-colors">Terms of Protocol</Link>
                   <div className="w-1 h-1 rounded-full bg-white/10" />
                   <span>Security Audit</span>
                </div>
             </div>
             <div className="flex items-center gap-8">
                <span className="text-[9px] font-mono text-white/10 uppercase tracking-[0.2em] italic">Built with Pride by Bandela Mahesh</span>
                <div className="flex gap-4 border-l border-white/5 pl-8">
                   {['React', 'Mediasoup', 'Rust', 'Supabase'].map(t => (
                     <span key={t} className="text-[8px] font-black text-white/10 uppercase tracking-widest">{t}</span>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterCTA;
