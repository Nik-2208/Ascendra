"use client";

import React from "react";

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Deep Slate Base */}
      <div className="absolute inset-0 bg-[#0F172A]" />

      {/* Layered Aurora Gradients */}
      <div 
        className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[140px] opacity-25 animate-pulse"
        style={{ background: "radial-gradient(circle, #6D5EF8 0%, transparent 70%)" }}
      />
      <div 
        className="absolute -bottom-[20%] -right-[10%] w-[65vw] h-[65vw] rounded-full blur-[160px] opacity-20"
        style={{ background: "radial-gradient(circle, #2ECC71 0%, transparent 70%)" }}
      />
      <div 
        className="absolute top-[40%] left-[30%] w-[45vw] h-[45vw] rounded-full blur-[150px] opacity-15"
        style={{ background: "radial-gradient(circle, #38BDF8 0%, transparent 70%)" }}
      />

    </div>
  );
}
