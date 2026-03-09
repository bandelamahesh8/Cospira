import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VerificationSuccessModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

export const VerificationSuccessModal = ({ isOpen, onContinue }: VerificationSuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
      {/* Backdrop */}
      <motion.div
        className='absolute inset-0 bg-black/80 backdrop-blur-sm'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        className='relative w-full max-w-md'
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: 'spring', duration: 0.6 }}
      >
        <div className='glass-card rounded-3xl p-10 border border-green-500/30 shadow-2xl relative overflow-hidden'>
          {/* Animated Background */}
          <div className='absolute inset-0 bg-gradient-to-br from-green-500/10 via-primary/10 to-purple-500/10 blur-3xl -z-10' />

          {/* Success Particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className='absolute w-2 h-2 rounded-full bg-green-500/50'
              initial={{
                x: '50%',
                y: '50%',
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: `${50 + Math.cos((i * 30 * Math.PI) / 180) * 150}%`,
                y: `${50 + Math.sin((i * 30 * Math.PI) / 180) * 150}%`,
                scale: [0, 1.5, 0],
                opacity: [1, 0.8, 0],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.05,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Content */}
          <div className='relative z-10 text-center space-y-6'>
            {/* Success Icon */}
            <motion.div
              className='mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-green-600/30 border-2 border-green-500/50 flex items-center justify-center'
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                delay: 0.2,
                duration: 0.8,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <CheckCircle2 className='w-12 h-12 text-green-500' />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className='flex items-center justify-center gap-2 mb-2'>
                <Sparkles className='w-5 h-5 text-green-500' />
                <h2 className='text-3xl font-bold text-green-500'>Verification Successful!</h2>
                <Sparkles className='w-5 h-5 text-green-500' />
              </div>
              <p className='text-lg text-muted-foreground'>Your email has been verified</p>
            </motion.div>

            {/* Success Message */}
            <motion.div
              className='p-4 rounded-xl bg-green-500/10 border border-green-500/20'
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className='text-sm text-muted-foreground'>
                🎉 Your account is now fully activated! You can now log in with your credentials and
                start using Cospira Rooms.
              </p>
            </motion.div>

            {/* Continue Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={onContinue}
                className='w-full h-12 font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 group'
              >
                Continue to Login
                <ArrowRight className='w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform' />
              </Button>
            </motion.div>

            {/* Footer */}
            <motion.p
              className='text-xs text-muted-foreground'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Welcome to the Cospira community! 🚀
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
