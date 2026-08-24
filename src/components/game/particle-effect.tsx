"use client";

import { useEffect, useRef } from "react";

interface ParticleEffectProps {
  type: "confetti" | "sparks" | "explosion";
  duration?: number;
  onComplete?: () => void;
}

export function ParticleEffect({ type, duration = 3000, onComplete }: ParticleEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      decay: number;
    }
    const particles: Particle[] = [];
    let animationId: number;
    const startTime = Date.now();

    // Create particles based on type
    const createParticles = () => {
      const count = type === "explosion" ? 150 : 100;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: type === "explosion" ? canvas.width / 2 : Math.random() * canvas.width,
          y: type === "explosion" ? canvas.height / 2 : type === "confetti" ? -50 : canvas.height + 50,
          vx: type === "explosion" ? (Math.random() - 0.5) * 20 : (Math.random() - 0.5) * 5,
          vy: type === "explosion" ? (Math.random() - 0.5) * 20 : type === "confetti" ? Math.random() * 5 + 2 : -Math.random() * 10 - 5,
          size: Math.random() * 8 + 2,
          color: `hsl(${Math.random() * 60 + 30}, 100%, 50%)`, // Golden/Orange spectrum
          life: 1,
          decay: Math.random() * 0.02 + 0.01
        });
      }
    };

    createParticles();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let allDead = true;

      particles.forEach((p, index) => {
        if (p.life <= 0) return;
        allDead = false;

        p.x += p.vx;
        p.y += p.vy;
        
        if (type !== "explosion") {
           p.vy += 0.1; // gravity
        }
        
        p.life -= p.decay;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (type === "confetti") {
          ctx.fillRect(p.x, p.y, p.size, p.size * 2);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (!allDead && Date.now() - startTime < duration) {
        animationId = requestAnimationFrame(render);
      } else {
        if (onComplete) onComplete();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [type, duration, onComplete]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[100]"
    />
  );
}
