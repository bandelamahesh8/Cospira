"use client"

import React from 'react';
import { 
  PlusCircle, 
  ShieldCheck, 
  UserPlus, 
  Share2, 
  BrainCircuit,
} from 'lucide-react';
import StickyTabs from '@/components/ui/sticky-section-tabs';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const StepDetail: React.FC<{ 
  title: string; 
  desc: string; 
  features: string[]; 
  icon: React.ReactNode; 
  color: string 
}> = ({ title, desc, features, icon, color }) => (
  <div className="space-y-12 min-h-[60vh] flex flex-col justify-start pt-12">
    <div className="flex items-start gap-8">
      <div 
        className="w-16 h-16 rounded-3xl flex-shrink-0 flex items-center justify-center text-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        style={{
          background: `linear-gradient(135deg, ${color}20, ${color}05)`,
          border: `1px solid ${color}40`,
          color: color,
        }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter uppercase italic leading-none hover:text-indigo-500 transition-colors">
          {title}
        </h3>
        <p className="text-2xl text-white/40 leading-relaxed font-semibold max-w-2xl text-balance">
          {desc}
        </p>
      </div>
    </div>
    
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-0 md:pl-24">
      {features.map((f, i) => (
        <div key={i} className="relative flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 group hover:border-white/20 hover:bg-white/[0.05] transition-all duration-500 overflow-hidden">
          <GlowingEffect
            spread={20}
            glow={true}
            disabled={false}
            proximity={40}
            inactiveZone={0.01}
            borderWidth={1}
          />
          <div className="w-2 h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ backgroundColor: color }} />
          <span className="text-xs font-bold text-white/50 group-hover:text-white transition-colors uppercase tracking-wider relative z-10">{f}</span>
        </div>
      ))}
    </div>
    
    <div className="pl-0 md:pl-24 pt-8">
      <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  </div>
);

const HowItWorks = () => {
  return (
    <section className="relative bg-[#030407]">
       {/* High-end ambient patterns */}
       <div className="absolute inset-0 hp-grid-bg opacity-[0.03] pointer-events-none" />
       
       <div className="hp-container relative z-10 w-full px-6 pt-40 pb-40">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-24 items-start relative">
             
             {/* LEFT: Pinned Intro - sticky explicitly set to self-start */}
             <div className="lg:sticky lg:top-[12vh] space-y-12 mb-20 lg:mb-0 self-start">
                <div className="hp-section-label">
                  <span>02</span>
                  <div className="hp-section-label-line" />
                  <span>The Private Room Protocol</span>
                </div>
                
                <h2 className="text-6xl md:text-8xl font-black leading-[0.85] tracking-tighter text-white uppercase italic">
                  Five steps<br />
                  to a <span className="text-indigo-500">Living</span><br />
                  <span className="hp-grad-hero">Room.</span>
                </h2>
                
                <div className="space-y-8">
                  <p className="text-xl text-white/30 font-medium leading-relaxed max-w-sm">
                    Automated room orchestration: From zero-trust initialization to AI-driven session synthesis.
                  </p>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 py-4 px-6 rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-sm w-fit">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">Real-time Orchestrator Active</span>
                    </div>
                  </div>
                </div>
             </div>

             {/* RIGHT: Floating Steps */}
             <div className="relative border-l border-white/5 pl-0 lg:pl-12">
                <StickyTabs
                  mainNavHeight="4.5rem"
                  rootClassName="bg-transparent text-white"
                  navSpacerClassName="bg-transparent"
                  sectionClassName="bg-transparent"
                  stickyHeaderContainerClassName="z-30"
                  headerContentWrapperClassName="border-b border-white/5 bg-[#030407]/80 backdrop-blur-3xl"
                  headerContentLayoutClassName="px-0 py-8"
                  titleClassName="my-0 text-sm font-black tracking-widest md:text-base uppercase text-indigo-400 italic opacity-60"
                  contentLayoutClassName="pb-40"
                >
                  <StickyTabs.Item title="01. Initialization" id="init">
                    <StepDetail 
                      title="Ephemeral Instance Spin-up" 
                      desc="A dedicated, isolated virtual environment is provisioned instantly. Zero data persistence, zero trace."
                      features={["Mode selection", "Isolated container", "Zero-cache"]}
                      icon={<PlusCircle className="w-8 h-8" />}
                      color="#6366f1"
                    />
                  </StickyTabs.Item>

                  <StickyTabs.Item title="02. Perimeter Security" id="secure">
                    <StepDetail 
                      title="Zero-Trust Perimeter" 
                      desc="Active kernel-level guards block unauthorized capture. Passkey-only entry ensures absolute privacy."
                      features={["Bio-metrics", "Capture blocking", "E2E encryption"]}
                      icon={<ShieldCheck className="w-8 h-8" />}
                      color="#8b5cf6"
                    />
                  </StickyTabs.Item>

                  <StickyTabs.Item title="03. Secure Delegation" id="invite">
                    <StepDetail 
                      title="Access Token Governance" 
                      desc="Mathematically unique session handles. One-time tokens expire instantly upon successful peer verification."
                      features={["JWT tokens", "Identity binding", "Token decay"]}
                      icon={<UserPlus className="w-8 h-8" />}
                      color="#06b6d4"
                    />
                  </StickyTabs.Item>

                  <StickyTabs.Item title="04. Virtual Handshake" id="connect">
                    <StepDetail 
                      title="WebRTC Mesh Fabric" 
                      desc="Establishing peer-to-peer data conduits. Optimized routes for low-latency synchronization of all assets."
                      features={["SFU/Mesh fabric", "Frame sync", "Asset tunneling"]}
                      icon={<Share2 className="w-8 h-8" />}
                      color="#10b981"
                    />
                  </StickyTabs.Item>

                  <StickyTabs.Item title="05. Intelligent Synthesis" id="ai">
                    <StepDetail 
                      title="AI Session Narrative" 
                      desc="Post-session distillation via the neural core. Automated action items generated before complete memory wipe."
                      features={["Neural Recap", "Automated Gist", "Session Purge"]}
                      icon={<BrainCircuit className="w-8 h-8" />}
                      color="#f59e0b"
                    />
                  </StickyTabs.Item>
                </StickyTabs>
             </div>

          </div>
       </div>
    </section>
  );
};

export default HowItWorks;


