import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';
import './index.css';
import { logger } from '@/utils/logger';

logger.init();

createRoot(document.getElementById('root')!).render(<App />);
