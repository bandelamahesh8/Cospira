import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, Smile, Users, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';

const ModeSelection = () => {
  const navigate = useNavigate();

  const modes = [
    {
      id: 'fun',
      title: 'Fun Mode',
      description: 'Games, casual chat, and interactive widgets. Perfect for hanging out.',
      icon: Smile,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/20',
      hover: 'group-hover:bg-fuchsia-500/20',
      path: '/create-room?mode=fun',
    },
    {
      id: 'professional',
      title: 'Professional',
      description: 'AI summaries, action items, and structured tools for productivity.',
      icon: Zap,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      hover: 'group-hover:bg-blue-500/20',
      path: '/create-room?mode=professional',
    },
    {
      id: 'ultra',
      title: 'Ultra Secure',
      description: 'Maximum privacy. Ghost protocol, no logs, self-destructing room.',
      icon: Shield,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      hover: 'group-hover:bg-red-500/20',
      path: '/create-room?mode=ultra',
    },
    {
      id: 'social',
      title: 'Social Connect',
      description: 'Meet new people. Random matching based on interests and intent.',
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      hover: 'group-hover:bg-emerald-500/20',
      path: '/connect',
    },
  ];

  return (
    <div className='min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-hidden relative'>
      <Navbar />

      {/* Background Ambience */}
      <div className='fixed inset-0 pointer-events-none'>
        <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[100px] animate-pulse-slow' />
        <div
          className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[100px] animate-pulse-slow'
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className='container mx-auto px-6 pt-32 pb-20 relative z-10'>
        <div className='max-w-4xl mx-auto text-center mb-16'>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-4xl md:text-6xl font-black tracking-tighter mb-6'
          >
            Choose Your{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white'>
              Environment
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='text-xl text-white/40 max-w-2xl mx-auto'
          >
            Every conversation has a purpose. Cospira adapts the room's intelligence, security, and
            tools to match your intent.
          </motion.p>
        </div>

        <div className='grid md:grid-cols-2 gap-6 max-w-5xl mx-auto'>
          {modes.map((mode, index) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(mode.path)}
              className={`group relative p-8 rounded-3xl border ${mode.border} bg-[#0A0A0A] overflow-hidden cursor-pointer transition-all duration-300`}
            >
              <div
                className={`absolute inset-0 ${mode.bg} opacity-0 ${mode.hover} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className='relative z-10 flex items-start gap-6'>
                <div
                  className={`w-14 h-14 rounded-2xl ${mode.bg} flex items-center justify-center shrink-0 border ${mode.border}`}
                >
                  <mode.icon className={`w-7 h-7 ${mode.color}`} />
                </div>

                <div className='flex-1 text-left'>
                  <h3 className='text-2xl font-bold mb-2 flex items-center gap-2'>
                    {mode.title}
                    <ArrowRight className='w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-white/50' />
                  </h3>
                  <p className='text-white/50 leading-relaxed text-sm font-medium'>
                    {mode.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;
