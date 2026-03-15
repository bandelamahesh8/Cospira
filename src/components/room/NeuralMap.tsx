/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BreakoutSession } from '@/types/organization';

interface NeuralMapProps {
  rooms: BreakoutSession[];
  onRoomClick?: (roomId: string) => void;
}

/**
 * NeuralMap (3D-ish Activity Visualization)
 * Uses Canvas or CSS transforms to show room interconnections
 * and participant clusters in real-time.
 */
export const NeuralMap: React.FC<NeuralMapProps> = ({ rooms, onRoomClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    const nodes = rooms.map((room, i) => ({
      id: room.id,
      name: room.name,
      x: Math.cos(i * ((Math.PI * 2) / rooms.length)) * 150 + canvas.width / 2,
      y: Math.sin(i * ((Math.PI * 2) / rooms.length)) * 150 + canvas.height / 2,
      size: 10 + (room.participants_count || 0) * 2,
      pulse: 0,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Connections
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
      ctx.beginPath();
      nodes.forEach((node, i) => {
        nodes.slice(i + 1).forEach((target) => {
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
        });
      });
      ctx.stroke();

      // Draw Nodes
      nodes.forEach((node) => {
        node.pulse += 0.05;
        const pulseSize = Math.sin(node.pulse) * 3;

        // Outer Glow
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          node.size + 20
        );
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 20, 0, Math.PI * 2);
        ctx.fill();

        // Node Body
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + pulseSize, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 8px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(node.name.toUpperCase(), node.x, node.y + node.size + 15);
      });

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [rooms]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className='relative w-full aspect-square max-w-md mx-auto'
    >
      <canvas ref={canvasRef} width={500} height={500} className='w-full h-full cursor-crosshair' />
      <div className='absolute inset-0 pointer-events-none border border-white/5 rounded-full' />
    </motion.div>
  );
};
