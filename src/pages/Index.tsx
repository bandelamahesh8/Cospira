import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { Shield, Video, Users, Zap } from 'lucide-react';

const Index = () => {
  return (
    <div className='min-h-screen bg-background'>
      <Navbar />

      {/* Hero Section */}
      <section className='pt-32 pb-16 px-4'>
        <div className='container mx-auto text-center'>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 animate-fade-in'>
            <span className='relative flex h-3 w-3'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75'></span>
              <span className='relative inline-flex rounded-full h-3 w-3 bg-primary'></span>
            </span>
            Live Now
          </div>

          <h1 className='text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 animate-fade-in'>
            Connect Instantly,<br />
            Collaborate Seamlessly
          </h1>

          <p className='text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up'>
            High-quality video conferencing for everyone. No downloads required.
            Secure, fast, and completely free.
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up' style={{ animationDelay: '0.2s' }}>
            <AnimatedButton size='lg' className='glow-button text-lg px-8' asChild>
              <Link to='/auth'>Start Meeting</Link>
            </AnimatedButton>
            <AnimatedButton size='lg' variant='outline' className='text-lg px-8' asChild>
              <Link to='/demo'>Watch Demo</Link>
            </AnimatedButton>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
