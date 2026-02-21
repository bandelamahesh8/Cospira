import { motion } from 'framer-motion';

import CospiraLogoImg from '@/assets/COSPIRA_LOGO.png';

interface BackgroundLogoProps {
    variant?: 'full' | 'sidebar';
    className?: string;
}

export const BackgroundLogo = ({ variant = 'full', className }: BackgroundLogoProps) => {
    const isSidebar = variant === 'sidebar';
    
    return (
        <div className={`${isSidebar ? 'absolute inset-x-0 bottom-0 create-z-index-0 h-[300px]' : 'fixed inset-0 pointer-events-none z-0'} flex items-center justify-center overflow-hidden ${className || ''}`}>
             
             {/* Main Logo Image */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`${isSidebar ? 'w-[250px] h-[250px]' : 'w-[800px] h-[800px]'} flex items-center justify-center relative opacity-20`}
            >
                <img 
                    src={CospiraLogoImg} 
                    alt="Background Cospira Logo" 
                    className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(99,102,241,0.3)]"
                />
            </motion.div>

            {/* Gradient Orb 1 */}
            <div className={`absolute ${isSidebar ? 'top-10 left-10 w-32 h-32' : 'top-1/4 left-1/4 w-96 h-96'} bg-blue-600/5 rounded-full blur-[100px] animate-pulse`} />
            
            {/* Gradient Orb 2 */}
            <div className={`absolute ${isSidebar ? 'bottom-10 right-10 w-32 h-32' : 'bottom-1/4 right-1/4 w-96 h-96'} bg-purple-600/5 rounded-full blur-[100px] animate-pulse delay-700`} />

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

             {/* Noise Overlay */}
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>
    );
};
