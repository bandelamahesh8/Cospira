import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Chrome, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import AuthMascot, { MascotState } from '@/components/auth/AuthMascot';
import { EmailVerificationModal } from '@/components/auth/EmailVerificationModal';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';

const emailSchema = z.string().email({ message: 'Valid email required' });
const loginIdentifierSchema = z.string().min(2, { message: 'Min. 2 characters required' });
const passwordSchema = z.string().min(6, { message: 'Min. 6 characters' });

// PHASE 1: GLOBAL MOTION LANGUAGE
const GLOBAL_TRANSITION: Transition = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1],
};

const Auth = () => {
  const { signIn, signUp, signInWithGoogle, user, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [mascotState, setMascotState] = useState<MascotState>('IDLE');

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const [loginPasswordFocused, setLoginPasswordFocused] = useState(false);
  const [signupPasswordFocused, setSignupPasswordFocused] = useState(false);

  const [shake, setShake] = useState(false);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  const [isExiting, setIsExiting] = useState(false);
  const [isHoveringCTA, setIsHoveringCTA] = useState(false);
  const [suggestSignup, setSuggestSignup] = useState(false);
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    if (mascotState === 'IDLE' || mascotState === 'TYPING') {
      const isFocused =
        loginPasswordFocused ||
        signupPasswordFocused ||
        loginIdentifier.length > 0 ||
        signupEmail.length > 0;
      setMascotState(isFocused ? 'TYPING' : 'IDLE');
    }
  }, [loginPasswordFocused, signupPasswordFocused, loginIdentifier, signupEmail, mascotState]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setMascotState('SUCCESS');
      const timer = setTimeout(() => {
        navigate(returnTo || '/dashboard', { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, navigate, returnTo]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorDescription = params.get('error_description');
      const errorCode = params.get('error_code');

      if (errorDescription || errorCode) {
        setMascotState('ERROR');
        const errorMessage = errorDescription?.replace(/\+/g, ' ') || 'Authentication failed';
        setErrors((prev) => ({ ...prev, global: errorMessage }));
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    const identifier = authMode === 'login' ? loginIdentifier : signupEmail;
    const password = authMode === 'login' ? loginPassword : signupPassword;

    if (!identifier || identifier.trim() === '') {
      newErrors[authMode === 'login' ? 'loginEmail' : 'signupEmail'] =
        authMode === 'login' ? 'Email or Username required' : 'Email required';
    } else {
      try {
        if (authMode === 'login') {
          loginIdentifierSchema.parse(identifier);
        } else {
          emailSchema.parse(identifier);
        }
      } catch {
        newErrors[authMode === 'login' ? 'loginEmail' : 'signupEmail'] =
          authMode === 'login' ? 'Invalid format' : 'Invalid email address';
      }
    }

    if (!password || password.trim() === '') {
      newErrors[authMode === 'login' ? 'loginPassword' : 'signupPassword'] = 'Password required';
    } else {
      try {
        passwordSchema.parse(password);
      } catch {
        newErrors[authMode === 'login' ? 'loginPassword' : 'signupPassword'] =
          'Minimum 6 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) {
      setMascotState('ERROR');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setMascotState('PROCESSING');

    if (authMode === 'login') {
      const { error } = await signIn(loginIdentifier, loginPassword);
      if (error) {
        setLoading(false);
        setMascotState('ERROR');

        const newCount = failureCount + 1;
        setFailureCount(newCount);

        if (newCount >= 2) {
          setErrors({ global: 'Incorrect password. Do you want to reset it?' });
          setSuggestSignup(false); // Prefer reset suggestion
        } else {
          setErrors({ global: 'Invalid email or password. Please try again.' });
          setSuggestSignup(true);
        }

        setShake(true);
        setTimeout(() => setShake(false), 500);
      } else {
        setMascotState('SUCCESS');
        setIsExiting(true);
        setTimeout(() => navigate(returnTo || '/dashboard', { replace: true }), 1400);
      }
    } else {
      setSignupStep(2);
      const { error, needsVerification } = await signUp(
        signupEmail,
        signupPassword,
        signupDisplayName
      );
      if (error) {
        setLoading(false);
        setSignupStep(1);
        const errMsg = (error as { message?: string }).message || 'Registration failed';
        if (errMsg.includes('User already registered')) {
          setErrors({ signupEmail: 'Email already in use.' });
        } else {
          setErrors({ global: errMsg });
        }
        setMascotState('ERROR');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } else {
        setLoading(false);
        setMascotState('SUCCESS');
        if (needsVerification) {
          setVerificationEmail(signupEmail);
          setShowVerificationModal(true);
        } else {
          setIsExiting(true);
          setTimeout(() => navigate(returnTo || '/dashboard', { replace: true }), 1400);
        }
      }
    }
  };

  const handleResendVerification = async () => {
    if (verificationEmail && resendVerificationEmail) {
      await resendVerificationEmail(verificationEmail);
    }
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  const toggleMode = () => {
    setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setErrors({});
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0.3 : 1 }}
      exit={{ opacity: 0 }}
      transition={GLOBAL_TRANSITION}
      className={`min-h-screen flex items-center justify-center p-4 md:p-8 overflow-hidden transition-colors duration-1000 relative ${isExiting ? 'bg-black' : 'bg-[#050505]'}`}
    >
      {/* PHASE 8: PREMIUM BACK BUTTON */}

      {/* Background Ambience - PHASE 7: Slow Background Shift */}
      <div
        className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* BACKGROUND LOGO WATERMARK */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] opacity-[0.04] pointer-events-none select-none flex items-center justify-center -z-10'>
          <img
            src='/cospira-logo.png'
            alt=''
            className='w-full h-full object-contain grayscale-[0.5] blur-[2px]'
          />
        </div>

        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className='absolute top-1/4 -right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]'
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className='absolute bottom-1/4 -left-20 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]'
        />
      </div>

      <div className='w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-24 items-center relative z-10'>
        <div className='order-2 lg:order-1 lg:col-span-12 xl:col-span-5 flex justify-center'>
          <motion.div
            // PHASE 4: Page Load Entry
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1, scale: isExiting ? 0.95 : 1 }}
            transition={GLOBAL_TRANSITION}
            className='w-full max-w-md'
          >
            <Card className='luxury-card bg-white/[0.03] backdrop-blur-3xl border-white/5 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-[2.5rem] mt-12'>
              {/* Progress Indicator */}
              <AnimatePresence mode='wait'>
                {authMode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className='absolute top-6 left-0 w-full flex justify-center z-20'
                  >
                    <div className='bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2'>
                      <div className='flex gap-1'>
                        <div
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${signupStep >= 1 ? 'bg-primary' : 'bg-white/10'}`}
                        />
                        <div
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${signupStep >= 2 ? 'bg-primary' : 'bg-white/10'}`}
                        />
                      </div>
                      <span className='text-[10px] font-bold text-white/40 uppercase tracking-widest'>
                        Step {signupStep} of 2 —{' '}
                        {signupStep === 1 ? 'Creating account' : 'Securing identity'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                layout
                className='absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent z-50 transition-all'
              />

              <CardHeader className='text-center pt-14 pb-4'>
                <motion.div layout transition={GLOBAL_TRANSITION}>
                  <CardTitle className='text-4xl font-black tracking-tight mb-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-300'>
                    {authMode === 'login' ? 'Sign In Securely' : 'Create Your Account'}
                  </CardTitle>
                  <CardDescription className='text-white/30 font-bold uppercase tracking-[0.2em] text-[10px]'>
                    {authMode === 'login' ? 'System Access' : 'Identity Verification'}
                  </CardDescription>
                </motion.div>
              </CardHeader>

              <CardContent className='px-10 pb-8 overflow-hidden'>
                <AnimatePresence mode='wait'>
                  {errors.global && (
                    <motion.div
                      key='error'
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className='mb-4 p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 text-[10px] font-bold text-center uppercase tracking-wider flex flex-col gap-2 items-center'
                    >
                      <span>{errors.global}</span>

                      {/* Suggest Signup (Attempt 1) */}
                      {suggestSignup && authMode === 'login' && failureCount < 2 && (
                        <button
                          onClick={toggleMode}
                          className='inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-full text-[9px] text-red-300 transition-colors'
                        >
                          Want to Sign Up?
                        </button>
                      )}

                      {/* Suggest Reset (Attempt 2+) */}
                      {failureCount >= 2 && authMode === 'login' && (
                        <button
                          onClick={() => setShowForgotPassword(true)}
                          className='inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-full text-[9px] text-red-300 transition-colors'
                        >
                          Forgot Password?
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className='relative'>
                  <AnimatePresence mode='wait' initial={false}>
                    <motion.div
                      key={authMode}
                      // PHASE 5: Horizontal Slide
                      initial={{ opacity: 0, x: authMode === 'login' ? -40 : 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: authMode === 'login' ? 40 : -40 }}
                      transition={GLOBAL_TRANSITION}
                      className='space-y-6'
                    >
                      <div className='space-y-4'>
                        {authMode === 'signup' && (
                          <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1'>
                              Display Name
                            </Label>
                            <Input
                              type='text'
                              placeholder='Enter Name'
                              value={signupDisplayName}
                              onChange={(e) => setSignupDisplayName(e.target.value)}
                              className='h-12 bg-white/[0.03] border-white/5 hover:border-white/10 focus:border-white/20 rounded-full px-6 text-white/80 transition-all font-medium'
                            />
                          </div>
                        )}

                        <div className='space-y-2'>
                          <Label className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1'>
                            {authMode === 'login' ? 'Email or Username' : 'Email Address'}
                          </Label>
                          <div className='relative group'>
                            <Input
                              type={authMode === 'login' ? 'text' : 'email'}
                              placeholder={
                                authMode === 'login' ? 'Enter Email or Username' : 'Enter Email'
                              }
                              value={authMode === 'login' ? loginIdentifier : signupEmail}
                              onChange={(e) => {
                                if (authMode === 'login') setLoginIdentifier(e.target.value);
                                else setSignupEmail(e.target.value);
                              }}
                              className={`h-12 bg-white/[0.03] border-white/5 hover:border-white/10 focus:border-white/20 rounded-full px-6 text-white/80 transition-all font-medium ${
                                (authMode === 'login' ? errors.loginEmail : errors.signupEmail)
                                  ? 'border-red-500/20'
                                  : ''
                              }`}
                            />
                            <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                              <div
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                                  (
                                    authMode === 'login'
                                      ? loginIdentifier.length > 2
                                      : signupEmail.includes('@')
                                  )
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                    : 'bg-white/10'
                                }`}
                              />
                            </div>
                          </div>
                          <AnimatePresence>
                            {(authMode === 'login' ? errors.loginEmail : errors.signupEmail) && (
                              <motion.p
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className='text-[9px] text-red-500/70 font-bold uppercase tracking-wider ml-1'
                              >
                                {authMode === 'login' ? errors.loginEmail : errors.signupEmail}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className='space-y-2'>
                          <Label className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1'>
                            Password
                          </Label>
                          <div className='relative group'>
                            <Input
                              type={
                                (authMode === 'login' ? showLoginPassword : showSignupPassword)
                                  ? 'text'
                                  : 'password'
                              }
                              placeholder='Enter Password'
                              value={authMode === 'login' ? loginPassword : signupPassword}
                              onChange={(e) => {
                                if (authMode === 'login') setLoginPassword(e.target.value);
                                else setSignupPassword(e.target.value);
                              }}
                              onFocus={() => {
                                if (authMode === 'login') setLoginPasswordFocused(true);
                                else setSignupPasswordFocused(true);
                              }}
                              onBlur={() => {
                                if (authMode === 'login') setLoginPasswordFocused(false);
                                else setSignupPasswordFocused(false);
                              }}
                              className={`h-12 bg-white/[0.03] border-white/5 hover:border-white/10 focus:border-white/20 rounded-full px-6 pr-12 text-white/80 transition-all font-medium ${
                                (
                                  authMode === 'login'
                                    ? errors.loginPassword
                                    : errors.signupPassword
                                )
                                  ? 'border-red-500/20'
                                  : ''
                              }`}
                            />
                            <button
                              type='button'
                              onClick={() => {
                                if (authMode === 'login') setShowLoginPassword(!showLoginPassword);
                                else setShowSignupPassword(!showSignupPassword);
                              }}
                              className='absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors'
                            >
                              {(authMode === 'login' ? showLoginPassword : showSignupPassword) ? (
                                <EyeOff className='w-4 h-4' />
                              ) : (
                                <Eye className='w-4 h-4' />
                              )}
                            </button>
                          </div>
                          <AnimatePresence>
                            {(authMode === 'login'
                              ? errors.loginPassword
                              : errors.signupPassword) && (
                              <motion.p
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className='text-[9px] text-red-500/70 font-bold uppercase tracking-wider ml-1'
                              >
                                {authMode === 'login'
                                  ? errors.loginPassword
                                  : errors.signupPassword}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        {authMode === 'login' && (
                          <div className='flex justify-end'>
                            <button
                              type='button'
                              onClick={() => setShowForgotPassword(true)}
                              className='text-[9px] uppercase font-bold tracking-widest text-indigo-300/50 hover:text-indigo-300 transition-colors'
                            >
                              Forgot Password?
                            </button>
                          </div>
                        )}
                      </div>

                      <div className='space-y-4'>
                        <motion.button
                          type='submit'
                          disabled={loading || isExiting}
                          onMouseEnter={() => setIsHoveringCTA(true)}
                          onMouseLeave={() => setIsHoveringCTA(false)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full h-12 rounded-full bg-white text-black hover:bg-zinc-100 font-black uppercase tracking-[0.2em] text-[10px] relative overflow-hidden group transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] flex items-center justify-center ${
                            shake ? 'animate-shake' : ''
                          }`}
                        >
                          <AnimatePresence mode='wait'>
                            <motion.div
                              key={authMode + (loading ? '-loading' : '')}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -20, opacity: 0 }}
                              transition={GLOBAL_TRANSITION}
                              className='flex items-center justify-center gap-3'
                            >
                              {loading ? (
                                <>
                                  <div className='w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin' />
                                  <span>Initialising...</span>
                                </>
                              ) : (
                                <span>
                                  {authMode === 'login'
                                    ? 'Sign In Securely'
                                    : 'Create Account Securely'}
                                </span>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        </motion.button>

                        <AnimatePresence>
                          {authMode === 'signup' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className='space-y-2 pt-2 overflow-hidden'
                            >
                              <AnimatePresence mode='popLayout'>
                                {signupEmail.includes('@') && (
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className='flex items-center gap-2'
                                  >
                                    <div className='w-3.5 h-3.5 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500'>
                                      <Shield className='w-2 h-2' />
                                    </div>
                                    <span className='text-[9px] font-bold uppercase tracking-widest text-white/40'>
                                      Email Valid
                                    </span>
                                  </motion.div>
                                )}
                                {signupPassword.length >= 6 && (
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className='flex items-center gap-2'
                                  >
                                    <div className='w-3.5 h-3.5 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500'>
                                      <Lock className='w-2 h-2' />
                                    </div>
                                    <span className='text-[9px] font-bold uppercase tracking-widest text-white/40'>
                                      Password Secured
                                    </span>
                                  </motion.div>
                                )}
                                {(signupEmail.includes('@') || signupPassword.length >= 6) && (
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className='flex items-center gap-2'
                                  >
                                    <div className='w-3.5 h-3.5 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500'>
                                      <Shield className='w-2 h-2' />
                                    </div>
                                    <span className='text-[9px] font-bold uppercase tracking-widest text-white/40'>
                                      Encryption Active
                                    </span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <div className='flex flex-col items-center gap-5 pt-6 relative z-10'>
                    <Button
                      type='button'
                      variant='ghost'
                      onClick={toggleMode}
                      className='w-full text-[9px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white hover:bg-white/5 rounded-full h-11'
                    >
                      {authMode === 'login' ? 'Create an account' : 'Return to Access Gateway'}
                    </Button>

                    <div className='w-full flex items-center gap-4 px-2 opacity-20'>
                      <div className='flex-1 h-px bg-white' />
                      <span className='text-[8px] font-black uppercase tracking-widest'>
                        Secure Link
                      </span>
                      <div className='flex-1 h-px bg-white' />
                    </div>

                    <Button
                      type='button'
                      variant='outline'
                      className='w-full h-11 bg-transparent border-white/10 hover:bg-white/5 rounded-full font-bold text-xs text-white/40 hover:text-white transition-all gap-4 ring-0'
                      onClick={handleGoogleSignIn}
                    >
                      <Chrome className='w-4 h-4' />
                      Continue with Google
                    </Button>
                  </div>
                </form>
              </CardContent>

              <CardFooter className='pt-2 pb-8 flex flex-col items-center'>
                <div className='flex items-center gap-2 text-[8px] text-white/10 uppercase font-bold tracking-[0.2em]'>
                  <span>Your identity is protected</span>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Right Side: Reactive Intelligence Visual (Orbital Trust Core) */}
        <div className='hidden xl:flex lg:col-span-7 flex-col items-center justify-center relative min-h-[600px] pt-12'>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: isExiting ? 0.3 : 1, opacity: isExiting ? 0 : 1 }}
            transition={GLOBAL_TRANSITION}
            className='w-full flex items-center justify-center relative'
          >
            <AuthMascot
              state={mascotState}
              isTyping={loading || mascotState === 'TYPING'}
              isHoveringCTA={isHoveringCTA}
              orbIntensity={loading ? 0.6 : 0.3}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, ...GLOBAL_TRANSITION }}
            className='mt-16 text-center'
          >
            <h3 className='text-sm font-black uppercase tracking-[0.5em] text-white/10 mb-2'>
              Your identity is protected
            </h3>
            <p className='text-[10px] font-bold text-white/5 uppercase tracking-[0.4em]'>
              E2E Encryption • Sovereign Logic • Anonymous Layer
            </p>
          </motion.div>
        </div>
      </div>

      <EmailVerificationModal
        isOpen={showVerificationModal}
        email={verificationEmail}
        onClose={() => setShowVerificationModal(false)}
        onResendEmail={handleResendVerification}
      />

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={loginIdentifier.includes('@') ? loginIdentifier : ''}
      />
    </motion.div>
  );
};

export default Auth;
