import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import BrandIntro from '@/components/home/BrandIntro';
import HeroSection from '@/components/home/HeroSection';
import ValueProp from '@/components/home/ValueProp';
import HowItWorks from '@/components/home/HowItWorks';
import RoomModes from '@/components/home/RoomModes';
import GameArcade from '@/components/home/GameArcade';
import SharedExperiences from '@/components/home/SharedExperiences';
import AISection from '@/components/home/AISection';
import OrgSection from '@/components/home/OrgSection';
import UseCases from '@/components/home/UseCases';
import TrustSection from '@/components/home/TrustSection';
import EnvironmentCommand from '@/components/home/EnvironmentCommand';
import FooterCTA from '@/components/home/FooterCTA';
import { InteractiveGrid } from '@/components/home/VisualEffects';
import '@/styles/homepage.css';

const Index = () => {
  const horizontalRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: horizontalRef,
    offset: ["start start", "end start"]
  });

  // Balanced mapping for better UX when scrolling back
  // 0.0 - 0.15: Hold BrandIntro
  // 0.15 - 0.65: Slide to HeroSection
  // 0.65 - 1.0: Hold HeroSection
  const xRaw = useTransform(scrollYProgress, [0.35, 0.65], [0, -50], { clamp: true });
  
  const xSpring = useSpring(xRaw, {
    stiffness: 100, // Increased for snappier response to scroll changes
    damping: 30,    // Balanced damping to prevent shaking but keep it smooth
    mass: 0.8,
  });

  const x = useTransform(xSpring, (val) => `${val}%`);

  return (
    <div className="hp-index bg-[#030407] selection:bg-indigo-500/30 min-h-screen">
      <InteractiveGrid />
      
      <div className="relative z-10">
        {/* Horizontal Transition Section - 400vh provides exactly the 'one scroll' feel */}
        <div ref={horizontalRef} className="h-[400vh] relative">
          {/* Dedicated jump targets for smooth scroll buttons */}
          <div id="hero-reveal" className="absolute top-[260vh] left-0 pointer-events-none" />
          
          <div className="sticky top-0 h-screen w-full overflow-hidden">
            <motion.div 
              style={{ 
                x,
                willChange: "transform"
              }} 
              className="flex w-[200%] h-full"
            >
              <div className="w-1/2 h-full flex-shrink-0">
                <BrandIntro />
              </div>
              <div className="w-1/2 h-full flex-shrink-0">
                <HeroSection />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Vertical Sections Continue */}
        <div className="relative bg-[#030407]">
          <div className="h-24" /> {/* Spacer */}
          <ValueProp />
          <div className="h-24" /> {/* Spacer */}
          <HowItWorks />
          <div className="h-24" /> {/* Spacer */}
          <RoomModes />
          <div className="h-24" /> {/* Spacer */}
          <GameArcade />
          <div className="h-24" /> {/* Spacer */}
          <SharedExperiences />
          <div className="h-24" /> {/* Spacer */}
          <AISection />
          <div className="h-24" /> {/* Spacer */}
          <OrgSection />
          <div className="h-24" /> {/* Spacer */}
          <UseCases />
          <TrustSection />
          <EnvironmentCommand />
          <FooterCTA />
        </div>
      </div>
    </div>
  );
};

export default Index;
