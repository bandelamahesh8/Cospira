import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Zap, Lock, Activity, FileText, CheckCircle2, Sparkles, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import AuthMascot from '@/components/auth/AuthMascot';

// --- DATA & CONTENT ---
const tensionLines = [
  '🔵 2 private rooms created just now',
  '🔵 Last match: 4 seconds ago',
  '🔵 System load: Stable',
];

// --- COMPONENTS ---

// 1. TENSION LINE (Live Element)
const TensionLine = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % tensionLines.length);
    }, 6000); // 6 seconds per update
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='flex justify-center mt-6 h-8'>
      <AnimatePresence mode='wait'>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className='flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold tracking-wide uppercase'
        >
          {tensionLines[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// 2. WOW SECTION: ANIMATED MATCHING FLOW (REALISM)
const SemanticMatching = () => {
  const [step, setStep] = useState(0); // 0: Idle, 1: Scan, 2: Nodes, 3: Filter/Match, 4: Result

  useEffect(() => {
    const loop = async () => {
      while (true) {
        setStep(0);
        await new Promise((r) => setTimeout(r, 2000));
        setStep(1);
        await new Promise((r) => setTimeout(r, 1500)); // Labels
        setStep(2);
        await new Promise((r) => setTimeout(r, 1000)); // Nodes appear
        setStep(3);
        await new Promise((r) => setTimeout(r, 3000)); // Match lock
        setStep(4);
        await new Promise((r) => setTimeout(r, 1000)); // Dissolve
        await new Promise((r) => setTimeout(r, 15000)); // Rest for 15s
      }
    };
    loop();
  }, []);

  // Layout nodes in a circle
  const nodes = Array.from({ length: 6 }).map((_, i) => {
    const angle = i * 60 * (Math.PI / 180);
    const radius = 140;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, id: i };
  });

  const matchIndex = 2; // Node at approx 120 degrees

  return (
    <div className='relative w-full h-[400px] md:h-[500px] flex items-center justify-center overflow-hidden rounded-[3rem] bg-black border border-white/5 shadow-2xl'>
      {/* Grid */}
      <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20' />

      {/* 1. Labels (Scan Phase) */}
      <AnimatePresence>
        {step >= 1 && step < 4 && (
          <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
            {['Language: EN', 'Intent: Serious', 'Boundaries: Strict'].map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 60 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.2 }}
                className='absolute text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 whitespace-nowrap'
                style={{ transform: `translateY(${(i - 1) * 30}px)` }} // Stack vertically
              >
                {label}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* 2. Nodes (Filtering) */}
      <AnimatePresence>
        {step >= 2 &&
          step < 4 &&
          nodes.map((node, i) => {
            const isMatch = i === matchIndex;
            // If we are in "Match" step (3), non-matches fade out
            const isVisible = step === 3 ? isMatch : true;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: isVisible ? 1 : 0.1,
                  scale: 1,
                  x: node.x,
                  y: node.y,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.5 }}
                className={`absolute w-3 h-3 rounded-full border border-black/50 ${isMatch && step === 3 ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 'bg-white/20'}`}
              >
                {/* Match Line */}
                {isMatch && step === 3 && (
                  <svg className='absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible'>
                    <motion.line
                      x1='50%'
                      y1='50%'
                      x2='150'
                      y2='150' // To Center (relative to svg center 150,150)
                    />
                  </svg>
                )}
              </motion.div>
            );
          })}
      </AnimatePresence>

      {/* Connecting Line (drawn from center to match node) */}
      {step === 3 && (
        <svg className='absolute inset-0 w-full h-full pointer-events-none'>
          <motion.line
            x1='50%'
            y1='50%'
            x2={`calc(50% + ${nodes[matchIndex].x}px)`}
            y2={`calc(50% + ${nodes[matchIndex].y}px)`}
            stroke='rgba(52, 211, 153, 0.4)'
            strokeWidth='1'
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
        </svg>
      )}

      {/* 3. Center Node (YOU) */}
      <motion.div
        animate={{
          scale: step === 1 ? 1.05 : 1,
          borderColor: step === 3 ? 'rgba(52, 211, 153, 0.5)' : 'rgba(255, 255, 255, 0.1)',
        }}
        className='relative z-10 w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-2xl transition-colors duration-500'
      >
        <div
          className={`absolute inset-0 rounded-full bg-white/5 ${step === 3 ? 'bg-emerald-500/20' : ''}`}
        />
        <span
          className={`font-bold text-[10px] tracking-widest ${step === 3 ? 'text-emerald-400' : 'text-white'}`}
        >
          YOU
        </span>

        {/* Pulse ring */}
        <div className='absolute inset-0 rounded-full border border-white/5 animate-pulse-slow scale-150 opacity-50' />
      </motion.div>

      {/* 4. Match Confirmation Text */}
      <AnimatePresence>
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className='absolute bottom-12 font-mono text-emerald-400/90 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full border border-emerald-500/20 backdrop-blur-md'
          >
            <CheckCircle2 className='w-3 h-3' /> Match confirmed in 0.42s
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 3. AI SECTION: BEFORE / AFTER CARDS
const AICards = () => {
  return (
    <div className='grid md:grid-cols-2 gap-8 relative'>
      {/* BEFORE CARD */}
      <motion.div
        whileHover={{ y: -3 }}
        className='p-8 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group'
      >
        <div className='absolute top-0 right-0 p-4 opacity-50'>
          <div className='text-[10px] font-bold uppercase tracking-widest text-red-500'>Before</div>
        </div>
        <div className='space-y-4 opacity-50 group-hover:opacity-60 transition-opacity blur-[0.5px]'>
          <div className='flex gap-3'>
            <div className='w-8 h-8 rounded-full bg-red-500/10' />
            <div className='space-y-2'>
              <div className='h-2 w-24 bg-red-500/10 rounded' />
              <div className='h-16 w-48 bg-red-500/10 rounded' />
            </div>
          </div>
          <div className='flex gap-3 flex-row-reverse'>
            <div className='w-8 h-8 rounded-full bg-red-500/10' />
            <div className='space-y-2 text-right'>
              <div className='h-2 w-24 bg-red-500/10 rounded ml-auto' />
              <div className='h-12 w-40 bg-red-500/10 rounded ml-auto' />
            </div>
          </div>
        </div>
        <div className='mt-8 pt-4 border-t border-white/5 disabled:border-red-500/10'>
          <p className='text-sm text-red-400/60 font-mono'>
            Status: Chaotic, Unstructured, Forgettable.
          </p>
        </div>
      </motion.div>

      {/* AFTER CARD - THE "10/10" FEEL */}
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        className='p-8 rounded-3xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 relative overflow-hidden group shadow-[0_0_40px_rgba(79,70,229,0.1)]'
      >
        <div className='absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors' />
        <div className='absolute top-0 right-0 p-4'>
          <div className='flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400'>
            <CheckCircle2 className='w-3 h-3' /> After
          </div>
        </div>

        <div className='relative z-10 space-y-6'>
          <div className='space-y-3'>
            <div className='flex items-center gap-2 text-indigo-300'>
              <FileText className='w-4 h-4' />
              <span className='text-sm font-bold'>Key Decision Identified</span>
            </div>
            <p className='pl-6 text-2xl font-medium text-white'>"Launch Q4 Campaign."</p>
          </div>

          <div className='space-y-3'>
            <div className='flex items-center gap-2 text-indigo-300'>
              <Activity className='w-4 h-4' />
              <span className='text-sm font-bold'>Action Item Created</span>
            </div>
            <p className='pl-6 text-white/70 text-sm'>
              Assigned to @Sarah: Draft budget by Friday.
            </p>
          </div>
        </div>

        <div className='mt-8 pt-4 border-t border-indigo-500/20'>
          <p className='text-sm text-indigo-300/80 font-mono flex items-center gap-2'>
            <Sparkles className='w-3 h-3 animate-pulse' /> Intelligence that disappears when you
            don't need it.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- MAIN PAGE ---

const Index = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0.6 }} // Phase 2: subtly fades
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      className='min-h-screen bg-[#050505] relative overflow-x-hidden font-sans selection:bg-indigo-500/30'
    >
      <Navbar />

      {/* --- PHASE 2: HERO SECTION --- */}
      <section className='relative min-h-[90vh] flex flex-col justify-center items-center pt-20 px-4'>
        {/* Background Atmosphere */}
        <div className='fixed inset-0 z-0 bg-[#050505] pointer-events-none'>
          {/* BACKGROUND LOGO WATERMARK */}
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] opacity-[0.03] select-none flex items-center justify-center'>
            <img
              src='/cospira-logo.png'
              alt=''
              className='w-full h-full object-contain grayscale-[0.5] blur-[2px]'
            />
          </div>

          <div className='absolute top-1/3 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[100px] animate-pulse-slow' />
          <div
            className='absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[100px] animate-pulse-slow'
            style={{ animationDelay: '1s' }}
          />

          {/* PHASE 3: ORBITAL CORE = SYSTEM HEART */}
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.08]'>
            <AuthMascot state='IDLE' orbIntensity={0.15} />
          </div>
        </div>

        <div className='container mx-auto max-w-5xl relative z-10 text-center'>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className='text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.95]'>
              Command Presence.
              <br />
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-300'>
                Connect on Your Terms.
              </span>
            </h1>

            <p className='text-xl md:text-2xl text-white/50 max-w-2xl mx-auto font-medium leading-relaxed'>
              Private, encrypted spaces designed for real human connection — not surveillance.
            </p>

            <TensionLine />

            {/* CTA STACK */}
            <div className='flex flex-col items-center gap-6 mt-12'>
              <div className='flex flex-col sm:flex-row items-center gap-6'>
                {/* Primary CTA */}
                <Link to='/dashboard'>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }} // Phase 2: compresses slightly
                    className='group relative px-8 py-4 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]'
                  >
                    Start a Private Room
                    <div className='absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 via-white to-indigo-400 opacity-0 group-hover:opacity-20 animate-pulse-gap' />
                  </motion.button>
                </Link>

                {/* Secondary CTA */}
                <Link to='/connect'>
                  <button className='flex items-center gap-2 px-8 py-4 rounded-full border border-white/10 text-white/60 font-bold text-sm uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all'>
                    Random Connect <Play className='w-3 h-3 fill-current' />
                  </button>
                </Link>
              </div>

              <div className='flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/30'>
                <span>No signup</span>
                <span className='w-1 h-1 rounded-full bg-white/20' />
                <span>No recording</span>
                <span className='w-1 h-1 rounded-full bg-white/20' />
                <span>Instant exit</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- PHASE 3: WOW SECTION --- */}
      <section id='how-it-works' className='py-32 px-4 relative'>
        <div className='container mx-auto max-w-6xl'>
          <div className='mb-16 md:text-center max-w-3xl mx-auto'>
            <h2 className='text-5xl md:text-7xl font-black text-white tracking-tighter mb-6'>
              Watch the system think.
            </h2>
            <p className='text-xl text-white/40'>
              We don't match randomly. We match by intent, language, and boundaries.
            </p>
          </div>

          <SemanticMatching />
        </div>
      </section>

      {/* --- PHASE 4: AI SECTION --- */}
      <section id='experience' className='py-32 px-4 bg-white/[0.02] border-y border-white/5'>
        <div className='container mx-auto max-w-5xl'>
          <div className='grid md:grid-cols-2 gap-12 mb-16 items-center'>
            <div>
              <h2 className='text-4xl font-black text-white mb-4'>Focus on the conversation.</h2>
              <p className='text-indigo-300'>Let the system handle the noise.</p>
            </div>
            <div className='flex justify-end'>
              <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest'>
                <Zap className='w-4 h-4' /> Live Intelligence
              </div>
            </div>
          </div>

          <AICards />
        </div>
      </section>

      {/* --- PHASE 5: CTA LOOP --- */}
      <section id='privacy' className='py-40 px-4 text-center relative overflow-hidden'>
        {/* Glow behind */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none' />

        <div className='container mx-auto relative z-10 max-w-3xl'>
          <h2 className='text-6xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.9]'>
            Create once.
            <br />
            Control forever.
          </h2>

          <div className='flex flex-col items-center gap-8'>
            <Link to='/dashboard'>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='group relative overflow-hidden text-lg md:text-xl px-12 py-6 rounded-full bg-white text-black font-black uppercase tracking-widest hover:bg-zinc-100 transition-all shadow-[0_20px_60px_rgba(255,255,255,0.2)] duration-200'
              >
                Start Private Room
                <div className='absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 via-white to-indigo-400 opacity-0 group-hover:opacity-20 animate-pulse-gap' />
              </motion.button>
            </Link>

            <p className='text-sm font-medium text-white/30 flex items-center gap-2'>
              <Lock className='w-3 h-3' /> Rooms self-destruct when the host leaves.
            </p>
          </div>
        </div>
        {/* --- PHASE 4: FOOTER AUTHORITY --- */}
        <div className='mt-32 text-center'>
          <p className='text-white/40 text-[11px] font-bold tracking-[0.2em] uppercase mb-3'>
            No ads • No recordings • No data resale
          </p>
          <div className='inline-flex items-center gap-4 text-white/20 text-[10px] font-mono border-t border-white/5 pt-3 px-6'>
            <span>Built with WebRTC</span>
            <span className='w-1 h-1 rounded-full bg-white/10' />
            <span>Encrypted by design</span>
          </div>
        </div>
      </section>

      <Footer />
    </motion.div>
  );
};

export default Index;
