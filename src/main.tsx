import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';
import './index.css';
import { logger } from '@/utils/logger';

// Global Ngrok Bypass for Free Tier Interstitials
if (typeof window !== 'undefined') {
  const isNgrok = window.location.hostname.includes('ngrok-free.dev') || 
                  window.location.hostname.includes('ngrok.io');
  if (isNgrok) {
    // Setting the cookie allows all subsequent requests (images, iframes) to bypass the warning
    // SameSite=None and Secure are required for iframes to send cookies in some contexts
    document.cookie = "ngrok-skip-browser-warning=1; path=/; max-age=2592000; SameSite=None; Secure";
  }
}

logger.init();

createRoot(document.getElementById('root')!).render(<App />);
