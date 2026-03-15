"use client";

import React, { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface SwipeButtonProps {
  onComplete: () => void;
  text?: string;
  className?: string;
}

export const SwipeButton = ({ 
  onComplete, 
  text = "Swipe to Experience",
  className = "" 
}: SwipeButtonProps) => {
  // Track drag position
  const x = useMotionValue(0);
  
  // Map drag position to styles
  const textOpacity = useTransform(x, [0, 100], [0.3, 0]);

  const handleDragEnd = () => {
    // If dragged enough, complete the action
    if (x.get() > 180) {
      onComplete();
    } else {
      // Reset position
      x.set(0);
    }
  };

  return (
    <div className={`relative w-[280px] h-[64px] bg-white/[0.03] border border-white/10 rounded-full p-2 backdrop-blur-xl flex items-center shadow-2xl ${className}`}>
      
      {/* Background track text */}
      <motion.div 
        style={{ opacity: textOpacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className="text-white/60 text-xs font-bold uppercase tracking-[0.3em] pl-12">
          {text}
        </span>
      </motion.div>

      {/* The Draggable Handle */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 210 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.05 }}
        className="relative z-20 w-12 h-12 bg-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_0_20px_rgba(255,255,255,0.3)]"
      >
        <ArrowRight className="text-black w-5 h-5" />
      </motion.div>

      {/* Shimmer effect for the track */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      </div>
    </div>
  );
};
