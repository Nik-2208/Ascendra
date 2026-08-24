"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AscendraLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  animated?: boolean;
  showText?: boolean;
}

export function AscendraLogo({
  className,
  size = "md",
  animated = true,
  showText = true,
}: AscendraLogoProps) {
  const emblemSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
    hero: "w-28 h-28 sm:w-36 sm:h-36",
  };

  const textSizes = {
    sm: "text-sm tracking-[0.2em]",
    md: "text-lg tracking-[0.22em]",
    lg: "text-2xl tracking-[0.25em]",
    xl: "text-4xl tracking-[0.28em]",
    hero: "text-5xl sm:text-6xl tracking-[0.3em]",
  };

  const EmblemSVG = (
    <svg
      viewBox="0 0 200 220"
      className={cn("drop-shadow-[0_0_12px_rgba(244,197,66,0.35)] shrink-0", emblemSizes[size])}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="emblemGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF4BC" />
          <stop offset="30%" stopColor="#E6B800" />
          <stop offset="60%" stopColor="#B38600" />
          <stop offset="85%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#806000" />
        </linearGradient>
      </defs>

      {/* Sun & Rays */}
      <g>
        {[0, 30, 60, 90].map((angle, i) => (
          <line
            key={i}
            x1="115"
            y1="82"
            x2={115 + Math.cos((angle * Math.PI) / 180) * 18}
            y2={82 - Math.sin((angle * Math.PI) / 180) * 18}
            stroke="#FFE885"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
        <circle cx="115" cy="82" r="7" fill="url(#emblemGoldGrad)" />
      </g>

      {/* Mountain Peak */}
      <path
        d="M 75 130 L 100 80 L 118 130 Z"
        fill="url(#emblemGoldGrad)"
        stroke="#FFE885"
        strokeWidth="1"
      />
      <path
        d="M 100 80 L 104 130 L 118 130 Z"
        fill="#7D6608"
        opacity="0.6"
      />

      {/* Orbital Ribbon */}
      <path
        d="M 60 142 C 80 112 125 90 158 85 C 135 110 100 138 60 142 Z"
        fill="url(#emblemGoldGrad)"
        stroke="#FFF4BC"
        strokeWidth="1"
      />

      {/* Outer Gothic 'A' Arch Frame */}
      <path
        d="M 50 168 L 88 52 L 100 30 L 112 52 L 150 168 L 128 168 L 112 132 L 88 132 L 72 168 Z"
        fill="url(#emblemGoldGrad)"
        stroke="#FFE885"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner Cutout */}
      <path
        d="M 94 115 L 100 70 L 106 115 Z"
        fill="#05030A"
      />

      {/* Apex 4-Point Compass Star */}
      <circle cx="100" cy="24" r="10" fill="#F4C542" opacity="0.3" />
      <path
        d="M 100 10 L 103 20 L 113 23 L 103 26 L 100 36 L 97 26 L 87 23 L 97 20 Z"
        fill="url(#emblemGoldGrad)"
        stroke="#FFFFFF"
        strokeWidth="0.75"
      />
    </svg>
  );

  const logoContent = (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {EmblemSVG}
      {showText && (
        <span
          className={cn(
            "font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF4BC] via-[#FFD700] to-[#E6B800] drop-shadow-[0_2px_10px_rgba(255,215,0,0.35)] leading-none flex items-center",
            textSizes[size]
          )}
        >
          ASCENDRA
        </span>
      )}
    </div>
  );

  if (!animated) return logoContent;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="inline-flex items-center"
    >
      {logoContent}
    </motion.div>
  );
}
