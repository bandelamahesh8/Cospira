import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type TransitionVariant = 'fade' | 'slideLeft' | 'slideRight' | 'scale' | 'rotate';

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
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
    },
    slideRight: {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    },
    scale: {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.1 },
    },
    rotate: {
        initial: { opacity: 0, rotate: -5, scale: 0.9 },
        animate: { opacity: 1, rotate: 0, scale: 1 },
        exit: { opacity: 0, rotate: 5, scale: 1.1 },
    },
};

const PageTransition = ({ children, variant = 'fade' }: PageTransitionProps) => {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants[variant]}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
