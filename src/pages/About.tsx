import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { Shield, Video, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
    return (
        <div className='min-h-screen bg-background'>
            <Navbar />

            <div className='container mx-auto px-4 pt-32 pb-16'>
                <div className='max-w-4xl mx-auto text-center space-y-8'>
                    <h1 className='text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 animate-fade-in'>
                        About ShareUs Cloud Rooms
                    </h1>
                    <p className='text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
                        Experience the future of secure, high-quality video conferencing.
                        Built for privacy, designed for clarity, and engineered for performance.
                    </p>
                </div>

                <div className='grid md:grid-cols-3 gap-8 mt-20'>
                    <div className='glass-card p-8 rounded-2xl space-y-4 hover:bg-white/5 transition-colors'>
                        <div className='w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary'>
                            <Shield className='w-6 h-6' />
                        </div>
                        <h3 className='text-xl font-semibold'>Secure by Design</h3>
                        <p className='text-muted-foreground'>
                            Your conversations are protected with enterprise-grade security.
                            We prioritize your privacy above all else.
                        </p>
                    </div>

                    <div className='glass-card p-8 rounded-2xl space-y-4 hover:bg-white/5 transition-colors'>
                        <div className='w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400'>
                            <Video className='w-6 h-6' />
                        </div>
                        <h3 className='text-xl font-semibold'>HD Video Quality</h3>
                        <p className='text-muted-foreground'>
                            Crystal clear video and audio ensure you never miss a nuance.
                            Powered by advanced WebRTC technology.
                        </p>
                    </div>

                    <div className='glass-card p-8 rounded-2xl space-y-4 hover:bg-white/5 transition-colors'>
                        <div className='w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400'>
                            <Zap className='w-6 h-6' />
                        </div>
                        <h3 className='text-xl font-semibold'>Lightning Fast</h3>
                        <p className='text-muted-foreground'>
                            Low latency connections mean real-time collaboration without the lag.
                            Connect instantly from anywhere.
                        </p>
                    </div>
                </div>

                <div className='mt-20 text-center space-y-8'>
                    <h2 className='text-3xl font-bold'>Ready to get started?</h2>
                    <div className='flex justify-center gap-4'>
                        <AnimatedButton size='lg' className='glow-button' asChild>
                            <Link to='/auth'>Start a Meeting</Link>
                        </AnimatedButton>
                        <AnimatedButton size='lg' variant='outline' asChild>
                            <Link to='/'>Learn More</Link>
                        </AnimatedButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
