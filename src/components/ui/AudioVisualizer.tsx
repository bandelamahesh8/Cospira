import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive?: boolean;
}

export const AudioVisualizer = ({ isActive = true }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; size: number; speed: number; color: string }[] = [];

    // Create luxury particles
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.1,
            color: `rgba(0, 200, 255, ${Math.random() * 0.5})`
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.y -= p.speed;
            if (p.y < 0) p.y = canvas.height;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });

        // Draw simple audio wave simulation (luxury sine)
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let i = 0; i < canvas.width; i++) {
            ctx.lineTo(i, canvas.height / 2 + Math.sin(i * 0.05 + Date.now() * 0.005) * 20 * (isActive ? 1 : 0.1));
        }
        ctx.strokeStyle = 'rgba(180, 50, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  return <canvas ref={canvasRef} width={300} height={100} className="w-full h-full opacity-60" />;
};
