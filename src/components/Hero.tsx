import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/hero-bg.jpg';

const Hero = () => {
  return (
    <section className='relative min-h-screen flex items-center justify-center overflow-hidden pt-20'>
      {/* Background Image with Overlay */}
      <div
        className='absolute inset-0 bg-cover bg-center opacity-20'
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className='absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background' />

      {/* Floating Elements */}
      <div className='absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float' />
      <div
        className='absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float'
        style={{ animationDelay: '2s' }}
      />

      <div className='container mx-auto px-4 relative z-10'>
        <div className='max-w-4xl mx-auto text-center'>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 text-sm'>
            <span className='w-2 h-2 bg-primary rounded-full animate-pulse' />
            <span className='text-muted-foreground'>
              Zero-Trust Architecture • Enterprise Ready
            </span>
          </div>

          <h1 className='text-5xl md:text-7xl font-bold mb-6 leading-tight'>
            A <span className='glow-text text-primary'>Zero-Trust</span> Cloud Collaboration Suite
          </h1>

          <p className='text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed'>
            Open a room → Launch a secure cloud desktop → Watch, play, present with zero local
            footprint.
          </p>

          <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-16'>
            <Button
              size='lg'
              asChild
              className='bg-white text-black font-black uppercase tracking-[0.2em] text-sm px-8 py-6 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all group rounded-full'
            >
              <Link to='/dashboard'>
                Create Room
                <ArrowRight className='ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform' />
              </Link>
            </Button>

            <Button
              size='lg'
              variant='outline'
              asChild
              className='border-primary/50 text-foreground hover:bg-primary/10 text-lg px-8 py-6 group'
            >
              <Link to='/demo'>
                <Play className='mr-2 w-5 h-5 group-hover:scale-110 transition-transform' />
                Watch Demo
              </Link>
            </Button>
          </div>

          {/* Feature Pills */}
          <div className='flex flex-wrap items-center justify-center gap-4'>
            {[
              '8K Streaming',
              'OTT Sync',
              'Multiplayer Games',
              'AI Translation',
              'Biometric Access',
              'Zero Data Footprint',
            ].map((feature) => (
              <div key={feature} className='glass-card px-4 py-2 text-sm text-foreground/90'>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
