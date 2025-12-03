import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Chrome, Shield, Lock } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email({ message: 'Invalid email address' });
const passwordSchema = z.string().min(6, { message: 'Password must be at least 6 characters' });

const Auth = () => {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateLogin = () => {
    const newErrors: { [key: string]: string } = {};

    try {
      emailSchema.parse(loginEmail);
    } catch {
      newErrors.loginEmail = 'Invalid email address';
    }

    try {
      passwordSchema.parse(loginPassword);
    } catch {
      newErrors.loginPassword = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors: { [key: string]: string } = {};

    try {
      emailSchema.parse(signupEmail);
    } catch {
      newErrors.signupEmail = 'Invalid email address';
    }

    try {
      passwordSchema.parse(signupPassword);
    } catch {
      newErrors.signupPassword = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setLoginLoading(true);
    await signIn(loginEmail, loginPassword);
    setLoginLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;

    setSignupLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupDisplayName);
    setSignupLoading(false);

    if (!error) {
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5'>
      <div className='absolute inset-0 bg-grid-pattern opacity-5' />

      <Card className='w-full max-w-md glass-card animate-fade-in relative'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center'>
            <Shield className='w-8 h-8 text-primary' />
          </div>
          <CardTitle className='text-3xl font-bold glow-text'>Welcome to ShareUs</CardTitle>
          <CardDescription>Secure, Zero-Trust Collaboration Platform</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue='login' className='w-full'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='login'>Login</TabsTrigger>
              <TabsTrigger value='signup'>Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value='login'>
              <form onSubmit={handleLogin} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='login-email'>Email</Label>
                  <Input
                    id='login-email'
                    type='email'
                    placeholder='your@email.com'
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={errors.loginEmail ? 'border-destructive' : ''}
                  />
                  {errors.loginEmail && (
                    <p className='text-sm text-destructive'>{errors.loginEmail}</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='login-password'>Password</Label>
                  <Input
                    id='login-password'
                    type='password'
                    placeholder='••••••••'
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={errors.loginPassword ? 'border-destructive' : ''}
                  />
                  {errors.loginPassword && (
                    <p className='text-sm text-destructive'>{errors.loginPassword}</p>
                  )}
                </div>

                <Button type='submit' className='w-full' disabled={loginLoading}>
                  {loginLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className='relative my-6'>
                <div className='absolute inset-0 flex items-center'>
                  <span className='w-full border-t' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-background px-2 text-muted-foreground'>Or continue with</span>
                </div>
              </div>

              <Button
                type='button'
                variant='outline'
                className='w-full'
                onClick={handleGoogleSignIn}
              >
                <Chrome className='mr-2 h-4 w-4' />
                Google
              </Button>
            </TabsContent>

            <TabsContent value='signup'>
              <form onSubmit={handleSignup} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='signup-name'>Display Name (Optional)</Label>
                  <Input
                    id='signup-name'
                    type='text'
                    placeholder='Your Name'
                    value={signupDisplayName}
                    onChange={(e) => setSignupDisplayName(e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='signup-email'>Email</Label>
                  <Input
                    id='signup-email'
                    type='email'
                    placeholder='your@email.com'
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className={errors.signupEmail ? 'border-destructive' : ''}
                  />
                  {errors.signupEmail && (
                    <p className='text-sm text-destructive'>{errors.signupEmail}</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='signup-password'>Password</Label>
                  <Input
                    id='signup-password'
                    type='password'
                    placeholder='••••••••'
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className={errors.signupPassword ? 'border-destructive' : ''}
                  />
                  {errors.signupPassword && (
                    <p className='text-sm text-destructive'>{errors.signupPassword}</p>
                  )}
                </div>

                <Button type='submit' className='w-full' disabled={signupLoading}>
                  {signupLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <div className='relative my-6'>
                <div className='absolute inset-0 flex items-center'>
                  <span className='w-full border-t' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-background px-2 text-muted-foreground'>Or continue with</span>
                </div>
              </div>

              <Button
                type='button'
                variant='outline'
                className='w-full'
                onClick={handleGoogleSignIn}
              >
                <Chrome className='mr-2 h-4 w-4' />
                Google
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className='flex flex-col space-y-2'>
          <div className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
            <Lock className='w-4 h-4' />
            <span>Zero-Trust • Quantum-Safe • Enterprise-Grade</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
