import { motion, HTMLMotionProps } from 'framer-motion';
import { buttonVariants, ButtonProps } from './button';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type AnimatedButtonProps = ButtonProps & HTMLMotionProps<"button">;

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        return (
            <motion.button
                ref={ref}
                className={cn(buttonVariants({ variant, size, className }))}
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 8px rgb(var(--primary))" }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                {...props}
            />
        );
    }
);

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;
