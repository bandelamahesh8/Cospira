import { motion } from 'framer-motion';
import { DepthLayer } from './VisualEffects';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const USE_CASES = [
  {
    icon: '🏢',
    label: 'Remote Teams',
    desc: 'Beyond daily standups—AI-summarized rooms that track decisions and action items automatically.',
    color: '#6366f1',
    features: ['Auto Action Items', 'Smart Breakouts', 'Decision Logging'],
    size: 'large',
  },
  {
    icon: '🎮',
    label: 'Gaming Hubs',
    desc: 'Host multiplayer nights with 10+ built-in games, ELO tracking, and live results.',
    color: '#8b5cf6',
    features: ['ELO Ranking', 'Low Latency', 'Multiplayer SDK'],
    size: 'small',
  },
  {
    icon: '📚',
    label: 'Online Learning',
    desc: 'Interactive education with co-browsing, AI quizzes, and live accessibility captions.',
    color: '#06b6d4',
    features: ['AI Quiz Engine', 'Live Captions', 'Co-Browse Control'],
    size: 'small',
  },
  {
    icon: '🎬',
    label: 'Watch Parties',
    desc: 'Perfectly synced YouTube streaming with live emoji reactions and shared browsing.',
    color: '#10b981',
    features: ['Frame-Sync Player', 'Live Reactions', 'Social Feed'],
    size: 'medium',
  },
  {
    icon: '🛡️',
    label: 'Secure Interviews',
    desc: 'Zero-trust environment for highly sensitive hiring sessions with automated audit trails.',
    color: '#f59e0b',
    features: ['Zero-Trust Security', 'Audit Logging', 'E2E Encryption'],
    size: 'medium',
  },
];

const UseCases = () => {
  return (
    <section className='hp-section overflow-hidden'>
      <div
        className='hp-orb absolute bottom-0 right-[-10%] w-[600px] h-[500px]'
        style={{ background: 'rgba(6,182,212,0.05)' }}
      />

      <div className='hp-container relative z-10'>
        <div className='hp-section-label'>
          <span>08</span>
          <div className='hp-section-label-line' />
          <span>Practical Utility</span>
        </div>

        <div className='flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16'>
          <div className='max-w-2xl'>
            <motion.h2
              className='hp-h2'
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              Engineered for Every <br />
              <span className='hp-grad-hero'>Communication Layer.</span>
            </motion.h2>
          </div>
          <motion.p
            className='hp-body text-white/40 lg:mb-4'
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            Cospira adapts its core engine to fit the specific constraints of your session, ensuring
            maximum intelligence and zero overhead.
          </motion.p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {USE_CASES.map((uc, i) => (
            <motion.div
              key={uc.label}
              className={`${uc.size === 'large' ? 'lg:col-span-2' : ''} ${uc.size === 'medium' ? 'md:col-span-1' : ''}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className='relative h-full rounded-[1.5rem] border-[0.75px] border-white/5 p-2 md:p-3'>
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                <div className='relative h-full overflow-hidden rounded-2xl border-[0.75px] bg-[#05060c] p-8 shadow-sm transition-colors duration-500 group'>
                  <div
                    className='flex flex-col h-full relative z-20'
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className='flex justify-between items-start mb-12'>
                      <DepthLayer depth={80}>
                        <div className='w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500'>
                          {uc.icon}
                        </div>
                      </DepthLayer>
                      <DepthLayer
                        depth={20}
                        className='font-mono text-[10px] text-white/10 uppercase tracking-[0.2em]'
                      >
                        Case Study 0{i + 1}
                      </DepthLayer>
                    </div>

                    <div className='mt-auto'>
                      <DepthLayer depth={40}>
                        <h3 className='text-2xl font-black text-white uppercase tracking-tighter italic mb-4'>
                          {uc.label}
                        </h3>
                        <p className='hp-body-sm text-white/40 leading-relaxed mb-8 max-w-sm'>
                          {uc.desc}
                        </p>
                      </DepthLayer>

                      <DepthLayer depth={30} className='flex flex-wrap gap-2'>
                        {uc.features.map((f) => (
                          <span
                            key={f}
                            className='px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-[9px] font-bold text-white/30 uppercase tracking-widest group-hover:text-white/60 group-hover:border-white/10 transition-colors'
                          >
                            {f}
                          </span>
                        ))}
                      </DepthLayer>
                    </div>

                    {/* Abstract background highlight */}
                    <div
                      className='absolute top-0 right-0 w-64 h-64 blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-1000 -z-10'
                      style={{ background: uc.color }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Final Humorous Statement Container */}
          <motion.div
            className='lg:col-span-3'
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className='relative rounded-[1.5rem] border-[0.75px] border-white/5 p-2 md:p-3'>
              <GlowingEffect
                spread={80}
                glow={true}
                disabled={false}
                proximity={100}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <div className='relative overflow-hidden rounded-2xl border-[0.75px] bg-[#05060c] p-10 shadow-sm transition-colors duration-500 group'>
                <div className='flex flex-col md:flex-row items-center justify-between gap-8 relative z-20'>
                  <div className='flex-1 text-center md:text-left'>
                    <h3 className='text-3xl font-black text-white uppercase tracking-tighter italic mb-2'>
                      Essentially, <span className='hp-grad-cyan'>Everyone!</span>
                    </h3>
                    <p className='text-lg text-white/40 leading-relaxed font-medium'>
                      Work together, watch together, explore together, and build together. Cospira
                      turns the web into a shared experience where people connect, interact, and
                      create in real time. Open to anyone with emotions to share — so robots? Keep
                      quite!.
                    </p>
                  </div>
                  <div className='flex-shrink-0'>
                    <div className='w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-4xl grayscale group-hover:grayscale-0 transition-all duration-700 hover:rotate-12'>
                      🤖
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

export default UseCases;
