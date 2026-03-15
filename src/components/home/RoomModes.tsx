"use client"

import React from 'react';
import { motion } from 'framer-motion';
import DisplayCards from '@/components/ui/display-cards';
import { 
  Gamepad2, 
  Briefcase, 
  ShieldAlert, 
  Zap,
} from 'lucide-react';

const MODE_CARDS_DATA = [
  {
    id: "ultra",
    title: "Ultra Mode",
    description: "Zero-Trust Security & E2E encryption",
    date: "Protocol Secure",
    icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    features: ["Zero-trust E2E", "No screenshots", "E2E Encryption", "Audit Shield", "Peer Verification", "Passkey-only"],
    titleClassName: "text-red-500",
  },
  {
    id: "pro",
    title: "Professional",
    description: "AI Minutes & Results-driven focus",
    date: "Pro Protocol",
    icon: <Briefcase className="w-5 h-5 text-indigo-400" />,
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800',
    features: ["AI Summaries", "HD Data Mesh", "Sync Video", "HD Audio", "Action Items", "Priority Support"],
    titleClassName: "text-indigo-500",
  },
  {
    id: "mixed",
    title: "Mixed Mode",
    description: "Adaptive bandwidth & AI features",
    date: "Hybrid Protocol",
    icon: <Zap className="w-5 h-5 text-emerald-400" />,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800',
    features: ["Hybrid Sync", "Adaptive Video", "Mixed Social", "Smart Moderation", "Bandwidth Bal", "Cross-play"],
    titleClassName: "text-emerald-500",
  },
  {
    id: "fun",
    title: "Fun Mode",
    description: "Games Active & Social playground",
    date: "Social Protocol",
    icon: <Gamepad2 className="w-5 h-5 text-purple-400" />,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
    features: ["Arcade Access", "Public Joining", "Social Emotes", "Game Casting", "Open Mesh", "Vibrant UI"],
    titleClassName: "text-purple-500",
  }
];

const RoomModes = () => {
  const [cards, setCards] = React.useState(MODE_CARDS_DATA);

  // Auto-rotate cards frequently (every 4 seconds)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCards(prev => {
        const newCards = [...prev];
        const lastCard = newCards.pop()!;
        return [lastCard, ...newCards];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  

  const handleCardClick = (index: number) => {
    setCards(prev => {
      const newCards = [...prev];
      const [selectedCard] = newCards.splice(index, 1);
      return [selectedCard, ...newCards];
    });
  };

  const processedCards = cards.map((card, index) => {
    // The first card in the array is "front" (z-index highest)
    // The others stack behind it with increasing translate
    const zIndex = (cards.length - index) * 10;
    const x = index * 32; // Tightened spreading
    const y = index * -40; // Stacking upwards

    return {
      ...card,
      x,
      y,
      className: `[grid-area:stack]`,
      style: {
        zIndex,
        opacity: 1 - (index * 0.08),
      }
    };
  });

  return (
    <section className="hp-section overflow-hidden" style={{ background: '#030407' }}>
       <div className="absolute inset-0 hp-grid-bg opacity-[0.03] pointer-events-none" />
       
       <div className="hp-container relative z-10 w-full px-6 py-40">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
             
             {/* LEFT: Content */}
             <div className="space-y-12 -ml-8 lg:-ml-16">
                <div className="hp-section-label">
                   <span>03</span>
                   <div className="hp-section-label-line" />
                   <span>Operational Reality</span>
                </div>

                <motion.h2 
                  className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-[0.85]"
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "circOut" }}
                >
                  One platform.<br />
                  <span className="hp-grad-indigo">Four realities.</span>
                </motion.h2>
                
                <motion.p 
                  className="text-xl text-white/30 font-medium max-w-xl leading-relaxed"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 }}
                >
                   Cospira reconfigures itself based on your intent. Before anyone joins, 
                   set the baseline for encryption, AI intervention, and collaborative 
                   tools across four distinct protocols. Each mode optimizes resources 
                   for the task at hand.
                </motion.p>

                <div className="flex flex-col gap-4 pt-8">
                   <div className="flex items-center gap-4 py-4 px-6 rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-sm w-fit">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">Mode Engine Standby</span>
                   </div>
                </div>
             </div>

             {/* RIGHT: Stacked Cards */}
             <div className="flex items-center justify-center lg:justify-end min-h-[600px]">
                <div className="relative w-full max-w-xl translate-y-24 -translate-x-16">
                   <DisplayCards cards={processedCards} onCardClick={handleCardClick} />
                </div>
             </div>

          </div>
       </div>
    </section>
  );
};


export default RoomModes;
