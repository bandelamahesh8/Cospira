import { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useScroll, useVelocity } from 'framer-motion';

export const Magnetic = ({ children, strength = 0.5 }: { children: React.ReactNode; strength?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = clientX - centerX;
    const distanceY = clientY - centerY;
    
    x.set(distanceX * strength);
    y.set(distanceY * strength);
  }, [x, y, strength]);

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className="hp-magnetic"
    >
      {children}
    </motion.div>
  );
};

export const ShimmerCard = ({ 
  children, 
  className = "", 
  style = {} 
}: { 
  children: React.ReactNode; 
  className?: string;
  style?: React.CSSProperties;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const smoothX = useSpring(mouseX, { stiffness: 200, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 200, damping: 30 });

  const bg = useTransform(
    [smoothX, smoothY],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.08), transparent 50%)`
  );

  return (
    <div 
      ref={ref} 
      onMouseMove={onMouseMove}
      className={`hp-card group ${className}`}
      style={style}
    >
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: bg }}
      />
      <div className="hp-shimmer-glare" />
      {children}
    </div>
  );
};

/**
 * VelocitySkew
 * Skews content based on scroll velocity for a tactile "leaning" feel.
 */
export const VelocitySkew = ({ children, factor = 1 }: { children: React.ReactNode; factor?: number }) => {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  
  const skewRaw = useTransform(
    scrollVelocity, 
    [-3000, 3000], 
    [-5 * factor, 5 * factor]
  );
  const skew = useSpring(skewRaw, { stiffness: 400, damping: 90 });

  return (
    <motion.div style={{ skewY: skew, transformOrigin: 'center center' }}>
      {children}
    </motion.div>
  );
};

/**
 * DepthCard & DepthLayer
 * High-fidelity card with independent Z-depth layers for multi-plane parallax.
 * Note: Z-depth is currently disabled (multiplied by 0) for a flatter UI as requested.
 */
export const DepthLayer = ({ 
  children, 
  _depth = 0, 
  depth = 0,
  className = "",
  style = {}
}: { 
  children: React.ReactNode; 
  _depth?: number; 
  depth?: number; 
  className?: string;
  style?: React.CSSProperties;
}) => {
  const z = (_depth || depth) * 0;
  return (
    <div 
      className={`relative ${className}`}
      style={{ ...style, transform: `translateZ(${z}px)` }}
    >
      {children}
    </div>
  );
};

export const DepthCard = ({ 
  children, 
  className = "", 
  style = {},
  ...props
}: { 
  children: React.ReactNode; 
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    x.set(nx);
    y.set(ny);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
      style={{ 
        ...style,
      }}
      className={`hp-card group ${className}`}
    >
      {/* Glare effect */}
      <div className="hp-shimmer-glare" />
      
      {/* Dynamic Glow background */}
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity duration-500"
        style={{
          background: useTransform(
            [x, y],
            ([vx, vy]) => `radial-gradient(circle at ${(vx as number) * 100}% ${(vy as number) * 100}%, rgba(139, 92, 246, 0.15), transparent 70%)`
          )
        }}
      />

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

/**
 * InteractiveGrid
 * Mouse-reactive dot grid that warps around the cursor.
 */
export const InteractiveGrid = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
      <svg className="w-full h-full">
        <defs>
          <pattern id="dotGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.1)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotGrid)" />
      </svg>
    </div>
  );
};
