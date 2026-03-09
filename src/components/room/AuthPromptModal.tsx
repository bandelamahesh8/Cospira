import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mic, MessageSquare, Clock, ArrowRight, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerActivity: 'microphone' | 'camera' | 'chat' | 'summary' | 'timer';
}

export const AuthPromptModal = ({ open, onOpenChange, triggerActivity }: AuthPromptModalProps) => {
  const navigate = useNavigate();

  const content = {
    microphone: {
      title: 'Voice Identity',
      description:
        'Claim your voice. Create an account to customize your audio profile and save preferences.',
      icon: Mic,
      color: 'from-blue-500 to-indigo-500',
    },
    camera: {
      title: 'Visual Presence',
      description:
        'Show up in style. Create an account to save your avatar preferences and access pro video features.',
      icon: Sparkles, // Or Video/Camera if I want to import it, but Sparkles is already there and fits "style"
      color: 'from-red-500 to-rose-600',
    },
    chat: {
      title: 'Secure Comms',
      description:
        'Sign up to save this conversation history and access it later in your dashboard.',
      icon: MessageSquare,
      color: 'from-purple-500 to-pink-500',
    },
    summary: {
      title: 'Unlock Intelligence',
      description:
        'AI Summaries are exclusive to members. Create a free account to generate instant meeting notes.',
      icon: Sparkles,
      color: 'from-amber-400 to-orange-500',
    },
    timer: {
      title: 'Permanent Access',
      description:
        'Enjoying the space? Sign up to create your own permanent arenas and keep your identity.',
      icon: Clock,
      color: 'from-emerald-400 to-teal-500',
    },
  }[triggerActivity];

  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md bg-[#0A0A0A] border-none p-0 overflow-hidden shadow-2xl sm:rounded-[2.5rem] [&>button]:hidden'>
        <DialogTitle className='sr-only'>{content.title}</DialogTitle>
        <div className='relative'>
          {/* Decorative Background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${content.color} opacity-10`} />
          <div className='absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2' />

          {/* Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className='absolute top-6 right-6 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white/40 hover:text-white flex items-center justify-center transition-all z-20 backdrop-blur-sm'
          >
            <X className='w-4 h-4' />
          </button>

          <div className='relative z-10 p-8 flex flex-col items-center text-center'>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${content.color} p-[1px] mb-8 shadow-2xl transform rotate-3 group`}
            >
              <div className='w-full h-full rounded-[2rem] bg-black/90 backdrop-blur-xl flex items-center justify-center group-hover:bg-black/80 transition-colors'>
                <Icon className='w-10 h-10 text-white' />
              </div>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className='text-3xl font-black italic uppercase tracking-tighter text-white mb-4'
            >
              {content.title}
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className='text-white/60 font-medium leading-relaxed mb-10 max-w-xs'
            >
              {content.description}
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className='w-full space-y-4'
            >
              <Button
                onClick={() => navigate('/auth')}
                className={`w-full h-14 bg-gradient-to-r ${content.color} text-white font-black uppercase tracking-widest rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-3`}
              >
                <span>Create Free Account</span>
                <ArrowRight className='w-4 h-4' />
              </Button>

              <Button
                variant='ghost'
                onClick={() => onOpenChange(false)}
                className='w-full text-white/30 hover:text-white hover:bg-white/5 uppercase tracking-widest text-xs font-bold transition-colors'
              >
                Continue as Guest
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
