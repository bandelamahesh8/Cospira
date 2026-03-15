"use client";

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { GooeyText } from '@/components/ui/gooey-text-morphing';
import { SwipeButton } from '@/components/ui/swipe-button';
import LiquidEther from '@/components/ui/LiquidEther';

const MORPH_TEXTS = [
  "Collaboration", 
  "Intelligence", 
  "Realities", 
  "Innovation",
  "AI-Powered",
  "Shared-Spaces",
  "Real-Time", 
  "Cinematic",
  "Multi-User",
  "Immersive",
  "Spatial",
  "Zero-Trust",
  "Seamless",
  "Hyper-Scale",
  "Autonomous",
  "Pro-Grade",
  "Limitless"
];

export default function BrandIntro() {
  const navigate = useNavigate();

  return (
    <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#030407]">
      {/* Background Liquid Ether abstraction */}
      <div className="absolute inset-0 z-0 opacity-40">
        <LiquidEther
          colors={[ '#5227FF', '#FF9FFC', '#B19EEF' ]}
          mouseForce={20}
          cursorSize={100}
          isViscous={true}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* Background radial gradient for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] z-1" />
      
      {/* Animated subtle grid */}
      <div className="absolute inset-0 opacity-[0.03] hp-grid-bg pointer-events-none z-1" />

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
           className="flex flex-col items-center"
        >
          <span className="text-[10px] font-black uppercase tracking-[1em] text-indigo-500/60 mb-8 block">
            Intelligence Optimized
          </span>
          <h1 className="text-7xl md:text-[10rem] font-black italic uppercase tracking-tighter leading-none text-white transition-all">
            COSPIRA
          </h1>
          
          <div className="h-[120px] w-full flex items-center justify-center mt-4 text-center">
            <GooeyText
              texts={MORPH_TEXTS}
              morphTime={4.0}
              cooldownTime={6.0}
              textClassName="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-indigo-400"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
          className="mt-8 flex flex-col items-center"
        >
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8" />
          <p className="text-xl md:text-3xl font-medium text-white/40 tracking-tight max-w-2xl leading-tight italic">
            The internet let us talk. <span className="text-white/80">Cospira lets us act.</span>
          </p>
          
          <div className="mt-12">
            <SwipeButton 
              text="Swipe to Experience" 
              onComplete={() => navigate('/dashboard')}
            />
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator bit */}
      <motion.button 
        onClick={() => document.getElementById('hero-reveal')?.scrollIntoView({ behavior: 'smooth' })}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-6 flex flex-col items-center gap-2 cursor-pointer hover:scale-110 transition-transform z-20 group"
      >
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em] group-hover:text-indigo-400 transition-colors">
          Scroll to Explore
        </span>
        <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors animate-bounce" />
        <div className="w-[1px] h-8 bg-gradient-to-b from-indigo-500 to-transparent" />
      </motion.button>
    </section>
  );
}
