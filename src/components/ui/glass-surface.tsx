"use client";

import React from "react";

interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: "purple" | "emerald" | "gold" | "crimson" | "cyan" | "none";
}

export function GlassSurface({ children, className = "", glow = "none", ...props }: GlassSurfaceProps) {
  const glowMap = {
    purple: "border-[#6D5EF8]/40 shadow-[0_0_20px_rgba(109,94,248,0.15)]",
    emerald: "border-[#2ECC71]/40 shadow-[0_0_20px_rgba(46,204,113,0.15)]",
    gold: "border-[#F4C542]/40 shadow-[0_0_20px_rgba(244,197,66,0.15)]",
    crimson: "border-[#E74C3C]/40 shadow-[0_0_20px_rgba(231,76,60,0.15)]",
    cyan: "border-[#38BDF8]/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]",
    none: "border-[var(--border)]"
  };

  return (
    <div
      className={`relative bg-[var(--card)] text-[var(--foreground)] border backdrop-blur-xl rounded-2xl shadow-xl transition-all duration-300 ${glowMap[glow]} ${className}`}
      {...props}
    >
      {/* Specular highlight border at the top edge */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-t-2xl" />
      {children}
    </div>
  );
}
