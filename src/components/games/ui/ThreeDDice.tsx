import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThreeDDiceProps {
  value: number;
  rolling?: boolean;
  className?: string;
  size?: number;
}

export const ThreeDDice: React.FC<ThreeDDiceProps> = ({ value, rolling, className, size = 60 }) => {
  const controls = useAnimation();
  const [currentRotation, setCurrentRotation] = useState({ x: 0, y: 0, z: 0 });

  // Map values to rotations
  const rotations: Record<number, { x: number; y: number; z: number }> = {
    1: { x: 0, y: 0, z: 0 },
    2: { x: 0, y: 180, z: 0 },
    3: { x: 0, y: -90, z: 0 },
    4: { x: 0, y: 90, z: 0 },
    5: { x: -90, y: 0, z: 0 },
    6: { x: 90, y: 0, z: 0 },
  };

  useEffect(() => {
    if (rolling) {
      controls.start({
        rotateX: [0, 360, 720, 1080],
        rotateY: [0, 360, 720, 1080],
        rotateZ: [0, 360, 720, 1080],
        transition: {
          duration: 0.6,
          repeat: Infinity,
          ease: 'linear',
        },
      });
    } else if (value >= 1 && value <= 6) {
      const target = rotations[value];
      controls.start({
        rotateX: target.x,
        rotateY: target.y,
        rotateZ: target.z,
        transition: {
          type: 'spring',
          stiffness: 260,
          damping: 20,
        },
      });
      setCurrentRotation(target);
    }
  }, [rolling, value, controls]);

  const dotPositions: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [
      [25, 25],
      [75, 75],
    ],
    3: [
      [25, 25],
      [50, 50],
      [75, 75],
    ],
    4: [
      [25, 25],
      [25, 75],
      [75, 25],
      [75, 75],
    ],
    5: [
      [25, 25],
      [25, 75],
      [75, 25],
      [75, 75],
      [50, 50],
    ],
    6: [
      [25, 25],
      [25, 50],
      [25, 75],
      [75, 25],
      [75, 50],
      [75, 75],
    ],
  };

  const renderFace = (faceValue: number, transform: string) => (
    <div
      className='absolute bg-white rounded-xl border-2 border-slate-200 shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden'
      style={{
        width: size,
        height: size,
        transform: transform,
        backfaceVisibility: 'hidden',
      }}
    >
      <div className='relative w-full h-full'>
        {dotPositions[faceValue].map(([x, y], i) => (
          <div
            key={i}
            className='absolute bg-slate-800 rounded-full shadow-sm'
            style={{
              width: size * 0.18,
              height: size * 0.18,
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
    </div>
  );

  const halfSize = size / 2;

  return (
    <div className={cn('perspective-1000', className)} style={{ width: size, height: size }}>
      <motion.div
        animate={controls}
        className='relative w-full h-full transform-style-3d'
        style={{ perspective: 1000 }}
      >
        {/* Front */}
        {renderFace(1, `translateZ(${halfSize}px)`)}
        {/* Back */}
        {renderFace(2, `rotateY(180deg) translateZ(${halfSize}px)`)}
        {/* Left */}
        {renderFace(3, `rotateY(-90deg) translateZ(${halfSize}px)`)}
        {/* Right */}
        {renderFace(4, `rotateY(90deg) translateZ(${halfSize}px)`)}
        {/* Top */}
        {renderFace(5, `rotateX(90deg) translateZ(${halfSize}px)`)}
        {/* Bottom */}
        {renderFace(6, `rotateX(-90deg) translateZ(${halfSize}px)`)}
      </motion.div>
    </div>
  );
};
