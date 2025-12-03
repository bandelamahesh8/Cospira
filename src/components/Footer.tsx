import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className='border-t border-border/50 py-12 mt-24'>
      <div className='container mx-auto px-4'>
        <div className='grid md:grid-cols-4 gap-8 mb-8'>
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center'>
                <Shield className='w-5 h-5 text-background' />
              </div>
              <span className='text-xl font-bold text-foreground'>ShareUs</span>
            </div>
            <p className='text-muted-foreground text-sm'>
              Enterprise-grade virtual collaboration platform with zero-trust security.
            </p>
          </div>

          <div>
            <h4 className='font-semibold text-foreground mb-4'>Product</h4>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link
                  to='#features'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  to='#pricing'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Roadmap
                </Link>
              </li>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Security
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className='font-semibold text-foreground mb-4'>Resources</h4>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  API Reference
                </Link>
              </li>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Status
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className='font-semibold text-foreground mb-4'>Company</h4>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className='border-t border-border/50 pt-8 text-center text-sm text-muted-foreground'>
          <p>© 2024 ShareUs. All rights reserved. Zero-Trust • Quantum-Safe • Enterprise Ready</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
