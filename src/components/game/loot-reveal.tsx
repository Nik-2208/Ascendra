"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { Sparkles, X } from "lucide-react";
import { getRarityColor } from "@/lib/loot-engine";
import { motion, AnimatePresence } from "framer-motion";

export function LootReveal() {
  const { lootRevealData, clearLootReveal } = useUIStore();
  const lootData = lootRevealData as { rarity: string; name: string; stats?: Record<string, number> } | null;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lootData) {
      setTimeout(() => setIsVisible(true), 100);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(clearLootReveal, 500);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [lootData, clearLootReveal]);

  if (!lootData) return null;

  const color = getRarityColor(lootData.rarity as Parameters<typeof getRarityColor>[0]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/75"
        >
          <motion.div 
            initial={{ scale: 0.8, rotateY: 90, y: 30 }}
            animate={{ scale: 1, rotateY: 0, y: 0 }}
            exit={{ scale: 0.8, rotateY: -90, y: -30 }}
            transition={{ type: "spring", stiffness: 150, damping: 15 }}
            className="relative max-w-sm w-full mx-4"
          >
            {/* Glow behind */}
            <div 
              className="absolute inset-0 blur-[100px] opacity-40 rounded-full"
              style={{ backgroundColor: color }}
            />
            
            <div 
              className="relative bg-black/80 border-2 rounded-3xl p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl"
              style={{ borderColor: color, boxShadow: `0 0 50px ${color}30` }}
            >
              {/* Top light sweep */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-3xl pointer-events-none">
                <div className="absolute top-0 -left-full w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-45deg] animate-[shimmer_2s_infinite]" />
              </div>

              <button 
                onClick={() => { setIsVisible(false); setTimeout(clearLootReveal, 500); }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10 p-1 rounded-full hover:bg-white/5"
              >
                <X size={18} />
              </button>

              <div className="flex justify-center mb-6 relative">
                <Sparkles size={52} style={{ color }} className="animate-spin-slow drop-shadow-[0_0_15px_currentColor]" />
              </div>
              
              <h2 className="text-xs font-black uppercase tracking-[0.25em] mb-2 font-serif" style={{ color }}>
                {lootData.rarity} Drop
              </h2>
              
              <h3 className="text-3xl font-serif font-black text-white mb-6 leading-tight tracking-wide">
                {lootData.name}
              </h3>

              <div className="bg-black/50 rounded-2xl p-5 space-y-3 border border-white/5">
                {Object.entries(lootData.stats || {}).map(([stat, val]) => (
                  <div key={stat} className="flex justify-between items-center text-sm font-bold uppercase tracking-wider">
                    <span className="capitalize text-muted-foreground">{stat}</span>
                    <span className="text-white">+{val as number}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground mt-6 font-bold uppercase tracking-widest">
                Added to Inventory
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

