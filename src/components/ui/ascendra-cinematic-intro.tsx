"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AscendraCinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

export function AscendraCinematicIntro({ onComplete, forcePlay = false }: AscendraCinematicIntroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState(0); // 0..5 build phases

  useEffect(() => {
    // Play once per session unless forcePlay is true
    const hasSeen = sessionStorage.getItem("ascendra_intro_seen");
    if (!hasSeen || forcePlay) {
      setIsVisible(true);
      sessionStorage.setItem("ascendra_intro_seen", "true");

      const timers = [
        setTimeout(() => setStage(1), 250),   // 0.25s: Star burst
        setTimeout(() => setStage(2), 550),   // 0.55s: Sun & crescent arc
        setTimeout(() => setStage(3), 950),   // 0.95s: Mountain rise
        setTimeout(() => setStage(4), 1450),  // 1.45s: Golden Ribbon draw
        setTimeout(() => setStage(5), 2100),  // 2.10s: Outer A-Frame forge
        setTimeout(() => setStage(6), 3100),  // 3.10s: Celestial Ring reveal
        setTimeout(() => setStage(7), 3700),  // 3.70s: Gold Sweep & Pulse
        setTimeout(() => setStage(8), 4100),  // 4.10s: ASCENDRA Text
        setTimeout(() => setStage(9), 4450),  // 4.45s: Tagline
        setTimeout(() => {
          setIsVisible(false);
          if (onComplete) onComplete();
        }, 5000),                              // 5.00s: Complete & Transition
      ];

      return () => timers.forEach(clearTimeout);
    } else {
      if (onComplete) onComplete();
    }
  }, [forcePlay, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cinematic-intro"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="fixed inset-0 z-[999999] bg-[#07050E] flex flex-col items-center justify-center overflow-hidden select-none"
      >
        {/* Deep Space Background Atmosphere & Volumetric Nebula */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-950/40 via-[#07050E] to-[#030206] pointer-events-none" />

        {/* Ambient Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          {[...Array(24)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-amber-200/80 rounded-full"
              style={{
                top: `${(i * 17) % 100}%`,
                left: `${(i * 23) % 100}%`,
              }}
              animate={{
                y: [-20, -100],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 3 + (i % 3),
                repeat: Infinity,
                delay: (i * 0.15) % 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Outer Purple Energy Aura */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: stage >= 5 ? [0.3, 0.6, 0.3] : 0,
            scale: stage >= 5 ? [1, 1.08, 1] : 0.8,
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[450px] h-[450px] rounded-full bg-purple-600/20 blur-[90px] pointer-events-none"
        />

        {/* Procedural Vector Emblem & Celestial Canvas */}
        <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
          {/* 3.10s Celestial Navigation Ring / Runic Compass */}
          <motion.svg
            viewBox="0 0 500 500"
            className="absolute inset-0 w-full h-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.7, rotate: -30 }}
            animate={{
              opacity: stage >= 6 ? 0.35 : 0,
              scale: stage >= 6 ? 1 : 0.7,
              rotate: stage >= 6 ? 0 : -30,
            }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {/* Concentric Runic Rings */}
            <circle cx="250" cy="220" r="180" stroke="url(#goldGrad)" strokeWidth="1" fill="none" strokeDasharray="4 8" />
            <circle cx="250" cy="220" r="165" stroke="#F4C542" strokeWidth="0.5" fill="none" opacity="0.4" />
            <circle cx="250" cy="220" r="150" stroke="url(#goldGrad)" strokeWidth="1" fill="none" strokeDasharray="12 12" />

            {/* Compass Ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1="250"
                y1="40"
                x2="250"
                y2="48"
                stroke="#F4C542"
                strokeWidth="1.5"
                transform={`rotate(${deg} 250 220)`}
                opacity="0.6"
              />
            ))}
          </motion.svg>

          {/* Core Emblem SVG */}
          <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
            <defs>
              {/* Rich 3D Metallic Gold Gradient */}
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF2B2" />
                <stop offset="25%" stopColor="#E6B800" />
                <stop offset="50%" stopColor="#B38600" />
                <stop offset="75%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#997300" />
              </linearGradient>

              {/* Shimmer Highlight Gradient */}
              <linearGradient id="shimmerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>

            {/* 0.95s Mountain Peak & Sun Rays */}
            {stage >= 3 && (
              <g className="transition-all duration-700">
                {/* Sun Beams */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  {[0, 25, 50, 75, 100].map((angle, i) => (
                    <line
                      key={i}
                      x1="285"
                      y1="195"
                      x2={285 + Math.cos((angle * Math.PI) / 180) * 35}
                      y2={195 - Math.sin((angle * Math.PI) / 180) * 35}
                      stroke="#FFE885"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  ))}
                  <circle cx="285" cy="195" r="14" fill="url(#goldGrad)" />
                </motion.g>

                {/* Mountain Facets */}
                <motion.path
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  d="M 195 295 L 250 185 L 285 295 Z"
                  fill="url(#goldGrad)"
                  stroke="#FFE885"
                  strokeWidth="1.5"
                />
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: 0.2 }}
                  d="M 250 185 L 255 295 L 285 295 Z"
                  fill="#7D6608"
                />
              </g>
            )}

            {/* 1.45s Molten Gold Orbit Ribbon Sweep */}
            {stage >= 4 && (
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                d="M 165 320 C 205 260 295 210 365 200 C 315 250 245 315 165 320 Z"
                fill="url(#goldGrad)"
                stroke="#FFF2B2"
                strokeWidth="1.5"
              />
            )}

            {/* 2.10s Outer Gothic 'A' Frame Forged */}
            {stage >= 5 && (
              <g>
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.0, ease: "easeInOut" }}
                  d="M 145 365 L 220 120 L 250 75 L 280 120 L 355 365 L 305 365 L 275 290 L 225 290 L 195 365 Z"
                  fill="url(#goldGrad)"
                  stroke="#FFE885"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {/* Inner Arch Cutout */}
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  d="M 235 250 L 250 155 L 265 250 Z"
                  fill="#07050E"
                />
              </g>
            )}

            {/* 0.25s Apex Golden Compass Star */}
            {stage >= 1 && (
              <g>
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.4, 1], opacity: 1 }}
                  transition={{ duration: 0.5, ease: "backOut" }}
                >
                  {/* Outer Flare Glow */}
                  <circle cx="250" cy="65" r="22" fill="#F4C542" opacity="0.3" className="animate-ping" />

                  {/* 4-Point Star */}
                  <path
                    d="M 250 40 L 256 60 L 276 65 L 256 70 L 250 90 L 244 70 L 224 65 L 244 60 Z"
                    fill="url(#goldGrad)"
                    stroke="#FFFFFF"
                    strokeWidth="1"
                  />
                </motion.g>

                {/* Lower Accent Star */}
                <motion.path
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.9 }}
                  transition={{ delay: 0.3 }}
                  d="M 250 120 L 253 130 L 263 133 L 253 136 L 250 146 L 247 136 L 237 133 L 247 130 Z"
                  fill="#F9E79F"
                />
              </g>
            )}

            {/* 3.70s Synchronized Light Reflection Sweep */}
            {stage >= 7 && (
              <motion.rect
                x="0"
                y="0"
                width="500"
                height="500"
                fill="url(#shimmerGrad)"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{ mixBlendMode: "overlay" }}
              />
            )}
          </svg>
        </div>

        {/* 4.10s & 4.45s Text & Tagline */}
        <div className="mt-4 text-center z-10 flex flex-col items-center">
          {stage >= 8 && (
            <motion.h1
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-4xl sm:text-5xl font-serif font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2B2] via-[#FFD700] to-[#E6B800] drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]"
            >
              ASCENDRA
            </motion.h1>
          )}

          {stage >= 9 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 0.4 }}
              className="text-xs sm:text-sm font-serif font-medium tracking-[0.35em] text-amber-100/70 uppercase mt-2"
            >
              Rise Beyond Yourself.
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
