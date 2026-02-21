import { motion } from 'framer-motion';
import { AlertTriangle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const GuestNotification = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (user) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden"
        >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="relative z-10 flex items-center gap-4 text-center md:text-left">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm tracking-wide uppercase">Guest Mode Active</h3>
                    <p className="text-white/50 text-xs md:text-sm">Sign in to access secure history, private rooms, and advanced features.</p>
                </div>
            </div>
            <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
                 <button
                    onClick={() => navigate('/mode-selection')}
                    className="flex-1 md:flex-none h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 text-xs font-bold uppercase tracking-wider transition-colors"
                 >
                    Change Mode
                 </button>
                 <button 
                    onClick={() => navigate('/auth')}
                    className="flex-1 md:flex-none h-10 px-6 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                 >
                    <LogIn className="w-4 h-4" /> Sign In
                 </button>
            </div>
        </motion.div>
    );
};
