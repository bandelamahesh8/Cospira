import { CheckCircle2 } from 'lucide-react';

const TrustSection = () => {
  const certifications = [
    'ISO 27001 Certified',
    'GDPR Compliant',
    'SOC 2 Type II',
    'HIPAA Ready',
    'Zero-Knowledge Architecture',
  ];

  return (
    <section className='py-24 relative'>
      <div className='container mx-auto px-4'>
        <div className='glass-card rounded-3xl p-12 text-center relative overflow-hidden'>
          <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse' />

          <h2 className='text-3xl md:text-4xl font-bold mb-4'>
            Trusted by <span className='text-primary'>Enterprise</span> & Government
          </h2>
          <p className='text-muted-foreground mb-8 max-w-2xl mx-auto'>
            Built for organizations that demand the highest security and compliance standards
          </p>

          <div className='flex flex-wrap items-center justify-center gap-6 mb-8'>
            {certifications.map((cert) => (
              <div key={cert} className='flex items-center gap-2 text-foreground'>
                <CheckCircle2 className='w-5 h-5 text-primary' />
                <span className='font-medium'>{cert}</span>
              </div>
            ))}
          </div>

          <div className='glass-card inline-block px-6 py-3 rounded-full'>
            <p className='text-sm text-muted-foreground'>
              Post-Quantum Cryptography Ready • Blockchain Audit Logs • On-Premise Deployment
              Available
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
