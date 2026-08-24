"use client";

import { useUIStore } from "@/stores/ui-store";
import { ParticleEffect } from "./particle-effect";
import { motion, AnimatePresence } from "framer-motion";

export function LevelUpOverlay() {
  const { levelUpOverlay, clearLevelUp } = useUIStore();

  return (
    <AnimatePresence>
      {levelUpOverlay && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md" 
            onClick={clearLevelUp}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
            
            <motion.div 
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              className="text-center relative z-10 max-w-md px-6"
            >
              <motion.div 
                initial={{ letterSpacing: "0.1em", opacity: 0 }}
                animate={{ letterSpacing: "0.25em", opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-yellow-400 text-3xl font-extrabold tracking-widest uppercase mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] font-serif"
              >
                Level Up!
              </motion.div>
              
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-yellow-400/20 blur-[80px] rounded-full animate-pulse-glow" />
                
                <motion.div 
                  initial={{ rotateY: 180, scale: 0.7 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.1 }}
                  className="w-48 h-48 rounded-full border-4 border-yellow-400 bg-black/60 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.4)] relative z-10"
                >
                  <span className="text-8xl font-serif font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                    {levelUpOverlay}
                  </span>
                </motion.div>
                
                {/* Spinning ring */}
                <motion.svg 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                  className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] pointer-events-none" 
                  viewBox="0 0 100 100"
                >
                  <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="1" strokeDasharray="12 6" />
                </motion.svg>
              </div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-serif text-gray-300 font-medium"
              >
                Your powers have grown stronger.
              </motion.p>

              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(251,191,36,0.6)" }}
                whileTap={{ scale: 0.95 }}
                onClick={clearLevelUp}
                className="mt-8 px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-extrabold uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.3)] border border-yellow-400/30 transition-all font-serif"
              >
                Continue Journey
              </motion.button>
            </motion.div>
          </motion.div>
          
          <ParticleEffect type="sparks" duration={4000} />
        </>
      )}
    </AnimatePresence>
  );
}

