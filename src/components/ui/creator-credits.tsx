"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatorCreditsProps {
  className?: string;
  compact?: boolean;
}

export function CreatorCredits({
  className,
  compact = false,
}: CreatorCreditsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(109,94,248,0.25)] select-none",
        compact ? "py-2.5 px-3" : "p-4",
        className
      )}
    >
      {/* Gentle Pulsing Background Glow */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-purple-600/10 via-amber-500/5 to-indigo-600/10 opacity-50 transition-opacity duration-500 group-hover:opacity-100 animate-pulse" />

      <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 text-center">
        <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400">
          <span>Forged with</span>
          <Brain className="inline h-3 w-3 text-purple-400" />
          <span>by</span>
        </p>

        <h4 className="bg-gradient-to-r from-white via-amber-200 to-purple-300 bg-clip-text text-xs font-serif font-bold tracking-wider text-transparent drop-shadow-[0_0_10px_rgba(244,197,66,0.3)] sm:text-sm">
          Nikhilesh H. Chavda
        </h4>

        {/* Compact Icon Buttons */}
        <div className="mt-1 flex items-center justify-center gap-2">
          <a
            href="https://github.com/Nik-2208"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Profile of Nikhilesh H. Chavda"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1 text-[11px] font-medium text-slate-300 shadow-sm transition-all hover:border-purple-500/50 hover:bg-purple-950/40 hover:text-white"
          >
            <svg
              className="h-3.5 w-3.5 fill-current text-slate-300"
              viewBox="0 0 24 24"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>

          <a
            href="https://www.linkedin.com/in/nikhilesh-chavda-2b779533a/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Profile of Nikhilesh H. Chavda"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1 text-[11px] font-medium text-slate-300 shadow-sm transition-all hover:border-sky-500/50 hover:bg-sky-950/40 hover:text-white"
          >
            <svg
              className="h-3.5 w-3.5 fill-current text-slate-300"
              viewBox="0 0 24 24"
            >
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            <span>LinkedIn</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
}