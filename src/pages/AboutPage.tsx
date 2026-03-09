import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Users,
  Globe,
  Cpu,
  Command,
  Activity,
  Terminal,
  Lock,
  MessageSquare,
  Radio,
} from 'lucide-react';
import FeedbackModal from '@/components/FeedbackModal';
import { LiveMap } from '@/components/dashboard/LiveMap';
import { Button } from '@/components/ui/button';

const AboutPage = () => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className='bg-[#020408] text-white min-h-screen overflow-y-auto custom-scrollbar'>
      {/* Background Gradients */}
      <div className='fixed inset-0 pointer-events-none'>
        <div className='absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent blur-3xl opacity-30' />
        <div className='absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] opacity-20' />
      </div>

      <div className='relative max-w-7xl mx-auto px-6 py-20 lg:px-8 space-y-32'>
        {/* 1. HERO SECTION */}
        <motion.div
          initial='hidden'
          animate='visible'
          variants={containerVariants}
          className='flex flex-col items-center text-center space-y-8'
        >
          <motion.div variants={itemVariants} className='relative group cursor-default'>
            <div className='absolute -inset-1 bg-gradient-to-r from-cyan-400 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200' />
            <div className='relative flex items-center gap-3 px-6 py-2 bg-black rounded-xl border border-white/10'>
              <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
              <span className='text-xs font-bold tracking-[0.2em] uppercase text-white/60'>
                System Online v4.2.0
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className='text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase italic leading-[0.85]'
          >
            <span className='text-white/20 block text-4xl md:text-5xl lg:text-6xl mb-4 not-italic font-bold tracking-normal opacity-50'>
              Welcome to
            </span>
            Cospira{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400'>
              OS
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className='text-xl md:text-2xl text-slate-400 max-w-3xl leading-relaxed font-light'
          >
            The definitive platform for{' '}
            <span className='text-white font-medium'>real-time cognitive collaboration</span>.
            Merging secure communication, AI-driven analytics, and decentralized social mesh
            networking into a single, cohesive operating environment.
          </motion.p>

          <motion.div variants={itemVariants} className='flex items-center gap-4 pt-4'>
            <Button
              onClick={() => setIsFeedbackOpen(true)}
              className='h-14 px-8 bg-white text-black hover:bg-zinc-200 rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-2 group transition-all'
            >
              <span>Transmit Feedback</span>
              <MessageSquare className='w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform' />
            </Button>
            <Button
              variant='outline'
              className='h-14 px-8 border-white/10 hover:bg-white/5 text-white rounded-full font-bold uppercase tracking-widest text-xs'
            >
              View Docs
            </Button>
          </motion.div>
        </motion.div>

        {/* 2. LIVE SIGNALS / MAP VISUALIZATION */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className='relative w-full rounded-[32px] overflow-hidden border border-white/10 bg-[#0c1016]/50 backdrop-blur-sm'
        >
          <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50' />

          <div className='p-8 md:p-12 border-b border-white/5'>
            <div className='flex flex-col md:flex-row justify-between items-start md:items-end gap-6'>
              <div className='space-y-2'>
                <div className='flex items-center gap-3 text-cyan-400 mb-2'>
                  <Radio className='w-5 h-5 animate-pulse' />
                  <h3 className='text-sm font-black uppercase tracking-[0.2em]'>
                    Live Neural Mesh
                  </h3>
                </div>
                <h2 className='text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white'>
                  Global Signal <br className='hidden md:block' /> Visualization
                </h2>
              </div>
              <p className='max-w-md text-sm text-slate-400 leading-relaxed text-right md:text-left'>
                Tracking active nodes, encrypted data streams, and synchronized user sessions across
                the global Cospira network in real-time.
              </p>
            </div>
          </div>

          <div className='p-6 md:p-8 bg-black/20'>
            {/* THE LIVE MAP COMPONENT */}
            <div className='w-full shadow-2xl rounded-2xl overflow-hidden ring-1 ring-white/10'>
              <LiveMap />
            </div>
          </div>
        </motion.section>

        {/* 3. CORE ARCHITECTURE GRID */}
        <section>
          <div className='flex items-center gap-4 mb-16'>
            <div className='w-12 h-[2px] bg-indigo-500' />
            <h2 className='text-2xl font-black uppercase tracking-widest italic text-white/80'>
              System Architecture
            </h2>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {[
              {
                icon: Zap,
                color: 'text-amber-400',
                title: 'Zero-Latency Protocol',
                desc: 'Our proprietary WebSocket mesh ensures signal propagation times below 15ms globally. Actions are optimistic, updates are atomic.',
              },
              {
                icon: Lock,
                color: 'text-emerald-400',
                title: 'E2E Encryption',
                desc: 'All room data is encrypted at rest and in transit. Temporary secure enclaves are generated for each session and vaporized upon termination.',
              },
              {
                icon: Cpu,
                color: 'text-purple-400',
                title: 'AI Neural Nexus',
                desc: 'Integrated LLM agents (Project Gemini) monitor room telemetry to provide context-aware suggestions, moderation, and automated tasks.',
              },
              {
                icon: Globe,
                color: 'text-blue-400',
                title: 'Universal Sync',
                desc: 'Session state is mirrored across devices instantly via Supabase Realtime Channels, allowing seamless handoff between desktop and mobile.',
              },
              {
                icon: Terminal,
                color: 'text-slate-400',
                title: 'Developer API',
                desc: 'Extensible plugin architecture allows third-party modules to hook into the event stream for custom bot integrations and analytics.',
              },
              {
                icon: Activity,
                color: 'text-rose-400',
                title: 'Health Telemetry',
                desc: 'Self-healing infrastructure automatically re-routes traffic around network partitions to maintain 99.99% uptime.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className='group p-8 rounded-[32px] bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all'
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${item.color}`}
                >
                  <item.icon size={28} />
                </div>
                <h3 className='text-xl font-bold uppercase tracking-tight mb-3 group-hover:text-white transition-colors'>
                  {item.title}
                </h3>
                <p className='text-sm text-slate-500 leading-relaxed font-medium'>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 4. OPERATIONAL MANUAL (NEW SECTION) */}
        <section className='space-y-20'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-[2px] bg-emerald-500' />
            <h2 className='text-2xl font-black uppercase tracking-widest italic text-white/80'>
              Operational Manual
            </h2>
          </div>

          {/* 4.1. ROOM MODES */}
          <div className='space-y-8'>
            <div className='flex items-center gap-3 mb-8'>
              <Activity className='text-emerald-400' />
              <h3 className='text-xl font-bold uppercase tracking-tight'>Environment Modes</h3>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <motion.div
                whileHover={{ y: -5 }}
                className='p-8 rounded-[2rem] bg-gradient-to-b from-[#1a1f2e] to-[#0c1016] border border-white/10 relative overflow-hidden group'
              >
                <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
                  <Shield size={100} />
                </div>
                <h4 className='text-2xl font-black uppercase italic text-blue-400 mb-4'>
                  Standard
                </h4>
                <p className='text-slate-400 text-sm mb-6 leading-relaxed'>
                  Optimized for high-stakes professional collaboration. Prioritizes audio clarity,
                  screen sharing, and document syncing.
                </p>
                <ul className='space-y-3'>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full' />
                    <span>Secure Enclave</span>
                  </li>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full' />
                    <span>Low-Latency Voice</span>
                  </li>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full' />
                    <span>AI Meeting Notes</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                whileHover={{ y: -5 }}
                className='p-8 rounded-[2rem] bg-gradient-to-b from-[#2e1a2e] to-[#0c1016] border border-white/10 relative overflow-hidden group'
              >
                <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
                  <Users size={100} />
                </div>
                <h4 className='text-2xl font-black uppercase italic text-pink-400 mb-4'>Social</h4>
                <p className='text-slate-400 text-sm mb-6 leading-relaxed'>
                  Casual environments for hanging out. Enables media sharing, YouTube sync, and
                  relaxed layouts.
                </p>
                <ul className='space-y-3'>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-pink-500 rounded-full' />
                    <span>Media Sync Node</span>
                  </li>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-pink-500 rounded-full' />
                    <span>Spatial Audio</span>
                  </li>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-pink-500 rounded-full' />
                    <span>Emoji Reactions</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                whileHover={{ y: -5 }}
                className='p-8 rounded-[2rem] bg-gradient-to-b from-[#2e2a1a] to-[#0c1016] border border-white/10 relative overflow-hidden group'
              >
                <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
                  <Zap size={100} />
                </div>
                <h4 className='text-2xl font-black uppercase italic text-amber-400 mb-4'>Gaming</h4>
                <p className='text-slate-400 text-sm mb-6 leading-relaxed'>
                  High-performance mode with overlay supports, game state synchronization, and
                  competitive tools.
                </p>
                <ul className='space-y-3'>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-amber-500 rounded-full' />
                    <span>Game Overlay</span>
                  </li>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-amber-500 rounded-full' />
                    <span>Score Tracking</span>
                  </li>
                  <li className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60'>
                    <span className='w-1.5 h-1.5 bg-amber-500 rounded-full' />
                    <span>Discord Integration</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>

          {/* 4.2. INTERFACE CONTROLS */}
          <div className='space-y-8'>
            <div className='flex items-center gap-3 mb-8'>
              <Command className='text-indigo-400' />
              <h3 className='text-xl font-bold uppercase tracking-tight'>Control Nexus</h3>
            </div>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {[
                {
                  icon: Globe,
                  label: 'Virtual Browser',
                  desc: 'Launch a shared, cloud-hosted browser instance inside the room.',
                },
                {
                  icon: Command,
                  label: 'AI Summary',
                  desc: 'Generate instant transcripts and action items via Gemini 1.5.',
                },
                {
                  icon: Radio,
                  label: 'YouTube Sync',
                  desc: 'Frame-perfect video synchronization for all participants.',
                },
                {
                  icon: Terminal,
                  label: 'Code Editor',
                  desc: 'Real-time collaborative monaco editor with syntax highlighting.',
                },
                {
                  icon: Shield,
                  label: 'Security',
                  desc: 'Toggle room lock, waiting room, and encryption keys.',
                },
                {
                  icon: Activity,
                  label: 'Analytics',
                  desc: 'View connection quality and neural mesh latency stats.',
                },
                {
                  icon: Lock,
                  label: 'Private Mode',
                  desc: 'Sever external links and go dark for maximum privacy.',
                },
                {
                  icon: Zap,
                  label: 'Turbo Mode',
                  desc: 'reduce stream quality to prioritize audio latency.',
                },
              ].map((ctrl, i) => (
                <div
                  key={i}
                  className='p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors'
                >
                  <ctrl.icon className='w-8 h-8 text-white/40 mb-4' />
                  <h5 className='text-sm font-bold uppercase tracking-wider text-white mb-2'>
                    {ctrl.label}
                  </h5>
                  <p className='text-xs text-slate-500 leading-relaxed'>{ctrl.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. FOOTER / META INFO */}
        <footer className='border-t border-white/10 pt-20 pb-12'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-12 mb-12'>
            <div className='space-y-6'>
              <h3 className='text-3xl font-black uppercase italic tracking-tighter'>
                Cospira <span className='text-indigo-500'>Labs</span>
              </h3>
              <p className='text-slate-500 max-w-sm'>
                Built for the future of work and play. We are a distributed team of engineers,
                designers, and futurists.
              </p>
            </div>
            <div className='flex flex-col items-start md:items-end justify-between space-y-6'>
              <div className='flex gap-4'>
                <Button
                  variant='ghost'
                  className='text-xs uppercase tracking-widest text-white/40 hover:text-white'
                >
                  Terms
                </Button>
                <Button
                  variant='ghost'
                  className='text-xs uppercase tracking-widest text-white/40 hover:text-white'
                >
                  Privacy
                </Button>
                <Button
                  variant='ghost'
                  className='text-xs uppercase tracking-widest text-white/40 hover:text-white'
                >
                  Status
                </Button>
              </div>
              <div className='text-right'>
                <p className='text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1'>
                  ● All Systems Operational
                </p>
                <p className='text-xs text-white/20 font-mono'>
                  Server Time: {new Date().toISOString()}
                </p>
              </div>
            </div>
          </div>
          <div className='text-center text-[10px] uppercase tracking-[0.2em] text-white/10'>
            © 2026 Cospira Intelligent Systems Inc.
          </div>
        </footer>
      </div>

      {/* FEEDBACK MODAL */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
};

export default AboutPage;
