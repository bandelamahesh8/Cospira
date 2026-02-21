import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type TransitionVariant = 'fade' | 'slideLeft' | 'slideRight' | 'scale' | 'rotate' | 'slideUp';

interface PageTransitionProps {
    children: ReactNode;
    variant?: TransitionVariant;
}

const variants = {
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    },
    slideLeft: {
        initial: { opacity: 0, x: -10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 10 },
    },
    slideRight: {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 },
    },
    scale: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.05 },
    },
    rotate: {
        initial: { opacity: 0, rotate: -2, scale: 0.95 },
        animate: { opacity: 1, rotate: 0, scale: 1 },
        exit: { opacity: 0, rotate: 2, scale: 1.05 },
    },
    slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    },
};

const PageTransition = ({ children, variant = 'fade' }: PageTransitionProps) => {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants[variant]}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
