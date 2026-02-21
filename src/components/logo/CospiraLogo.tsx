import { motion, HTMLMotionProps } from 'framer-motion';

// Extend HTMLMotionProps < img > to support both standard image attributes and Motion props
interface CospiraLogoProps extends HTMLMotionProps<"img"> {
    size?: 16 | 24 | 32 | 48 | 64 | 128; // Enforce strict sizing scale
}

/*
 * CospiraLogo - The Single Source of Truth for the Brand Identity
 * Uses the EXACT high-fidelity PNG asset with premium animations.
 */
export const CospiraLogo = ({ size = 32, className, ...props }: CospiraLogoProps) => {
    // Determine dimensions based on prop
    const dimension = size;

    return (
        <motion.img
            src="/cospira-logo.png"
            alt="Cospira Logo"
            width={dimension}
            height={dimension}
            className={`cospira-logo object-contain ${className || ''}`}
            
            // Interaction & Entrance Animations
            initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            whileHover={{ 
                scale: 1.1, 
                rotate: 5,
                filter: "brightness(1.1) drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))"
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25 
            }}
            
            {...props}
        />
    );
};
