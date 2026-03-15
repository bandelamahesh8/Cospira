import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 's1', num: '01', title: 'Who we are' },
    { id: 's2', num: '02', title: 'Information we collect' },
    { id: 's3', num: '03', title: 'How we use your information' },
    { id: 's4', num: '04', title: 'Sharing & disclosure' },
    { id: 's5', num: '05', title: 'Data retention' },
    { id: 's6', num: '06', title: 'Your rights & choices' },
    { id: 's7', num: '07', title: 'Cookies & tracking' },
    { id: 's8', num: '08', title: 'Security' },
    { id: 's9', num: '09', title: 'Children\'s privacy' },
    { id: 's10', num: '10', title: 'Changes to this policy' },
    { id: 's11', num: '11', title: 'Contact us' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-[780px] mx-auto px-6 py-12 md:py-24 font-sans text-white/80 selection:bg-indigo-500/30"
    >
      <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 text-white/40">
        Legal Protocol
      </span>
      
      <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white mb-4">
        Privacy <span className="text-indigo-500">&</span> Policy
      </h1>
      <p className="text-sm text-white/40 font-medium italic mb-12 flex items-center gap-3">
        <span>Effective: March 16, 2026</span>
        <span className="w-1 h-1 rounded-full bg-white/10" />
        <span>Version 1.0.42</span>
      </p>

      <div className="bg-[#05060c] border border-white/5 rounded-3xl p-8 mb-16 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6">Table of Contents</p>
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
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Who we are</h2>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-white/50 font-medium">
            <p>Cospira is a shared web experience platform that lets people connect, interact, and create in real time — together. When you use Cospira, you trust us with your information. We take that seriously.</p>
            <p>This Privacy Policy explains what data we collect, how we use it, and the choices you have. It applies to all Cospira products, services, and platforms.</p>
          </div>
        </section>

        <section id="s2" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-indigo-500/40 font-bold">02</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Information we collect</h2>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-black text-white/20 uppercase tracking-widest mb-4">Information you provide</h3>
              <ul className="space-y-3">
                {['Account details (name, email, username) during registration', 'Profile customization (photos, bio, preferences)', 'Session content and media shared within Cospira rooms', 'Communications, feedback, and support inquiries'].map((item, i) => (
                  <li key={i} className="flex gap-4 text-sm text-white/50 leading-relaxed group">
                    <span className="text-indigo-500/20 group-hover:text-indigo-500 transition-colors">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-black text-white/20 uppercase tracking-widest mb-4">Automatically Collected</h3>
              <ul className="space-y-3">
                {['Usage metrics (features accessed, session duration)', 'Technical environment (browser, OS, screen specs)', 'Network metadata (IP address, obfuscated location)', 'Diagnostic logs and error reporting'].map((item, i) => (
                  <li key={i} className="flex gap-4 text-sm text-white/50 leading-relaxed group">
                    <span className="text-indigo-500/20 group-hover:text-indigo-500 transition-colors">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="s3" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-indigo-500/40 font-bold">03</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">How we use your information</h2>
          </div>
          <div className="space-y-6">
            <p className="text-base leading-relaxed text-white/50 font-medium">We use the information we collect to maintain the integrity and performance of the Cospira platform, specifically to:</p>
            <ul className="space-y-3">
              {[
                'Execute real-time synchronization between session participants',
                'Personalize your dashboard and surface relevant collaborative tools',
                'Transmit critical security updates and product notifications',
                'Resolve technical issues via our support infrastructure',
                'Fortify the platform against fraud and unauthorized exploitation'
              ].map((item, i) => (
                <li key={i} className="flex gap-4 text-sm text-white/50 leading-relaxed group">
                  <span className="text-indigo-500/20 group-hover:text-indigo-500 transition-colors">—</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 italic">
               <p className="text-sm text-indigo-300/80 leading-relaxed">
                 "We do not sell your personal information to third parties. Our business model is built on providing value through shared experience, not exploiting user data."
               </p>
            </div>
          </div>
        </section>

        <section id="s4" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-indigo-500/40 font-bold">04</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Sharing & disclosure</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-white/50">
            <p>Data exposure is strictly limited to scenarios required for service delivery:</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
               <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] font-black text-white/20 uppercase block mb-2">Service Execution</span>
                  <p className="text-xs">Third-party infrastructure providers (AWS, Supabase, Mediasoup) bound by strict privacy constraints.</p>
               </div>
               <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] font-black text-white/20 uppercase block mb-2">Legal Compliance</span>
                  <p className="text-xs">Valid legal requests or court orders, while maintaining zero-trust architecture wherever possible.</p>
               </div>
            </div>
          </div>
        </section>

        <section id="s11" className="scroll-mt-24">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-xs font-mono text-indigo-500/40 font-bold">11</span>
            <h2 className="text-xl font-black text-white uppercase italic tracking-wider">Contact Protocol</h2>
          </div>
          <div className="bg-[#070811] border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <p className="text-lg font-black text-white uppercase italic tracking-tight mb-1">Bandela Mahesh</p>
              <p className="text-xs font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Founder & Lead Architect</p>
              <p className="text-xs font-mono text-indigo-400">privacy@cospira.app</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-xl font-black text-indigo-500">BM</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-32 pt-8 border-t border-white/5 text-center">
        <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] leading-relaxed">
          © 2026 COSPIRA · SYSTEM PRIVACY STANDARD · BUILT IN THE EDGE
        </p>
      </footer>
    </motion.div>
  );
};

export default PrivacyPolicy;
