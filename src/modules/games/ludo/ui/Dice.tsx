/**
 * Dice.tsx
 * High-fidelity 3D Dice with Smooth Fluid Physics
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceProps {
    value: number;
    isRolling: boolean;
    themeColor: string;
}

const DOTS: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]]
};

export const Dice: React.FC<DiceProps> = ({ value, isRolling, themeColor }) => {
    return (
        <div className="w-24 h-24 flex items-center justify-center" style={{ perspective: '1200px' }}>
            <motion.div
                animate={isRolling ? {
                    rotateX: [0, 180, 360, 540, 720],
                    rotateY: [0, 360, 0, 720, 360],
                    rotateZ: [0, 45, 0, -45, 0],
                    scale: [1, 1.15, 0.95, 1.1, 1],
                    y: [0, -30, 0, -15, 0],
                } : {
                    rotateX: 0,
                    rotateY: 0,
                    rotateZ: 0,
                    scale: 1,
                    y: 0
                }}
                transition={isRolling ? {
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut"
                } : {
                    type: 'spring',
                    stiffness: 300,
                    damping: 15,
                    mass: 0.8
                }}
                className="w-20 h-20 relative preserve-3d"
            >
                {/* Main Dice Body */}
                <motion.div 
                    className="w-full h-full bg-white rounded-2xl relative shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden border-[1px] border-slate-200"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Inner Glow/Shadow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,1)_0%,_rgba(240,242,245,1)_100%)]" />
                    
                    {/* Dots Layer */}
                    <AnimatePresence mode="wait">
                        <motion.svg 
                            key={value}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.2 }}
                            viewBox="0 0 100 100" 
                            className="absolute inset-[15%] w-[70%] h-[70%]"
                        >
                            {(DOTS[value || 1]).map(([cx, cy], i) => (
                                <motion.circle 
                                    key={i} 
                                    cx={cx} 
                                    cy={cy} 
                                    r="11" 
                                    fill={themeColor} 
                                    className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                                />
                            ))}
                        </motion.svg>
                    </AnimatePresence>

                    {/* Ambient Occlusion & Bevel */}
                    <div className="absolute inset-0 rounded-2xl shadow-[inset_0_4px_12px_rgba(255,255,255,0.8),inset_0_-4px_12px_rgba(0,0,0,0.1)] pointer-events-none" />
                    <div className="absolute inset-0 border-[6px] border-white/40 rounded-2xl pointer-events-none" />
                </motion.div>

                {/* Reflection Highlight */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-white/40 blur-xl rounded-full pointer-events-none" />
            </motion.div>
        </div>
    );
};
