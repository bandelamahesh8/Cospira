import { motion } from 'framer-motion';

const TermsOfService = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 's1', num: '01', title: 'Acceptance of terms' },
    { id: 's2', num: '02', title: 'Who can use Cospira' },
    { id: 's3', num: '03', title: 'Your account' },
    { id: 's4', num: '04', title: 'Usage Protocols' },
    { id: 's5', num: '05', title: 'Prohibited Actions' },
    { id: 's6', num: '06', title: 'Your content' },
    { id: 's7', num: '07', title: 'Intellectual Property' },
    { id: 's8', num: '08', title: 'Shared Sessions' },
    { id: 's9', num: '09', title: 'Termination' },
    { id: 's10', num: '10', title: 'Liability Disclaimers' },
    { id: 's11', num: '11', title: 'Governing Law' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-[780px] mx-auto px-6 py-12 md:py-24 font-sans text-white/80 selection:bg-indigo-500/30"
    >
      <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 text-white/40">
        Platform Governance
      </span>
      
      <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white mb-4">
        Terms of <span className="text-indigo-500">Service</span>
      </h1>
      <p className="text-sm text-white/40 font-medium italic mb-12 flex items-center gap-3">
        <span>Effective: March 16, 2026</span>
        <span className="w-1 h-1 rounded-full bg-white/10" />
        <span>V.2026.TERM.8</span>
      </p>

      <div className="bg-[#05060c] border border-white/5 rounded-3xl p-8 mb-16 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6">Service Framework Index</p>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-3">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className="group flex items-center gap-4 text-left transition-all hover:translate-x-1"
            >
              <span className="text-[10px] font-mono text-white/10 group-hover:text-indigo-500/50 transition-colors">{s.num}</span>
              <span className="text-sm font-medium text-white/40 group-hover:text-white transition-colors">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-24">
        <section id="s1" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-indigo-500/40 font-bold">01</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Acceptance of terms</h2>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-white/50 font-medium">
            <p>Welcome to Cospira. By accessing or using our platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use Cospira.</p>
            <p>These terms form a legally binding agreement between you and Cospira. "Cospira," "we," "our," and "us" refer to the Cospira platform and its operators.</p>
            <div className="mt-6 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
               <p className="text-sm text-indigo-300 font-bold italic uppercase tracking-tight">
                 "By initializing your session or creating an account, you confirm absolute compliance with the governing framework outlined herein."
               </p>
            </div>
          </div>
        </section>

        <section id="s2" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-indigo-500/40 font-bold">02</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Eligible entities</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-white/50">
            <p>Access to the Cospira ecosystem is reserved for entities that meet the following criteria:</p>
            <ul className="space-y-3 mt-6">
               {[
                 'Minimum age of 13 standard years for individual accounts',
                 'Guardian/Parental consent for minors in relevant jurisdictions',
                 'Verification of human status (automated entities are strictly prohibited)',
                 'Compliance with international data transit regulations'
               ].map((item, i) => (
                 <li key={i} className="flex gap-4 group">
                   <span className="text-indigo-500/20 group-hover:text-indigo-500 transition-colors">—</span>
                   {item}
                 </li>
               ))}
            </ul>
          </div>
        </section>

        <section id="s5" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-red-500/40 font-bold">05</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Prohibited Actions</h2>
          </div>
          <div className="grid gap-4 mt-6">
             {[
               { t: 'Harassment', d: 'Interactive abuse, stalking, or hostile environment creation.' },
               { t: 'Exploitation', d: 'Reverse-engineering, unauthorized scraping, or kernel-level interference.' },
               { t: 'Impersonation', d: 'Deceptive branding or false identity deployment.' },
               { t: 'Saturation', d: 'Spamming, DDoS attempts, or resource-draining automation.' }
             ].map((action, i) => (
               <div key={i} className="p-5 rounded-2xl bg-red-500/[0.02] border border-red-500/5 transition-colors hover:bg-red-500/[0.05]">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">{action.t}</span>
                  <p className="text-sm text-white/40">{action.d}</p>
               </div>
             ))}
          </div>
        </section>

        <section id="s6" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-indigo-500/40 font-bold">06</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Content Sovereignty</h2>
          </div>
          <div className="space-y-6 text-base leading-relaxed text-white/50 font-medium">
            <p>Anything you create, share, or post on Cospira remains your exclusive property. You retain full sovereignty over your data.</p>
            <p>You grant Cospira a limited, non-exclusive license solely to transmit and synchronize your content among verified session participants.</p>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 border-dashed">
               <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-2 font-black">Platform Guarantee</p>
               <p className="text-sm font-bold italic">"We do not claim ownership of your intellectual property, nor do we extract value from your private communications."</p>
            </div>
          </div>
        </section>

        <section id="s13" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-indigo-500/40 font-bold">13</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Legal Contact</h2>
          </div>
          <div className="bg-[#070811] border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <p className="text-lg font-black text-white uppercase italic tracking-tight mb-1">Cospira Legal Dept.</p>
              <p className="text-xs font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Governance & Compliance</p>
              <p className="text-xs font-mono text-indigo-400">legal@cospira.app</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-xl font-black text-indigo-500">CL</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-32 pt-8 border-t border-white/5 text-center">
        <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] leading-relaxed">
          © 2026 COSPIRA · GLOBAL CLUSTER SYSTEM · GOVERNED BY INDIAN LAW
        </p>
      </footer>
    </motion.div>
  );
};

export default TermsOfService;
