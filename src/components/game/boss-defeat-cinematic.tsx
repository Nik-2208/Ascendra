"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { Skull, Crown, Star } from "lucide-react";
import { playSound } from "@/lib/sound-engine";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

export function BossDefeatCinematic() {
  const { bossDefeatData, clearBossDefeat } = useUIStore();
  const bossData = bossDefeatData as { name: string; rewards?: { xp?: number; coins?: number } } | null;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (bossData) {
      playSound("boss_defeat");
      setTimeout(() => setIsVisible(true), 100);
      
      const duration = 5000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ef4444', '#fbbf24', '#000000']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ef4444', '#fbbf24', '#000000']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      frame();

      // Auto close after 6 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(clearBossDefeat, 1000);
      }, 6000);
      
      return () => clearTimeout(timer);
    }
  }, [bossData, clearBossDefeat]);

  if (!bossData) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/90"
        >
          <motion.div 
            initial={{ scale: 0.7, y: 100, rotate: -5 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 1.2, y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="relative max-w-lg w-full mx-4 text-center"
          >
            <div className="absolute inset-0 bg-red-600/20 blur-[120px] rounded-full animate-pulse-glow" />
            
            <div className="relative">
              <div className="inline-block relative mb-8">
                <div className="absolute inset-0 bg-red-600/40 blur-[50px] rounded-full animate-pulse" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
                >
                  <Skull size={120} className="text-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.8)] relative z-10" />
                </motion.div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1 bg-white shadow-[0_0_20px_white] rotate-45 z-20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1 bg-white shadow-[0_0_20px_white] -rotate-45 z-20" />
              </div>
              
              <motion.h2 
                initial={{ letterSpacing: "0.2em", opacity: 0 }}
                animate={{ letterSpacing: "0.5em", opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-black uppercase text-red-500 mb-2 font-serif"
              >
                Target Destroyed
              </motion.h2>
              
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-6xl font-serif font-black text-white mb-8 leading-tight drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]"
              >
                {bossData.name}
              </motion.h3>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center gap-8 mb-8"
              >
                <div className="bg-black/60 border border-white/5 rounded-2xl p-5 flex-1 backdrop-blur-md shadow-2xl">
                  <Star size={24} className="text-yellow-400 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <div className="text-2xl font-extrabold text-yellow-400 font-serif">+{bossData.rewards?.xp || 0}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5 font-bold">XP Earned</div>
                </div>
                
                <div className="bg-black/60 border border-white/5 rounded-2xl p-5 flex-1 backdrop-blur-md shadow-2xl">
                  <Crown size={24} className="text-yellow-500 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                  <div className="text-2xl font-extrabold text-yellow-500 font-serif">+{bossData.rewards?.coins || 0}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5 font-bold">Coins Earned</div>
                </div>
              </motion.div>
              
              <p className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse font-bold">
                The realm grows safer with your victory.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

