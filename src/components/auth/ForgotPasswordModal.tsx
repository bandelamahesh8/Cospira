import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Mail, Lock, X, ShieldAlert, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { toast } from 'sonner';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

const emailSchema = z.string().email();

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const { requestOTP, verifyOTP, resetPassword } = useAuth();

  // Steps: 1=Email, 2=OTP, 3=NewPassword, 4=Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Data
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Errors
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail(initialEmail);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, initialEmail]);

  // Handle Email Submit
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      emailSchema.parse(email);
    } catch {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    const { success, error: apiError } = await requestOTP(email, 'forgot_login');
    setIsLoading(false);

    if (success) {
      setStep(2);
      toast.success('Code Sent', { description: 'Check your email for the verification code.' });
    } else {
      setError(apiError || 'Failed to send code');
    }
  };

  // Handle OTP Verify
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Code must be 6 digits');
      return;
    }

    setIsLoading(true);
    const {
      success,
      resetToken: token,
      error: apiError,
    } = await verifyOTP(email, otp, 'forgot_login');
    setIsLoading(false);

    if (success && token) {
      setResetToken(token);
      setStep(3);
    } else {
      setError(apiError || 'Invalid code');
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const { success, error: apiError } = await resetPassword(resetToken, newPassword);
    setIsLoading(false);

    if (success) {
      setStep(4);
      toast.success('Success', { description: 'Your password has been updated securely.' });
      setTimeout(() => {
        onClose();
      }, 3000);
    } else {
      setError(apiError || 'Failed to reset password');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/80 backdrop-blur-md'
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className='relative w-full max-w-md bg-[#0c1016] border border-white/10 rounded-3xl overflow-hidden shadow-2xl'
          >
            {/* Header */}
            <div className='p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20'>
                  <KeyRound className='w-5 h-5 text-indigo-400' />
                </div>
                <div>
                  <h2 className='text-lg font-bold text-white leading-tight'>Recovery Protocol</h2>
                  <p className='text-[10px] text-white/40 uppercase tracking-widest font-medium'>
                    Secure Reset Flow
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className='rounded-full p-2 hover:bg-white/5 transition-colors text-white/50 hover:text-white'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='p-8'>
              {/* Error Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    className='bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-500 overflow-hidden'
                  >
                    <ShieldAlert className='w-5 h-5 shrink-0' />
                    <span className='text-xs font-bold'>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 1: Email */}
              {step === 1 && (
                <form onSubmit={handleRequestOTP} className='space-y-6'>
                  <div className='space-y-2'>
                    <label className='text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1'>
                      Account Identifier
                    </label>
                    <div className='relative'>
                      <Mail className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20' />
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder='Enter your registered email'
                        className='h-14 pl-12 bg-white/5 border-white/5 hover:border-white/10 focus:border-indigo-500/50 rounded-2xl text-white placeholder:text-white/20 transition-all font-medium'
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button
                    type='submit'
                    disabled={isLoading}
                    className='w-full h-14 bg-white text-black hover:bg-indigo-50 rounded-2xl font-black uppercase tracking-widest text-xs'
                  >
                    {isLoading ? 'Processing...' : 'Send Verification Code'}
                  </Button>
                </form>
              )}

              {/* Step 2: OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOTP} className='space-y-6'>
                  <div className='text-center mb-6'>
                    <p className='text-sm text-white/60'>We sent a 6-digit code to</p>
                    <p className='font-bold text-white'>{email}</p>
                  </div>
                  <div className='space-y-2'>
                    <label className='text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1'>
                      Verification Code
                    </label>
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder='000000'
                      className='h-14 text-center text-2xl tracking-[0.5em] bg-white/5 border-white/5 hover:border-white/10 focus:border-indigo-500/50 rounded-2xl text-white placeholder:text-white/10 transition-all font-mono'
                      autoFocus
                    />
                  </div>
                  <div className='flex gap-3'>
                    <Button
                      type='button'
                      variant='ghost'
                      onClick={() => setStep(1)}
                      className='flex-1 h-14 rounded-2xl border border-white/10 text-white/50 hover:text-white'
                    >
                      Back
                    </Button>
                    <Button
                      type='submit'
                      disabled={isLoading || otp.length !== 6}
                      className='flex-[2] h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs'
                    >
                      {isLoading ? 'Verifying...' : 'Verify Code'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <form onSubmit={handleResetPassword} className='space-y-6'>
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1'>
                        New Password
                      </label>
                      <div className='relative'>
                        <Lock className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20' />
                        <Input
                          type='password'
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder='Minimum 6 characters'
                          className='h-14 pl-12 bg-white/5 border-white/5 hover:border-white/10 focus:border-indigo-500/50 rounded-2xl text-white placeholder:text-white/20 transition-all font-medium'
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <label className='text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1'>
                        Confirm Password
                      </label>
                      <div className='relative'>
                        <Lock className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20' />
                        <Input
                          type='password'
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder='Re-enter password'
                          className='h-14 pl-12 bg-white/5 border-white/5 hover:border-white/10 focus:border-indigo-500/50 rounded-2xl text-white placeholder:text-white/20 transition-all font-medium'
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    type='submit'
                    disabled={isLoading}
                    className='w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  >
                    {isLoading ? 'Updating...' : 'Set New Password'}
                  </Button>
                </form>
              )}

              {/* Step 4: Success */}
              {step === 4 && (
                <div className='flex flex-col items-center justify-center py-6 text-center'>
                  <div className='w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 animate-in zoom-in duration-300'>
                    <Check className='w-10 h-10 text-emerald-400' />
                  </div>
                  <h3 className='text-2xl font-black text-white mb-2'>Password Reset</h3>
                  <p className='text-white/60 mb-8'>
                    Your account has been successfully secured with the new credentials.
                  </p>
                  <Button
                    onClick={onClose}
                    className='w-full h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold uppercase tracking-widest text-xs'
                  >
                    Return to Login
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
