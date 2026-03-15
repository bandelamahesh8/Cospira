import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Users, Play, Cpu } from 'lucide-react';
import { Magnetic } from './VisualEffects';
import { GlowingEffect } from '@/components/ui/glowing-effect';

// ── PARTICLE CANVAS ──────────────────────────────────────────────────────────
const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener('mousemove', onMouseMove);

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      size: number; alpha: number;
    };

    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          const force = (100 - dist) / 100;
          p.vx += (dx / dist) * force * 0.3;
          p.vy += (dy / dist) * force * 0.3;
        }
        // damping
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;
        // wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 150, 255, ${p.alpha})`;
        ctx.fill();

        // connect nearby
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - d / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.6 }}
    />
  );
};

// ── LIVE TICKER ───────────────────────────────────────────────────────────────
const TICKER_MESSAGES = [
  '⚡ New room created just now',
  '🎮 Multiplayer match started 4 seconds ago',
  '🌐 System latency stable across all regions',
  '🤖 AI session summary delivered to 12 users',
  '🔒 Ultra Mode rooms: 234 active now',
];

const LiveTicker = () => {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % TICKER_MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hp-ticker-wrap">
      <span className="hp-ticker-dot" />
      <motion.span
        key={idx}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -6 }}
        transition={{ duration: 0.3 }}
        style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em' }}
      >
        {TICKER_MESSAGES[idx]}
      </motion.span>
    </div>
  );
};

