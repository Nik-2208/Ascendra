"use client";

import { motion } from "framer-motion";
import { AscendraLogo } from "./ascendra-logo";

interface AscendraLoaderProps {
  text?: string;
  progress?: number;
}

export function AscendraLoader({ text = "Loading Realm...", progress }: AscendraLoaderProps) {
  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 select-none">
      {/* Floating Glowing Logo */}
      <motion.div
        animate={{
          y: [-4, 4, -4],
          filter: [
            "drop-shadow(0 0 15px rgba(109,94,248,0.3))",
            "drop-shadow(0 0 35px rgba(109,94,248,0.7))",
            "drop-shadow(0 0 15px rgba(109,94,248,0.3))",
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-8"
      >
        <AscendraLogo size="hero" animated={false} />
      </motion.div>

      {/* Synchronized Progress Bar & Text */}
      <div className="w-full max-w-xs space-y-3 text-center">
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: progress !== undefined ? `${progress}%` : ["0%", "70%", "90%", "100%"] }}
            transition={
              progress !== undefined
                ? { duration: 0.3 }
                : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
            }
          />
        </div>
        <p className="text-xs font-serif font-bold text-purple-200/80 uppercase tracking-widest animate-pulse">
          {text}
        </p>
      </div>
    </div>
  );
}
