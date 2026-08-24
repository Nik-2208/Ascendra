"use client";

import React from "react";
import { motion } from "framer-motion";

interface SpecularButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "gold" | "danger" | "ghost" | "royal";
  size?: "sm" | "md" | "lg";
}

export function SpecularButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: SpecularButtonProps) {
  const variantStyles = {
    primary: "bg-gradient-to-b from-[#F4C542] via-[#E6B800] to-[#B38600] border-[#FFE885] text-slate-950 shadow-[0_4px_20px_rgba(244,197,66,0.35)] hover:shadow-[0_6px_28px_rgba(244,197,66,0.55)] font-bold",
    royal: "bg-gradient-to-b from-[#8B5CF6] to-[#6D5EF8] border-[#A78BFA] text-white shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.55)] font-bold",
    gold: "bg-gradient-to-b from-[#FFF4BC] via-[#F4C542] to-[#D4A31A] border-[#FFF8DC] text-slate-950 font-bold shadow-[0_4px_20px_rgba(244,197,66,0.4)] hover:shadow-[0_6px_28px_rgba(244,197,66,0.6)]",
    secondary: "bg-gradient-to-b from-[#141C2E] to-[#0C1220] border-[#F4C542]/30 text-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#F4C542]/60 hover:text-white font-semibold",
    danger: "bg-gradient-to-b from-[#E74C3C] to-[#C0392B] border-[#F1948A] text-white shadow-[0_4px_20px_rgba(231,76,60,0.35)] hover:shadow-[0_6px_25px_rgba(231,76,60,0.55)] font-bold",
    ghost: "bg-slate-900/60 hover:bg-slate-800/80 border-white/10 text-slate-300 hover:text-white font-medium"
  };

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs rounded-xl",
    md: "px-5.5 py-2.5 text-sm rounded-xl font-serif tracking-wide",
    lg: "px-8 py-3.5 text-base rounded-2xl font-serif tracking-wider"
  };

  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -2, scale: 1.02 }}
      whileTap={disabled ? undefined : { y: 1, scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 border transition-all duration-200 select-none overflow-hidden ${
        disabled ? "opacity-45 cursor-not-allowed bg-slate-900/40 border-white/5 text-slate-500 shadow-none" : "cursor-pointer"
      } ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {/* Specular Metallic Light Sweep */}
      {!disabled && (
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