// ── 3D HERO CARD ─────────────────────────────────────────────────────────────
const HeroCard = () => {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springRx = useSpring(rx, { stiffness: 120, damping: 20 });
  const springRy = useSpring(ry, { stiffness: 120, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rx.set(y * -14);
    ry.set(x * 14);
  }, [rx, ry]);

  const handleMouseLeave = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springRx,
        rotateY: springRy,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className="relative w-full max-w-[540px] mx-auto cursor-default"
    >
      <div className="relative rounded-[2rem] border-[0.75px] border-white/5 p-2.5">
        <GlowingEffect
          spread={60}
          glow={true}
          disabled={false}
          proximity={80}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="relative overflow-hidden rounded-[1.5rem] bg-[#05060c] border border-white/5 shadow-2xl">
          <div style={{ transformStyle: 'preserve-3d' }}>
            {/* Header / Nav simulation */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              </div>
              <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 flex items-center gap-2">
                 <Shield className="w-3 h-3 text-indigo-400" />
                 <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">cospira.live/room/ALPHA-9</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                 <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Secure</span>
              </div>
            </div>

            <div className="p-8">
              {/* Presence Row */}
              <div className="flex items-center justify-between mb-8">
                 <div className="flex -space-x-3">
                   {[1, 2, 3, 4].map((i) => (
                     <div key={i} className="w-10 h-10 rounded-full border-2 border-[#05060c] bg-white/5 overflow-hidden flex items-center justify-center">
                       <span className="text-[10px] font-black text-white/20">{i}</span>
                     </div>
                   ))}
                   <div className="w-10 h-10 rounded-full border-2 border-[#05060c] bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-[10px]">+2</div>
                 </div>
                 <div className="text-right">
                   <div className="text-[10px] font-black text-white uppercase tracking-tighter">12 Active Members</div>
                   <div className="text-[9px] font-mono text-white/20 tracking-widest mt-0.5">EST. 14:02 UTC</div>
                 </div>
              </div>

              {/* Grid of Dynamic Modules */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 group-hover:bg-white/[0.05] transition-colors relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                       <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                         <Users className="w-4 h-4" />
                       </div>
                       <motion.div 
                         className="h-0.5 w-6 bg-indigo-500"
                         animate={{ opacity: [0.3, 1, 0.3] }}
                         transition={{ duration: 1.5, repeat: Infinity }}
                       />
                    </div>
                    <div className="text-[10px] font-black text-white uppercase tracking-tight">Main Room</div>
                    <div className="text-[9px] text-white/20 mt-1 uppercase tracking-widest">Spatial Audio 7.1</div>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 group-hover:bg-white/[0.05] transition-colors relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                       <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                         <Cpu className="w-4 h-4" />
                       </div>
                       <div className="flex gap-0.5">
                          {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-emerald-500/20 rounded-full" />)}
                       </div>
                    </div>
                    <div className="text-[10px] font-black text-white uppercase tracking-tight">Neuro Recap</div>
                    <div className="text-[9px] text-white/20 mt-1 uppercase tracking-widest">Indexing Room DNA</div>
                 </div>
              </div>

              {/* Bottom Feature Pill Row */}
              <div className="flex items-center gap-3">
                 <div className="flex-1 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center gap-3 px-4">
                    <Play className="w-4 h-4 text-white/20" />
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         className="h-full bg-indigo-500" 
                         animate={{ width: ['20%', '60%', '40%'] }} 
                         transition={{ duration: 4, repeat: Infinity }}
                       />
                    </div>
                    <span className="text-[9px] font-mono text-white/20">Synced</span>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Zap className="w-5 h-5 fill-current" />
                 </div>
              </div>

              {/* System Footer info */}
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center opacity-30">
                 <div className="text-[8px] font-mono uppercase tracking-[0.2em]">Kernel // Secure_V8</div>
                 <div className="text-[8px] font-mono uppercase tracking-[0.2em] italic">Peer-to-Peer Fabric</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── HERO SECTION ─────────────────────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 30, rotateX: -20 },
  show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

const HeroSection = () => {
  return (
    <section
      id="content"
      className="hp-section relative min-h-screen flex flex-col justify-center overflow-hidden"
      style={{ paddingTop: '7rem', paddingBottom: '6rem' }}
    >
      {/* Background Layering */}
      <div className="absolute inset-0 hp-grid-bg opacity-40" />
      <div className="hp-orb absolute top-[-15%] left-[10%] w-[800px] h-[800px]"
        style={{ background: 'rgba(99,102,241,0.06)' }} />
      <div className="hp-orb absolute bottom-[5%] right-[5%] w-[600px] h-[600px]"
        style={{ background: 'rgba(139,92,246,0.04)', animationDelay: '8s' }} />
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
         <div className="absolute bottom-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent shadow-[0_0_20px_rgba(99,102,241,0.05)]" />
      </div>

      <ParticleCanvas />

      <div className="hp-container relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-20 items-center">
          {/* LEFT */}
          <motion.div 
            variants={container} 
            initial="hidden" 
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Eyebrow */}
            <motion.div variants={item}>
              <div className="flex items-center gap-3 mb-8">
                 <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                    v4.0 Protocol Active
                 </div>
                 <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>
            </motion.div>

            {/* Ticker */}
            <motion.div variants={item} className="mb-6">
              <LiveTicker />
            </motion.div>

            {/* H1 */}
            <motion.h1 
              variants={item} 
              className="hp-h1" 
              style={{ marginBottom: '1.5rem', lineHeight: 0.9 }}
            >
              <span className="hp-grad-hero hp-glitch italic font-black" data-text="Command Presence.">
                Command Presence.
              </span>
              <br />
              <span className="text-white/20 italic font-black">Connect on</span>{' '}
              <span className="hp-grad-indigo italic font-black">Your Terms.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p 
              variants={item} 
              className="hp-body text-white/50" 
              style={{ maxWidth: '560px', marginBottom: '3rem' }}
            >
              One private room. Video, multiplayer, sync, and AI synthesis running 
              as a singular unified fabric. No installs. No friction. 
              Zero persistent trace.
            </motion.p>

            {/* CTA */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-6 mb-12">
              <Magnetic>
                <Link to="/dashboard" className="hp-btn-primary group">
                  Deploy a Room
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Magnetic>
              <Link to="/docs" className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white transition-colors flex items-center gap-3">
                 Security Overview <div className="w-8 h-[1px] bg-white/10 group-hover:w-12 transition-all" />
              </Link>
            </motion.div>

            {/* Experience Logic */}
            <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 border-t border-white/5">
              {[
                { label: 'E2E Encryption', icon: '🔒' },
                { icon: '🚀', label: 'Instant Spinup' },
                { icon: '🧠', label: 'AI Summarized' },
                { icon: '🎮', label: '10+ Games' },
              ].map((pill) => (
                <div key={pill.label} className="flex flex-col items-center md:items-start gap-1">
                   <span className="text-lg">{pill.icon}</span>
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.1em]">{pill.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — 3D Hero Interface Card */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <HeroCard />
          </motion.div>
        </div>
      </div>

      {/* Advanced Stats Row (Absolute Bottom) */}
      <div className="absolute bottom-0 left-0 w-full border-t border-white/5 bg-white/[0.01] backdrop-blur-md z-20 hidden lg:block">
         <div className="hp-container py-6 flex items-center justify-between">
            <div className="flex gap-12">
               {[
                 { label: 'Network Latency', val: '4ms', unit: 'avg' },
                 { label: 'Room Security', val: '256B', unit: 'aes' },
                 { label: 'Global Uptime', val: '99.9', unit: '%' },
               ].map(s => (
                 <div key={s.label}>
                    <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.2em] mb-1">{s.label}</div>
                    <div className="flex items-baseline gap-1">
                       <span className="text-sm font-black text-white/80 italic">{s.val}</span>
                       <span className="text-[8px] font-mono text-white/20 uppercase">{s.unit}</span>
                    </div>
                 </div>
               ))}
            </div>
            <div className="flex items-center gap-10">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Regional Server Clusters Operational</span>
               </div>
               <div className="text-[9px] font-mono text-white/15">V4.0 // COSPIRA_MAIN_NET</div>
            </div>
         </div>
      </div>

      {/* Floating Scroll indicator */}
      <motion.div
        className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <div className="w-px h-12 bg-gradient-to-b from-indigo-500/50 to-transparent" />
        <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.4em]">Scroll</span>
      </motion.div>
    </section>
  );
};

export default HeroSection;
