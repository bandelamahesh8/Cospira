import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for small teams',
    features: [
      'Up to 10 participants',
      '10 hours/month',
      '1080p streaming',
      'Basic security',
      'Community support',
    ],
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/month',
    description: 'For growing businesses',
    features: [
      'Up to 50 participants',
      '100 hours/month',
      '4K streaming',
      'Advanced security',
      'Priority support',
      'AI translation',
      'Recording & transcripts',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Unlimited participants',
      'Unlimited hours',
      '8K streaming',
      'Zero-trust security',
      'Dedicated support',
      'On-premise deployment',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
];

const PricingSection = () => {
  return (
    <section id='pricing' className='py-24'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl md:text-5xl font-bold mb-4'>
            Simple, <span className='text-primary'>Transparent</span> Pricing
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Choose the plan that fits your team's needs
          </p>
        </div>

        <div className='grid md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card rounded-2xl p-8 relative ${
                plan.popular ? 'border-2 border-primary shadow-lg shadow-primary/20 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className='absolute -top-4 left-1/2 -translate-x-1/2'>
                  <span className='bg-gradient-to-r from-primary to-accent text-background px-4 py-1 rounded-full text-sm font-semibold'>
                    Most Popular
                  </span>
                </div>
              )}

              <div className='text-center mb-6'>
                <h3 className='text-2xl font-bold mb-2 text-foreground'>{plan.name}</h3>
                <p className='text-muted-foreground text-sm mb-4'>{plan.description}</p>
                <div className='flex items-baseline justify-center'>
                  <span className='text-5xl font-bold text-primary'>{plan.price}</span>
                  <span className='text-muted-foreground ml-1'>{plan.period}</span>
                </div>
              </div>

              <ul className='space-y-3 mb-8'>
                {plan.features.map((feature) => (
                  <li key={feature} className='flex items-start gap-3'>
                    <Check className='w-5 h-5 text-primary flex-shrink-0 mt-0.5' />
                    <span className='text-foreground/90'>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full ${
                  plan.popular
                    ? 'bg-gradient-to-r from-primary to-accent text-background hover:shadow-lg hover:shadow-primary/50'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <Link to='/dashboard'>
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
