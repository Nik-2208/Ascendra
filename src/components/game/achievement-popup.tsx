"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";
import { Trophy } from "lucide-react";
import { soundEngine } from "@/lib/sound-engine";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export function AchievementPopup() {
  const { achievementQueue, popAchievement } = useUIStore();
  const queryClient = useQueryClient();
  const current = achievementQueue[0] as { icon?: string; name: string } | undefined;

  useEffect(() => {
    if (current) {
      soundEngine.playAchievement();
      
      // Instantly synchronize XP, Gold, Stats, and Village dashboards
      queryClient.invalidateQueries({ queryKey: ["character"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      const timer = setTimeout(() => {
        popAchievement();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [current, popAchievement, queryClient]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div 
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[110]"
        >
          <div className="bg-black/90 border border-yellow-500/30 shadow-[0_10px_40px_rgba(251,191,36,0.2)] px-6 py-4 rounded-2xl flex items-center gap-4 backdrop-blur-xl gold-trim">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl relative flex-shrink-0">
               {current.icon}
               <div className="absolute inset-0 rounded-xl border border-yellow-500/40 animate-ping opacity-30" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 mb-0.5 flex items-center gap-1.5 font-serif">
                <Trophy size={11} /> Achievement Unlocked
              </div>
              <h3 className="font-bold text-white tracking-wide text-sm">{current.name}</h3>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
