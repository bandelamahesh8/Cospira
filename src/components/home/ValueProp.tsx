import { motion } from 'framer-motion';
import { DepthCard, DepthLayer } from './VisualEffects';

const FEATURES = [
  { icon: '🎙️', label: 'Live Captions', desc: 'Real-time AI transcription in 40+ languages, zero delay.' },
  { icon: '🎮', label: '8+ Games', desc: 'Chess, Carrom, Kart, Ludo, UNO and more — with ELO ranking.' },
  { icon: '▶️', label: 'YouTube Sync', desc: 'Perfect frame-sync playback with host controls and reactions.' },
  { icon: '🖥️', label: 'Co-Browse', desc: 'Shared virtual browser with multi-tab support and no data persistence.' },
  { icon: '🤖', label: 'AI Summary', desc: 'Structured gist, decisions, and action items at session end.' },
];

const COMPARISON = [
  { tool: 'Zoom', cap: 'Meetings only — no games, no sync watching, no co-browse.' },
  { tool: 'Discord', cap: 'Voice & chat — limited watch party, no AI, no shared browser.' },
  { tool: 'Gather', cap: 'Spatial presence — but static, no AI and limited multiplayer.' },
  { tool: 'Cospira', cap: 'All of the above — simultaneously, intelligently, in one room.', highlight: true },
];

// 3D tilt card is now handled by the unified DepthCard component in VisualEffects

const ValueProp = () => {
  return (
    <section className="hp-section">
      {/* Ambient */}
      <div className="hp-orb absolute top-1/4 right-0 w-[600px] h-[400px]"
        style={{ background: 'rgba(99,102,241,0.05)' }} />

      <div className="hp-container">
        {/* Label */}
        <div className="hp-section-label">
          <span>01</span>
          <div className="hp-section-label-line" />
          <span>The Premise</span>
        </div>

        {/* Heading */}
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-20">
          <div>
            <motion.h2
              className="hp-h2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Not a meeting tool.{' '}
              <span className="hp-grad-cyan">A living room.</span>
            </motion.h2>
          </div>
          <motion.p
            className="hp-body"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            Standard video call grids reduce you to a thumbnail. Cospira rebuilds the room
            from scratch — a real-time environment where video, games, watching content, and
            browsing happen simultaneously, controlled by you.
          </motion.p>
        </div>

        {/* Comparison Table */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="overflow-hidden rounded-3xl border border-white/5">
            {COMPARISON.map((row, _) => (
              <div
                key={row.tool}
                className={`flex items-start gap-6 px-8 py-5 border-b border-white/5 last:border-0 transition-all duration-300 ${row.highlight ? 'bg-indigo-500/10' : 'bg-white/[0.01] hover:bg-white/[0.025]'}`}
              >
                <div className="flex items-center gap-3 min-w-[110px]">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${row.highlight ? 'bg-indigo-400' : 'bg-white/15'}`} />
                  <span className={`text-sm font-black uppercase tracking-wide ${row.highlight ? 'text-white' : 'text-white/35'}`}>
                    {row.tool}
                  </span>
                  {row.highlight && (
                    <span className="text-[9px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                      You're Here
                    </span>
                  )}
                </div>
                <p className={`text-sm font-medium leading-relaxed ${row.highlight ? 'text-white/80' : 'text-white/30'}`}>
                  {row.cap}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {FEATURES.map((f, _) => (
            <div key={f.label} className="h-full" style={{ transformStyle: 'preserve-3d' }}>
              <DepthCard
                className="p-0 h-full cursor-default overflow-hidden"
              >
                <div className="p-6 relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                  <DepthLayer depth={60} className="text-3xl mb-4">
                    {f.icon}
                  </DepthLayer>
                  <DepthLayer depth={40}>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2">{f.label}</h3>
                    <p className="hp-body-sm">{f.desc}</p>
                  </DepthLayer>
                </div>
              </DepthCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProp;
