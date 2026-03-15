import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { OrganizationService } from '@/services/OrganizationService';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const Join = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Must be logged in to join
      toast.error('Authentication Required', {
        description: 'This room requires sign-in. Guest users are not allowed.',
      });
      // Consider saving redirect intent if needed, but for now redirect to auth
      navigate('/auth');
      return;
    }

    const attemptJoin = async () => {
      if (!orgId) {
        setStatus('error');
        setErrorMsg('Invalid Invitation Link. Missing code.');
        return;
      }

      try {
        await OrganizationService.joinOrganizationByCode(orgId);
        setStatus('success');
        setTimeout(() => {
          navigate('/organizations');
        }, 1500);
      } catch (err: any) {
        console.error('Join error', err);
        setStatus('error');
        setErrorMsg(err.message || 'Failed to join the organization.');
      }
    };

    attemptJoin();
  }, [orgId, user, authLoading, navigate]);

  return (
    <div className='min-h-screen bg-[#080a0e] flex items-center justify-center p-6 relative overflow-hidden'>
      <div className='absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-purple-950/10 pointer-events-none' />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className='max-w-md w-full bg-[#11161D] rounded-[2rem] p-8 border border-white/5 shadow-2xl relative z-10 flex flex-col items-center text-center'
      >
        {status === 'verifying' && (
          <>
            <div className='w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6'>
              <Loader2 className='w-8 h-8 text-indigo-400 animate-spin' />
            </div>
            <h2 className='text-xl font-black text-white uppercase tracking-tight mb-2'>
              Verifying Invitation
            </h2>
            <p className='text-white/40 text-sm'>Validating your cryptographic access token...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className='w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6'>
              <ShieldCheck className='w-8 h-8 text-emerald-400' />
            </div>
            <h2 className='text-xl font-black text-white uppercase tracking-tight mb-2'>
              Access Granted
            </h2>
            <p className='text-white/40 text-sm'>Redirecting to your workspaces...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className='w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6'>
              <AlertCircle className='w-8 h-8 text-red-500' />
            </div>
            <h2 className='text-xl font-black text-white uppercase tracking-tight mb-2'>
              Access Denied
            </h2>
            <p className='text-white/40 text-sm mb-6'>{errorMsg}</p>
            <button
              onClick={() => navigate('/organizations')}
              className='h-10 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all'
            >
              Return Home
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Join;
