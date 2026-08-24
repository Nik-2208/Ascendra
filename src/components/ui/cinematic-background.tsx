"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export function CinematicBackground() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Window & Main Scroll Parallax Engine
  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, { stiffness: 50, damping: 25 });

  // Parallax Layers
  const yLayer1 = useTransform(smoothScrollY, [0, 2500], [0, -80]);
  const yLayer2 = useTransform(smoothScrollY, [0, 2500], [0, -180]);
  const yLayer3 = useTransform(smoothScrollY, [0, 2500], [0, -320]);
  const yLayer4 = useTransform(smoothScrollY, [0, 2500], [0, -480]);
  const yLayer5 = useTransform(smoothScrollY, [0, 2500], [0, -620]);
  const scalePulse = useTransform(smoothScrollY, [0, 2500], [1, 1.10]);

  // Biome Layer Profiles per Route
  const getBiomeProfile = () => {
    if (pathname === "/") {
      return {
        name: "Ancient Kingdom",
        primaryBlob: "#F4C542",
        secondaryBlob: "#6D5EF8",
        tertiaryBlob: "#38BDF8",
        aurora: "from-amber-900/15 via-purple-900/10 to-transparent",
        particles: ["#F4C542", "#E2E8F0", "#38BDF8"],
      };
    }
    if (pathname.includes("boss-arena")) {
      return {
        name: "Colosseum Storm",
        primaryBlob: "#E74C3C",
        secondaryBlob: "#F4C542",
        tertiaryBlob: "#FF7849",
        aurora: "from-red-950/20 via-amber-900/10 to-transparent",
        particles: ["#E74C3C", "#F4C542", "#FF7849"],
      };
    }
    if (pathname.includes("brain-lab")) {
      return {
        name: "Neural Universe",
        primaryBlob: "#38BDF8",
        secondaryBlob: "#818CF8",
        tertiaryBlob: "#F4C542",
        aurora: "from-sky-950/20 via-indigo-950/15 to-transparent",
        particles: ["#38BDF8", "#818CF8", "#F4C542"],
      };
    }
    return {
      name: "Celestial Realm",
      primaryBlob: "#F4C542",
      secondaryBlob: "#6D5EF8",
      tertiaryBlob: "#38BDF8",
      aurora: "from-amber-950/15 via-purple-950/10 to-transparent",
      particles: ["#F4C542", "#E2E8F0", "#38BDF8"],
    };
  };

  const biome = getBiomeProfile();

  if (!mounted || !isTabActive) {
    return <div className="fixed inset-0 pointer-events-none z-0 bg-[#05070C]" />;
  }

  if (reducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#05070C]">
        <div
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full blur-[140px] opacity-15"
          style={{ background: `radial-gradient(circle, ${biome.primaryBlob} 0%, transparent 70%)` }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#05070C]">
      {/* LAYER 1: Deep Night Sky Base & Radial Vignette */}
      <motion.div
        style={{ y: yLayer1 }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0C1220] via-[#05070C] to-[#020306]"
      />

      {/* LAYER 2: Huge Blurred Nebula Clouds */}
      <motion.div style={{ y: yLayer2, scale: scalePulse }} className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-[25%] -left-[15%] w-[75vw] h-[75vw] rounded-full blur-[170px] opacity-20 animate-pulse"
          style={{
            background: `radial-gradient(circle, ${biome.primaryBlob} 0%, transparent 70%)`,
            animationDuration: "9s",
          }}
        />
        <div
          className="absolute -bottom-[25%] -right-[15%] w-[75vw] h-[75vw] rounded-full blur-[180px] opacity-15"
          style={{
            background: `radial-gradient(circle, ${biome.secondaryBlob} 0%, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* LAYER 3: Soft Volumetric Light & Celestial Rays */}
      <motion.div style={{ y: yLayer3 }} className="absolute inset-0 opacity-15 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <defs>
            <linearGradient id="volumetricRayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF4BC" stopOpacity="0.15" />
              <stop offset="60%" stopColor={biome.primaryBlob} stopOpacity="0.04" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="150,0 300,0 850,1000 700,1000" fill="url(#volumetricRayGrad)" />
        </svg>
      </motion.div>

      {/* LAYER 4: Animated Celestial Aurora */}
      <motion.div style={{ y: yLayer3 }} className="absolute inset-0 pointer-events-none opacity-25">
        <div className={`absolute top-0 inset-x-0 h-[45vh] bg-gradient-to-b ${biome.aurora} blur-[90px] animate-pulse`} style={{ animationDuration: "12s" }} />
      </motion.div>

      {/* LAYER 5: Faint Constellation Lines */}
      <motion.div style={{ y: yLayer4 }} className="absolute inset-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1200 800">
          <g stroke="#F4C542" strokeWidth="0.5" strokeDasharray="3 6" fill="none" opacity="0.6">
            <line x1="200" y1="120" x2="320" y2="180" />
            <line x1="320" y1="180" x2="410" y2="140" />
            <line x1="410" y1="140" x2="520" y2="210" />
            <circle cx="200" cy="120" r="2" fill="#F4C542" />
            <circle cx="320" cy="180" r="2.5" fill="#FFF4BC" />
            <circle cx="410" cy="140" r="2" fill="#F4C542" />
            <circle cx="520" cy="210" r="3" fill="#FFF4BC" />

            <line x1="850" y1="100" x2="940" y2="170" />
            <line x1="940" y1="170" x2="1050" y2="130" />
            <circle cx="850" cy="100" r="2" fill="#F4C542" />
            <circle cx="940" cy="170" r="2.5" fill="#FFF4BC" />
            <circle cx="1050" cy="130" r="2" fill="#F4C542" />
          </g>
        </svg>
      </motion.div>

      {/* LAYER 6: Floating Magical Particles & Embers */}
      <motion.div style={{ y: yLayer5 }} className="absolute inset-0 opacity-40 pointer-events-none">
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${(i % 3) * 2 + 2}px`,
              height: `${(i % 3) * 2 + 2}px`,
              left: `${(i * 11 + 7) % 100}%`,
              top: `${(i * 13 + 5) % 100}%`,
              backgroundColor: biome.particles[i % biome.particles.length],
              boxShadow: `0 0 10px ${biome.particles[i % biome.particles.length]}`,
              animationDuration: `${5 + (i % 3) * 3}s`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </motion.div>

      {/* LAYER 7: Tiny Distant Stars */}
      <div className="absolute inset-0 opacity-35 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-amber-100 animate-ping"
            style={{
              width: i % 2 === 0 ? "1.5px" : "2px",
              height: i % 2 === 0 ? "1.5px" : "2px",
              top: `${(i * 17 + 5) % 45}%`,
              left: `${(i * 21 + 9) % 100}%`,
              animationDuration: `${3.5 + (i % 4) * 2}s`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* LAYER 8: Soft Depth Fog & Central Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[170px] opacity-15 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${biome.primaryBlob} 0%, transparent 70%)` }}
      />
    </div>
  );
}
