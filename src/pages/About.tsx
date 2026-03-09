import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  Video,
  Zap,
  Bot,
  Shield,
  Globe,
  Cpu,
  Database,
  Code2,
  Shuffle,
  Box,
  ArrowRight,
  Users,
  Mail,
  MessageSquare,
  ChevronDown,
  Lock,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const About = () => {
  const { hash } = useLocation();

  const [expandedLegal, setExpandedLegal] = useState<string | null>(null);

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [hash]);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  return (
    <div className='min-h-screen bg-[#050505] relative overflow-x-hidden font-sans selection:bg-indigo-500/30 text-white'>
      {/* Ambient Background - Homepage matching */}
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505] pointer-events-none' />
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none' />

      <div className='relative z-10'>
        <Navbar />

        {/* Back Button - Premium 10/10 */}

        {/* 1. BELIEF & POSITIONING (HERO) */}
        <section className='container mx-auto px-4 pt-40 pb-32 text-center'>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className='max-w-4xl mx-auto space-y-8'
          >
            <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-white/40 mb-4 backdrop-blur-md'>
              <Code2 className='w-4 h-4' />
              <span className='text-[10px] font-black tracking-[0.2em] uppercase'>
                The Cospira Protocol
              </span>
            </div>

            <h1 className='text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase'>
              BEYOND
              <br />
              <span className='text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40'>
                VIDEO CALLS.
              </span>
            </h1>

            <div className='space-y-4 max-w-2xl mx-auto'>
              <p className='text-xl md:text-2xl text-white/50 leading-relaxed font-medium'>
                Most platforms optimize for attention.
                <br />
                <span className='text-white'>Cospira is built for intention.</span>
              </p>
              <p className='text-base text-white/30 leading-relaxed'>
                We're re-engineering how people meet online. It's not just about seeing faces; it's
                about sharing experiences, breaking bubbles, and collaborating without friction.
              </p>
            </div>
          </motion.div>
        </section>

        {/* 2. HOW COSPIRA WORKS (SYSTEM FLOW) */}
        <section id='how-it-works' className='py-32 px-4 bg-white/[0.01] border-y border-white/5'>
          <div className='container mx-auto max-w-6xl'>
            <motion.div {...fadeInUp} className='text-center mb-20 space-y-4'>
              <h2 className='text-4xl md:text-5xl font-black tracking-tight uppercase'>
                How Cospira Works
              </h2>
              <p className='text-white/40 max-w-xl mx-auto text-lg'>
                A simple system designed around control, privacy, and real connection.
              </p>
            </motion.div>

            <div className='grid md:grid-cols-3 gap-8'>
              {[
                {
                  step: '01',
                  title: 'Enter on Your Terms',
                  icon: Users,
                  desc: 'No forced signup for basic usage. Identity is optional, not mandatory. You choose how visible you are.',
                  outcome: 'You decide when and how you appear.',
                },
                {
                  step: '02',
                  title: 'Choose Your Experience',
                  icon: Shuffle,
                  desc: 'Private Rooms for controlled, invite-only sessions. Random Connect for intent-based discovery. No algorithmic manipulation.',
                  outcome: 'You connect with people — not feeds.',
                },
                {
                  step: '03',
                  title: 'Leave Clean',
                  icon: Trash2,
                  desc: 'No recordings. No session history tracking. Rooms can disappear instantly.',
                  outcome: 'When you leave, the system lets go.',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  {...fadeInUp}
                  transition={{ delay: i * 0.1 }}
                  className='group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all duration-500 backdrop-blur-3xl'
                >
                  <span className='text-6xl font-black text-white/5 group-hover:text-white/10 transition-colors duration-500 mb-6 block font-mono leading-none'>
                    {item.step}
                  </span>
                  <item.icon className='w-10 h-10 text-white mb-6' />
                  <h3 className='text-2xl font-bold mb-4'>{item.title}</h3>
                  <p className='text-white/50 text-sm leading-relaxed mb-6'>{item.desc}</p>
                  <div className='pt-6 border-t border-white/5'>
                    <p className='text-xs font-black uppercase tracking-widest text-indigo-400'>
                      {item.outcome}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. CORE EXPERIENCES (USER PATHS) */}
        <section className='py-32 px-4'>
          <div className='container mx-auto max-w-6xl'>
            <motion.div {...fadeInUp} className='text-center mb-20 space-y-4'>
              <h2 className='text-4xl md:text-5xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40'>
                What You Can Do
              </h2>
              <p className='text-white/40 max-w-xl mx-auto text-lg text-lowercase underline underline-offset-8 decoration-white/10'>
                The Cospira Experience Toolkit
              </p>
            </motion.div>

            <div className='grid md:grid-cols-3 gap-12'>
              <motion.div {...fadeInUp} className='space-y-6'>
                <div className='w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/10 flex items-center justify-center'>
                  <Video className='w-8 h-8 text-white' />
                </div>
                <h3 className='text-2xl font-bold uppercase tracking-tight'>Seamless Rooms</h3>
                <div className='space-y-4'>
                  <p className='text-white/50 text-sm leading-relaxed'>
                    Temporary or permanent spaces built for teams, friends, study, or events.
                  </p>
                  <ul className='space-y-2'>
                    {['Whiteboard integration', 'Instant Screen Sharing', 'Shared Media Hub'].map(
                      (item, i) => (
                        <li
                          key={i}
                          className='flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-white/30'
                        >
                          <div className='w-1 h-1 rounded-full bg-indigo-500' />
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                  <p className='text-xs font-bold text-white pt-2'>
                    Rooms feel owned — not hosted.
                  </p>
                </div>
              </motion.div>

              <motion.div {...fadeInUp} transition={{ delay: 0.1 }} className='space-y-6'>
                <div className='w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/10 flex items-center justify-center'>
                  <Shuffle className='w-8 h-8 text-white' />
                </div>
                <h3 className='text-2xl font-bold uppercase tracking-tight'>Random Connect</h3>
                <div className='space-y-4'>
                  <p className='text-white/50 text-sm leading-relaxed'>
                    Intent-based matching with language and interest signals. No endless scrolling
                    or addiction loops.
                  </p>
                  <ul className='space-y-2'>
                    {['Interest Matching', 'Serendipity Engine', 'Bubble Breaking'].map(
                      (item, i) => (
                        <li
                          key={i}
                          className='flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-white/30'
                        >
                          <div className='w-1 h-1 rounded-full bg-indigo-500' />
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                  <p className='text-xs font-bold text-white pt-2'>Discovery without chaos.</p>
                </div>
              </motion.div>

              <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className='space-y-6'>
                <div className='w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/10 flex items-center justify-center'>
                  <Bot className='w-8 h-8 text-white' />
                </div>
                <h3 className='text-2xl font-bold uppercase tracking-tight'>Intelligence (AI)</h3>
                <div className='space-y-4'>
                  <p className='text-white/50 text-sm leading-relaxed'>
                    Optional AI assistants that help you work, not watch you. Real-time summarizes
                    and translations.
                  </p>
                  <ul className='space-y-2'>
                    {['Smart Summaries', 'Live Translation', 'Action Tracking'].map((item, i) => (
                      <li
                        key={i}
                        className='flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-white/30'
                      >
                        <div className='w-1 h-1 rounded-full bg-indigo-500' />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className='text-xs font-bold text-white pt-2'>
                    Intelligence that assists — not observes.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 4. TRUST, PRIVACY & CONTROL */}
        <section id='privacy' className='py-32 px-4 bg-white/[0.02]'>
          <div className='container mx-auto max-w-4xl text-center'>
            <motion.div {...fadeInUp} className='space-y-6 mb-16'>
              <h2 className='text-4xl md:text-5xl font-black tracking-tight uppercase'>
                Privacy Is the Product
              </h2>
              <div className='w-20 h-1 bg-white mx-auto rounded-full' />
            </motion.div>

            <div className='grid md:grid-cols-2 gap-x-12 gap-y-8 text-left mb-16'>
              {[
                {
                  icon: EyeOff,
                  title: 'No Behavior Tracking',
                  text: "We don't watch how you move or who you talk to.",
                },
                {
                  icon: Shield,
                  title: 'No Data Resale',
                  text: "Your data is not our commodity. We don't sell info.",
                },
                {
                  icon: Lock,
                  title: 'E2E Encryption',
                  text: 'Your rooms are locked from the outside. Always.',
                },
                {
                  icon: Box,
                  title: 'No Recordings',
                  text: 'System-level block on shadow recording. Sessions are transient.',
                },
                {
                  icon: Users,
                  title: 'No Ads',
                  text: 'Zero advertising. Your focus is not for sale.',
                },
                {
                  icon: Zap,
                  title: 'Instant Deletion',
                  text: 'Leave a room, and the data footprint vanishes.',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  {...fadeInUp}
                  transition={{ delay: i * 0.05 }}
                  className='flex items-start gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-colors'
                >
                  <item.icon className='w-5 h-5 text-white/80 shrink-0 mt-1' />
                  <div>
                    <h4 className='font-bold text-white mb-1 uppercase tracking-tight text-sm'>
                      {item.title}
                    </h4>
                    <p className='text-white/40 text-xs leading-relaxed'>{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.p
              {...fadeInUp}
              className='text-xl md:text-2xl font-black uppercase tracking-tight text-white/20 italic'
            >
              "If you don’t trust the system, it doesn’t deserve your presence."
            </motion.p>
          </div>
        </section>

        {/* 5. UNDER THE HOOD */}
        <section className='py-32 px-4 border-b border-white/5'>
          <div className='container mx-auto max-w-5xl'>
            <motion.div {...fadeInUp} className='text-center mb-16 space-y-4'>
              <h2 className='text-3xl font-black tracking-tight uppercase'>
                Built to Disappear When You’re Done
              </h2>
              <p className='text-white/30 text-sm'>
                Infrastructure exists to support experience — not dominate it.
              </p>
            </motion.div>

            <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
              {[
                { icon: Globe, label: 'WebRTC', color: 'text-orange-400' },
                { icon: Cpu, label: 'Node.js', color: 'text-green-400' },
                { icon: Shield, label: 'JWT Auth', color: 'text-emerald-400' },
                { icon: Box, label: 'Docker', color: 'text-blue-500' },
                { icon: Database, label: 'Redis', color: 'text-red-400' },
              ].map((tech, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className='p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-4 hover:border-white/20 transition-all backdrop-blur-3xl'
                >
                  <tech.icon className={`w-8 h-8 ${tech.color}`} />
                  <span className='font-mono text-[10px] font-bold uppercase tracking-widest text-white/50'>
                    {tech.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. CONTACT & FEEDBACK */}
        <section id='contact-section' className='py-32 px-4 bg-white/[0.01]'>
          <div className='container mx-auto max-w-5xl'>
            <motion.h2
              {...fadeInUp}
              className='text-4xl md:text-5xl font-black tracking-tight uppercase text-center mb-20'
            >
              Talk to Us
            </motion.h2>

            <div className='grid md:grid-cols-2 gap-8'>
              <motion.div
                {...fadeInUp}
                className='p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-8'
              >
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400'>
                    <Mail className='w-6 h-6' />
                  </div>
                  <h3 className='text-2xl font-bold uppercase tracking-tight'>Contact</h3>
                </div>
                <div className='space-y-6'>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-black uppercase tracking-widest text-white/20'>
                      General Support
                    </label>
                    <p className='text-lg font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer'>
                      support@cospira.com
                    </p>
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-black uppercase tracking-widest text-white/20'>
                      Security & Privacy
                    </label>
                    <p className='text-lg font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer'>
                      security@cospira.com
                    </p>
                  </div>
                  <p className='text-sm text-white/40 italic'>We read everything. Seriously.</p>
                </div>
              </motion.div>

              <motion.div
                {...fadeInUp}
                transition={{ delay: 0.1 }}
                className='p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-8'
              >
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400'>
                    <MessageSquare className='w-6 h-6' />
                  </div>
                  <h3 className='text-2xl font-bold uppercase tracking-tight'>Feedback</h3>
                </div>
                <div className='space-y-6'>
                  <div className='space-y-4'>
                    <p className='text-white/50 text-sm leading-relaxed'>
                      Feedback is reviewed manually. No automated black holes. The product evolves
                      directly from user signals and real needs.
                    </p>
                    <div className='grid grid-cols-1 gap-3'>
                      {[
                        { label: 'System Logic', text: 'Bugs & Performance issues' },
                        { label: 'Creative Signal', text: 'Feature requests & UI ideas' },
                        { label: 'Direct Impact', text: 'Humanized UX improvements' },
                      ].map((item, i) => (
                        <div key={i} className='flex flex-col gap-1'>
                          <span className='text-[10px] font-black uppercase tracking-widest text-emerald-400/80'>
                            {item.label}
                          </span>
                          <span className='text-xs text-white/30'>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className='pt-6 border-t border-white/5 space-y-6'>
                    <p className='text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 italic'>
                      Recent Impact: User signals improved room latency by 14%.
                    </p>
                    <Link to='/feedback' className='inline-block'>
                      <motion.button
                        whileHover={{ scale: 1.05, x: 5 }}
                        whileTap={{ scale: 0.95 }}
                        className='px-8 h-12 rounded-full bg-white text-black font-black uppercase tracking-widest text-[10px] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all flex items-center gap-3'
                      >
                        Send Feedback
                        <ArrowRight className='w-3.5 h-3.5' />
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 7. LEGAL (SUMMARY) */}
        <section id='legal-section' className='py-32 px-4 border-t border-white/5'>
          <div className='container mx-auto max-w-4xl'>
            <motion.h2
              {...fadeInUp}
              className='text-center text-3xl font-black uppercase tracking-tight mb-16 text-white/30'
            >
              Your Rights on Cospira
            </motion.h2>

            <div className='space-y-4'>
              {[
                {
                  id: 'privacy',
                  title: 'Privacy Policy (Summary)',
                  content:
                    'We collect minimal technical data required for room stability. We never collect or store your conversations, facial data, or personal browsing habits. All transient data is purged upon session termination.',
                },
                {
                  id: 'terms',
                  title: 'Terms of Service (Summary)',
                  content:
                    'Cospira is a platform for open but respectful connection. Malicious usage, illegal streaming, or harassment results in instant system-level bans. You own your content; we merely provide the conduit.',
                },
              ].map((item) => (
                <motion.div
                  key={item.id}
                  {...fadeInUp}
                  className='group rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden'
                >
                  <button
                    onClick={() => setExpandedLegal(expandedLegal === item.id ? null : item.id)}
                    className='w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors'
                  >
                    <span className='font-bold uppercase tracking-tight'>{item.title}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-500 ${expandedLegal === item.id ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {expandedLegal === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                      >
                        <div className='p-6 pt-0 space-y-6'>
                          <p className='text-white/50 text-sm leading-relaxed'>{item.content}</p>
                          <Button
                            variant='outline'
                            className='h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-white/10 hover:bg-white/5'
                          >
                            Read Full {item.id === 'privacy' ? 'Privacy Policy' : 'Terms'}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA (MATCH HOMEPAGE) */}
        <section className='py-40 px-4 text-center relative overflow-hidden'>
          <div className='absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full translate-y-1/2 pointer-events-none' />
          <motion.div {...fadeInUp} className='max-w-2xl mx-auto space-y-10 relative z-10'>
            <h2 className='text-4xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]'>
              READY TO CONNECT
              <br />
              <span className='text-white/20'>WITHOUT FRICTION?</span>
            </h2>

            <div className='flex flex-col sm:flex-row justify-center gap-6'>
              <Link to='/mode-selection'>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className='px-10 h-14 rounded-full bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all flex items-center gap-3'
                >
                  Start a Private Room
                  <ArrowRight className='w-3.5 h-3.5' />
                </motion.button>
              </Link>

              <Link to='/auth'>
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  className='px-10 h-14 rounded-full border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] transition-all'
                >
                  Explore Experiences
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default About;
