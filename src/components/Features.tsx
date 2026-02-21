import { Shield, Gamepad2, FileUp, Mic, Globe, Lock, Cloud } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Zero-Trust Security',
    description:
      'Quantum-safe encryption with ephemeral cloud containers. No data touches local devices.',
  },
  {
    icon: Gamepad2,
    title: 'Cloud Gaming',
    description: 'Multiplayer games with cloud GPU rendering and ultra-low latency streaming.',
  },
  {
    icon: FileUp,
    title: 'Secure File Sharing',
    description: 'RAM-disk only storage with automatic deletion after sessions. Zero persistence.',
  },
  {
    icon: Globe,
    title: 'AI Translation',
    description: 'Real-time translation for 40+ languages with automatic subtitle generation.',
  },
  {
    icon: Mic,
    title: 'HD Conferencing',
    description: 'Enterprise-grade video/audio with host moderation and compliance recording.',
  },
  {
    icon: Lock,
    title: 'DRM Protection',
    description: 'Widevine L1 support for OTT content with anti-screenshot watermarking.',
  },
  {
    icon: Cloud,
    title: 'Edge Computing',
    description: 'Distributed GPU nodes across global regions for minimal latency.',
  },
];

const Features = () => {
  return (
    <section id='features' className='py-24 relative'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl md:text-5xl font-bold mb-4'>
            Enterprise-Grade <span className='text-primary'>Capabilities</span>
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Everything you need for secure, high-performance virtual collaboration
          </p>
        </div>

        <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className='glass-card p-6 rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-all group hover:scale-105'
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                <feature.icon className='w-6 h-6 text-primary' />
              </div>
              <h3 className='text-lg font-semibold mb-2 text-foreground'>{feature.title}</h3>
              <p className='text-muted-foreground text-sm leading-relaxed'>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
