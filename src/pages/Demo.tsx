import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

const Demo = () => {
  return (
    <div className='min-h-screen bg-[#0B0F14]'>
      <Navbar />
      <div className='container pb-10 pt-32'>
        <div className='text-center max-w-3xl mx-auto mb-12'>
          <h1 className='text-4xl font-bold mb-6'>Watch Cospira in Action</h1>
          <p className='text-xl text-muted-foreground'>
            See how easy it is to collaborate securely with your team in real-time.
          </p>
        </div>

        <div className='aspect-video bg-muted rounded-xl flex items-center justify-center relative overflow-hidden group cursor-pointer border shadow-2xl'>
          <div className='absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors' />
          <div className='w-20 h-20 bg-primary/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform'>
            <Play className='w-8 h-8 text-primary-foreground ml-1' fill='currentColor' />
          </div>
          <p className='absolute bottom-4 text-white font-medium'>Click to play demo video</p>
        </div>

        <div className='mt-12 text-center'>
          <h2 className='text-2xl font-semibold mb-4'>Ready to try it yourself?</h2>
          <Button asChild size='lg' className="btn-luxury border-none ring-0">
            <Link to='/dashboard'>Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Demo;
