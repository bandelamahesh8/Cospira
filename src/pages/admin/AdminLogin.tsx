import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulated delay for security feel
    setTimeout(() => {
      if (email === 'maheshbandela88@gmail.com' && password === 'Mahesh@7648') {
        localStorage.setItem('admin_authenticated', 'true');
        toast.success('Access Granted', {
          description: 'Welcome back, Commander.',
          icon: <ShieldCheck className='w-5 h-5 text-emerald-500' />,
        });
        navigate('/COSPERA_ADMIN88');
      } else {
        toast.error('Access Denied', {
          description: 'Invalid credentials. This attempt has been logged.',
          icon: <AlertCircle className='w-5 h-5 text-red-500' />,
        });
        setPassword('');
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className='min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden'>
      {/* Matrix-like Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className='absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black pointer-events-none' />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='w-full max-w-md relative z-10'
      >
        <div className='bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden relative'>
          <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50' />

          <div className='flex flex-col items-center mb-8'>
            <div className='w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-4 animate-pulse'>
              <Lock className='w-8 h-8 text-red-500' />
            </div>
            <h1 className='text-2xl font-bold text-white tracking-wider uppercase'>
              Restricted Access
            </h1>
            <p className='text-zinc-500 text-sm mt-1'>Authorized Personnel Only</p>
          </div>

          <form onSubmit={handleLogin} className='space-y-6'>
            <div className='space-y-2'>
              <Label className='text-xs uppercase tracking-widest text-zinc-500'>Identity</Label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500' />
                <Input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='pl-10 bg-black/50 border-white/5 text-white focus:border-red-500/50 transition-colors h-12'
                  placeholder='admin@cospira.com'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs uppercase tracking-widest text-zinc-500'>Passcode</Label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500' />
                <Input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='pl-10 bg-black/50 border-white/5 text-white focus:border-red-500/50 transition-colors h-12'
                  placeholder='••••••••'
                />
              </div>
            </div>

            <Button
              type='submit'
              className='w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase transition-all'
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full' />
                </motion.div>
              ) : (
                'Authenticate'
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
