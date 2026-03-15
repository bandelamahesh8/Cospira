import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Rocket,
  Calendar,
  Zap,
  Lock,
  MessageSquare,
  Terminal,
  Building2,
  Folder,
  Bot,
} from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  date: string;
  status: 'planned' | 'in-progress' | 'completed';
  icon: React.ElementType;
}

const features: Feature[] = [
  {
    id: '1',
    title: 'Multi-Tenant Organizations',
    description: 'Secure, isolated environments for teams. Completed throughout Phase 4.',
    date: 'Launched',
    status: 'completed',
    icon: Building2,
  },
  {
    id: '2',
    title: 'Project Workspaces',
    description: 'Dedicated resource containers with granular access control.',
    date: 'Launched',
    status: 'completed',
    icon: Folder,
  },
  {
    id: '3',
    title: 'Cloud Computers',
    description: 'Persistent virtual machines with VS Code built-in.',
    date: 'Q2 2026',
    status: 'in-progress',
    icon: Terminal,
  },
  {
    id: '4',
    title: 'Team Chat',
    description: 'End-to-end encrypted messaging for organization members.',
    date: 'Q3 2026',
    status: 'planned',
    icon: MessageSquare,
  },
  {
    id: '5',
    title: 'Enterprise SSO',
    description: 'SAML/OIDC integration for large organizations.',
    date: 'Q3 2026',
    status: 'planned',
    icon: Lock,
  },
  {
    id: '6',
    title: 'Automated AI Interviews',
    description:
      'Next-generation AI agents capable of conducting dynamic, real-time technical and behavioral interviews.',
    date: 'Q4 2026',
    status: 'in-progress',
    icon: Bot,
  },
];

const UpcomingFeatures = () => {
  const navigate = useNavigate();

  return (
    <div className='bg-[#05070a] text-white h-full overflow-y-auto custom-scrollbar'>
      <div className='relative z-10 p-6 md:p-10 lg:p-12'>
        <div className='max-w-5xl mx-auto space-y-12'>
          <div className='space-y-6'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full'
            >
              <Rocket className='w-4 h-4 text-pink-400' />
              <span className='text-xs font-black uppercase tracking-[0.2em] text-pink-200'>
                Roadmap 2026
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className='text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-none'
            >
              Upcoming <span className='text-pink-500'>Features</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className='text-white/40 font-medium text-lg max-w-2xl leading-relaxed uppercase tracking-tight'
            >
              We are building the future of collaborative computing. Here is what's launching next
              in the Cospira ecosystem.
            </motion.p>
          </div>

          <div className='grid gap-4'>
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className='group relative bg-[#0c1016]/60 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 overflow-hidden hover:border-pink-500/30 transition-all'
              >
                <div className='relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6'>
                  <div className='flex items-start gap-6'>
                    <div className='w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-pink-400 group-hover:scale-110 transition-transform'>
                      <feature.icon className='w-8 h-8' />
                    </div>
                    <div>
                      <div className='flex items-center gap-3 mb-2'>
                        <h3 className='text-2xl font-black text-white uppercase italic'>
                          {feature.title}
                        </h3>
                        {feature.status === 'in-progress' && (
                          <span className='px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1'>
                            <Zap className='w-3 h-3 fill-current' /> In Progress
                          </span>
                        )}
                        {feature.status === 'completed' && (
                          <span className='px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-lg'>
                            Active
                          </span>
                        )}
                      </div>
                      <p className='text-white/40 font-medium max-w-lg leading-relaxed'>
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-4 pl-22 md:pl-0'>
                    <div className='flex flex-col md:items-end'>
                      <span className='text-[10px] font-black uppercase tracking-widest text-white/20'>
                        Target Launch
                      </span>
                      <div className='flex items-center gap-2 text-white/60 font-bold'>
                        <Calendar className='w-4 h-4' />
                        {feature.date}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className='py-12 text-center'>
            <p className='text-white/20 text-sm font-bold uppercase tracking-widest'>
              Have a request?{' '}
              <button
                onClick={() => navigate('/feedback')}
                className='text-pink-400 hover:underline'
              >
                Submit Protocol Feedback
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingFeatures;
