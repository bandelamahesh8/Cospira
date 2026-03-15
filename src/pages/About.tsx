import { motion } from 'framer-motion';
import { Shield, Zap, Cpu, Radio, Users, Lock, Globe } from 'lucide-react';
 
import FooterCTA from '@/components/home/FooterCTA';
 
const fadeUp = (delay = 0) => ({
  initial: { y: 28, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});
 
const About = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#030407] text-white selection:bg-indigo-500/30 overflow-x-hidden"
    >
      {/* ── HERO ── */}
      <div className="max-w-6xl mx-auto px-6 pt-24 md:pt-36 pb-12">
        <header className="mb-28 text-center">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-[11px] font-black tracking-[0.3em] uppercase bg-white/5 border border-white/10 rounded-full px-6 py-2 mb-8 text-white/40">
              The Genesis Protocol
            </span>
 
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase mb-8 leading-none">
              Shared <span className="text-indigo-500">Realities.</span><br />
              Unified <span className="text-white/20">Intelligence.</span>
            </h1>
 
            <p className="text-xl md:text-2xl text-white/40 font-medium italic max-w-2xl mx-auto leading-relaxed mb-10">
              "The internet connected people. Cospira lets them do something together.
              The future of communication isn't just talking — it's interacting."
            </p>
 
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-[9px] font-black text-white/40">BM</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20">
                Bandela Mahesh — Founder, Cospira
              </span>
            </div>
          </motion.div>
        </header>
 
        {/* ── CORE PILLARS ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-32">
          {[
            {
              icon: <Cpu className="w-5 h-5" />,
              t: 'Core Infrastructure',
              d: 'Built on high-performance SFU clusters for zero-latency synchronization across the global edge. Every session is stateful, resilient, and real.',
            },
            {
              icon: <Shield className="w-5 h-5" />,
              t: 'Privacy Absolute',
              d: 'Sovereign data governance ensures your interactions remain your own. AES-256 encryption at rest, TLS 1.3 in transit. No exceptions.',
            },
            {
              icon: <Zap className="w-5 h-5" />,
              t: 'Real-time Flow',
              d: 'Fluid session transitions and dynamic environment control powered by our proprietary sync kernel. Sub-50ms latency globally.',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              {...fadeUp(i * 0.1)}
              className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group"
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-base font-black uppercase italic tracking-tight mb-3">{item.t}</h3>
              <p className="text-sm text-white/40 leading-relaxed font-medium">{item.d}</p>
            </motion.div>
          ))}
        </div>
 
        {/* ── ORIGIN STORY ── */}
        <section className="mb-32">
          <div className="bg-[#05060b] border border-white/5 rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[150px] pointer-events-none" />
            <div className="max-w-3xl relative z-10">
              <motion.div {...fadeUp(0)}>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-500/50 mb-6 block">
                  Origin
                </span>
                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-8 leading-tight">
                  Beyond <span className="text-white/20">Meetings.</span><br />
                  Towards <span className="text-indigo-500">Shared Experience.</span>
                </h2>
              </motion.div>
              <motion.div {...fadeUp(0.1)} className="space-y-6 text-lg text-white/50 leading-relaxed font-medium italic">
                <p>
                  In the digital age, we've mastered the art of observation. We scroll, we watch, we listen.
                  But we rarely truly participate together. Cospira was born from a simple realization: human
                  connection is built through shared activity, not just shared sight.
                </p>
                <p>
                  Our platform doesn't just provide a room for you to talk. It provides a world for you to
                  influence. From collaborative engineering to immersive co-browsing, every pixel is
                  synchronized for every participant — in real time, without compromise.
                </p>
                <p>
                  We started with a question: what if the browser itself became a shared canvas? Not a
                  screen share. Not a recording. A live, interactive, co-inhabited space where presence
                  actually means something.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
 
        {/* ── WHAT WE'RE BUILDING ── */}
        <section className="mb-32">
          <motion.div {...fadeUp(0)} className="mb-14">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-500/50 mb-4 block">
              Platform
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-tight">
              What We're <span className="text-indigo-500">Building.</span>
            </h2>
          </motion.div>
 
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: <Radio className="w-5 h-5" />,
                t: 'Live Co-browsing',
                d: 'Browse the web together in real time. Every scroll, click, and interaction is shared — no screen sharing lag, no spectator mode. You\'re both there.',
              },
              {
                icon: <Users className="w-5 h-5" />,
                t: 'Multiplayer Sessions',
                d: 'Create rooms for any purpose — study halls, product reviews, watch parties, design sprints. Invite anyone. Control who sees what.',
              },
              {
                icon: <Globe className="w-5 h-5" />,
                t: 'Universal Compatibility',
                d: 'Works with any website, app, or tool on the internet. No extensions required. No iframes. Just Cospira and a link.',
              },
              {
                icon: <Lock className="w-5 h-5" />,
                t: 'Encrypted by Default',
                d: 'Private sessions are end-to-end protected. Public sessions are isolated per room. Your activity never bleeds across contexts.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.08)}
                className="flex gap-5 p-7 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 group-hover:scale-110 transition-transform mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase italic tracking-tight mb-2">{item.t}</h3>
                  <p className="text-sm text-white/40 leading-relaxed font-medium">{item.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
 
        {/* ── NUMBERS ── */}
        <section className="mb-32">
          <div className="bg-[#05060b] border border-white/5 rounded-[3rem] p-12 md:p-16">
            <motion.div {...fadeUp(0)} className="mb-12 text-center">
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-500/50 mb-4 block">
                By the numbers
              </span>
              <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">
                Built for <span className="text-indigo-500">Scale.</span>
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { v: '<50ms', l: 'Global sync latency' },
                { v: '256-bit', l: 'Encryption standard' },
                { v: '∞', l: 'Sessions per user' },
                { v: '24/7', l: 'Infrastructure uptime' },
              ].map((stat, i) => (
                <motion.div key={i} {...fadeUp(i * 0.08)} className="text-center">
                  <p className="text-3xl md:text-4xl font-black italic tracking-tighter text-white mb-2">{stat.v}</p>
                  <p className="text-xs text-white/30 font-medium uppercase tracking-wider">{stat.l}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
 
        {/* ── VALUES ── */}
        <section className="mb-32">
          <motion.div {...fadeUp(0)} className="mb-14">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-500/50 mb-4 block">
              Principles
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-tight">
              What We <span className="text-indigo-500">Stand For.</span>
            </h2>
          </motion.div>
 
          <div className="space-y-px">
            {[
              {
                n: '01',
                t: 'Presence over passive viewing',
                d: 'Every feature we build asks the same question — does this make people feel more present with each other? If it doesn\'t, we don\'t ship it.',
              },
              {
                n: '02',
                t: 'Human-first, always',
                d: 'Cospira is for humans with emotions, stories, and things to do together. We build for that. We optimize for connection, not engagement metrics.',
              },
              {
                n: '03',
                t: 'Privacy is not a feature',
                d: 'It\'s a foundation. We don\'t sell your data, we don\'t profile your sessions, and we don\'t build ad businesses on the back of your interactions.',
              },
              {
                n: '04',
                t: 'Real-time or nothing',
                d: 'Async is fine for email. Cospira is for the moments that matter now — the ones that require you both to be present at the same time.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.07)}
                className="flex gap-8 py-8 border-b border-white/5 group hover:pl-2 transition-all duration-300"
              >
                <span className="text-[11px] font-black text-white/20 tracking-widest pt-1 shrink-0">{item.n}</span>
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-black uppercase italic tracking-tight mb-2 group-hover:text-indigo-400 transition-colors">{item.t}</h3>
                  <p className="text-sm text-white/40 leading-relaxed font-medium">{item.d}</p>
                </div>
                {/* <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-indigo-500/50 shrink-0 mt-1 transition-colors" /> */}
              </motion.div>
            ))}
          </div>
        </section>
 
        {/* ── FOUNDER ── */}
        <section className="mb-24">
          <motion.div
            {...fadeUp(0)}
            className="bg-[#05060b] border border-white/5 rounded-[3rem] p-12 md:p-16 relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 blur-[120px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
              {/* <div className="shrink-0">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-black text-white/30 italic">BM</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20">Bandela Mahesh</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/40 mt-1">Founder // Cospira</p>
              </div> */}
              <div className="flex-1 space-y-5 text-white/50 font-medium italic leading-relaxed text-lg">
                <p>
                  I built Cospira because I was tired of watching people be near each other online without
                  actually being with each other. Video calls gave us faces. Chat gave us words. But nobody
                  gave us shared hands — a way to actually do something together.
                </p>
                <p>
                  Cospira is my answer to that. It's not a tool for productivity or a platform for content.
                  It's a space for people who want to be genuinely present with someone else — anywhere on
                  the internet, doing anything they care about.
                </p>
                <div className="text-white/30 text-base">
                  <p>Anyone and everyone can use it — as long as they have emotions to share. So robots? Not quite.</p>
                  <p className="text-right mt-8 text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">
                    — Bandela Mahesh (Founder, Cospira)
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
 
      <FooterCTA />
    </motion.div>
  );
};
 
export default About;
 