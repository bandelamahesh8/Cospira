import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal } from 'lucide-react';
import { logger } from '@/utils/logger';
import { motion } from 'framer-motion';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('CRITICAL SYSTEM FAILURE:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#05070a] p-6 text-center relative overflow-hidden font-sans selection:bg-red-500/30 selection:text-red-100">
           {/* Ambient Background */}
           <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[150px] rounded-full animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 blur-[150px] rounded-full animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
           </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-2xl w-full"
          >
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-red-500/5 border border-red-500/10 mb-8 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
                <AlertTriangle className="h-10 w-10 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-white">
                SYSTEM <span className="text-red-500">FAILURE</span>
              </h1>
              
              <p className="text-white/40 mb-10 text-lg font-medium leading-relaxed max-w-lg mx-auto">
                A critical exception has breached the runtime perimeter. The system has safeguarded your session data.
              </p>

              {this.state.error && import.meta.env.DEV && (
                <div className="mb-10 w-full overflow-hidden rounded-2xl bg-[#0a0c10] border border-white/5 text-left shadow-2xl relative group">
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                        <Terminal className="w-4 h-4 text-white/40" />
                        <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Stack Trace</span>
                    </div>
                    <div className="p-6 overflow-auto max-h-[300px] custom-scrollbar">
                        <p className="font-bold text-red-400 mb-4 font-mono text-sm">{this.state.error.toString()}</p>
                        <pre className="text-xs text-white/30 font-mono leading-relaxed whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack || 'No stack trace available.'}
                        </pre>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button 
                    onClick={this.handleReload} 
                    className="h-14 px-8 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95 w-full sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reboot System
                </button>
                <button 
                    onClick={this.handleGoHome} 
                    className="h-14 px-8 rounded-xl bg-white/5 border border-white/5 text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:bg-white/10 hover:border-white/10 active:scale-95 w-full sm:w-auto"
                >
                  <Home className="h-4 w-4" />
                  Return to Base
                </button>
              </div>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}
