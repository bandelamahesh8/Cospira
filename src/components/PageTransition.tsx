import { ReactNode, forwardRef } from "react";
import { motion } from "framer-motion";

type TransitionVariant =
  | "fade"
  | "slideLeft"
  | "slideRight"
  | "scale"
  | "rotate"
  | "slideUp";

interface PageTransitionProps {
  children: ReactNode;
  variant?: TransitionVariant;
}

const transitionVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  rotate: {
    initial: { opacity: 0, rotate: -5, scale: 0.95 },
    animate: { opacity: 1, rotate: 0, scale: 1 },
    exit: { opacity: 0, rotate: 5, scale: 1.05 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
};

const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children, variant = "fade" }, ref) => {
    const selectedVariant = transitionVariants[variant] || transitionVariants.fade;

    return (
      <motion.div
        ref={ref}
        initial={selectedVariant.initial}
        animate={selectedVariant.animate}
        exit={selectedVariant.exit}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen w-full"
      >
        {children}
      </motion.div>
    );
  }
);

PageTransition.displayName = "PageTransition";

export default PageTransition;