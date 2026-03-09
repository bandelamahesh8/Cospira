import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className='border-t border-white/[0.03] py-12 bg-transparent overflow-hidden'>
      <div className='container mx-auto px-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 items-center md:items-start text-center md:text-left'>
          {/* LEFT — BRAND ANCHOR */}
          <div className='space-y-4 order-1'>
            <div>
              <h3 className='text-lg font-black tracking-tighter text-white/40 uppercase'>
                Cospira
              </h3>
              <p className='text-[10px] font-bold uppercase tracking-widest text-white/20 mt-1'>
                Connect Beyond Meetings
              </p>
            </div>
            <p className='text-[9px] font-medium text-white/10 uppercase tracking-widest'>
              © 2026 Cospira
            </p>
          </div>

          {/* CENTER — SYSTEM TRUST */}
          <div className='space-y-3 order-2 md:text-center flex flex-col items-center'>
            <div className='flex flex-wrap justify-center gap-x-4 gap-y-2'>
              <span className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30'>
                Built on WebRTC
              </span>
              <span className='hidden md:inline text-white/5'>•</span>
              <span className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30'>
                End-to-End Encrypted
              </span>
            </div>
            <p className='text-[10px] font-bold uppercase tracking-[0.15em] text-white/10 italic'>
              No Recording • Designed for Privacy
            </p>
          </div>

          {/* RIGHT — CONTROL & POLICY */}
          <div className='flex flex-col md:items-end gap-3 order-3'>
            <div className='flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2'>
              <Link
                to='/about#privacy'
                className='text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white hover:underline underline-offset-4 transition-all'
              >
                Privacy Policy
              </Link>
              <Link
                to='/about#legal-section'
                className='text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white hover:underline underline-offset-4 transition-all'
              >
                Terms of Service
              </Link>
            </div>
            <div className='flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2'>
              <Link
                to='/about#contact-section'
                className='text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white hover:underline underline-offset-4 transition-all'
              >
                Contact
              </Link>
              <Link
                to='/feedback'
                className='text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white hover:underline underline-offset-4 transition-all'
              >
                Feedback
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
