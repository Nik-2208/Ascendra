"use client";

import React, { useRef, useState } from "react";

interface MagnetButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "gold" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function MagnetButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: MagnetButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) * 0.2;
    const y = (e.clientY - (rect.top + rect.height / 2)) * 0.2;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const variantStyles = {
    primary: "bg-gradient-to-b from-[#6D5EF8] to-[#5546E0] border-[#897DFF] text-white shadow-[0_4px_20px_rgba(109,94,248,0.4)] hover:shadow-[0_6px_25px_rgba(109,94,248,0.6)]",
    secondary: "bg-gradient-to-b from-[#2ECC71] to-[#27AE60] border-[#58D68D] text-white shadow-[0_4px_20px_rgba(46,204,113,0.3)] hover:shadow-[0_6px_25px_rgba(46,204,113,0.5)]",
    gold: "bg-gradient-to-b from-[#F4C542] to-[#D4A31A] border-[#F7D572] text-slate-950 font-bold shadow-[0_4px_20px_rgba(244,197,66,0.4)] hover:shadow-[0_6px_25px_rgba(244,197,66,0.6)]",
    danger: "bg-gradient-to-b from-[#E74C3C] to-[#C0392B] border-[#F1948A] text-white shadow-[0_4px_20px_rgba(231,76,60,0.4)] hover:shadow-[0_6px_25px_rgba(231,76,60,0.6)]",
    ghost: "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200"
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-5 py-2.5 text-sm rounded-xl font-semibold",
    lg: "px-7 py-3.5 text-base rounded-2xl font-bold tracking-wide"
  };

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)`, transition: "transform 0.15s ease-out" }}
      className={`relative inline-flex items-center justify-center gap-2 border transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none group overflow-hidden ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      <span className="relative z-10 flex items-center gap-2 font-serif">{children}</span>
    </button>
  );
}
