"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";

export type CursorState = "default" | "hover" | "click" | "loading" | "disabled";

export function CustomCursor() {
  const pathname = usePathname();
  const ui = useUIStore();
  const cursorRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [cursorState, setCursorState] = useState<CursorState>("default");
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mousePos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const velocity = useRef({ vx: 0, vy: 0 });
  const rotationAngle = useRef(0);
  const animFrameId = useRef<number | null>(null);

  // Dynamic Location Aura Color based on active route
  const getLocationAura = () => {
    if (pathname.includes("boss-arena")) return { color: "#E74C3C", label: "flaming" };
    if (pathname.includes("brain-lab")) return { color: "#38BDF8", label: "electric" };
    if (pathname.includes("shop") || pathname.includes("money-jar")) return { color: "#F4C542", label: "gold" };
    if (pathname.includes("life-map")) return { color: "#2ECC71", label: "compass" };
    if (pathname.includes("quests") || pathname.includes("schedule")) return { color: "#F59E0B", label: "parchment" };
    if (pathname.includes("settings")) return { color: "#E2E8F0", label: "silver" };
    return { color: "#6D5EF8", label: "royal" };
  };

  const locationAura = getLocationAura();

  useEffect(() => {
    // Disable on touch / mobile devices
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
      return;
    }

    if (!ui.customCursorEnabled) {
      document.body.classList.remove("has-custom-cursor");
      return;
    }

    document.body.classList.add("has-custom-cursor");

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      const target = e.target as HTMLElement;
      if (!target) return;

      // Restore native cursor for text inputs
      if (target.closest("input, textarea, [contenteditable]")) {
        setCursorState("default");
        return;
      }

      if (target.closest("[disabled], .disabled, [aria-disabled='true']")) {
        setCursorState("disabled");
      } else if (target.closest(".is-loading, [aria-busy='true']")) {
        setCursorState("loading");
      } else if (target.closest("button, a, select, [role='button'], .cursor-pointer")) {
        setCursorState("hover");
      } else {
        setCursorState("default");
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setCursorState("click");
      const newParticle = { 
        id: Date.now(), 
        x: e.clientX, 
        y: e.clientY, 
        color: locationAura.color 
      };
      setParticles((prev) => [...prev.slice(-10), newParticle]);
    };

    const handleMouseUp = () => {
      setCursorState("default");
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    // 144Hz Smooth Lerp Physics Loop with Velocity Rotation Tilt
    const updatePosition = () => {
      const dx = mousePos.current.x - currentPos.current.x;
      const dy = mousePos.current.y - currentPos.current.y;

      velocity.current.vx += (dx * 0.35 - velocity.current.vx) * 0.25;
      velocity.current.vy += (dy * 0.35 - velocity.current.vy) * 0.25;

      currentPos.current.x += velocity.current.vx;
      currentPos.current.y += velocity.current.vy;

      // Calculate subtle rotation tilt toward movement direction
      const speed = Math.hypot(velocity.current.vx, velocity.current.vy);
      if (speed > 1) {
        const targetAngle = (Math.atan2(velocity.current.vy, velocity.current.vx) * 180) / Math.PI + 45;
        rotationAngle.current += (targetAngle - rotationAngle.current) * 0.1;
      }

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0)`;
      }

      animFrameId.current = requestAnimationFrame(updatePosition);
    };

    animFrameId.current = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [ui.customCursorEnabled, locationAura.color]);

  if (!mounted || isTouchDevice || !ui.customCursorEnabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {/* Click Magical Dust Sparkles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute w-2.5 h-2.5 rounded-full animate-ping opacity-80 pointer-events-none"
          style={{ 
            left: p.x - 5, 
            top: p.y - 5,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}` 
          }}
        />
      ))}

      {/* AAA Illustrated Silver, Dark Oak & Gold Fantasy Arrow Pointer */}
      <div
        ref={cursorRef}
        className="absolute top-0 left-0 transition-opacity duration-150 pointer-events-none"
      >
        {cursorState === "loading" ? (
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            {/* Rotating Arcane Glyph Circle */}
            <div 
              className="w-10 h-10 rounded-full border-2 border-dashed animate-spin"
              style={{ borderColor: locationAura.color }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: locationAura.color }} />
            </div>
          </div>
        ) : (
          <div 
            className={`origin-top-left transition-transform duration-100 ${
              cursorState === "hover"
                ? "scale-110"
                : cursorState === "click"
                ? "scale-90"
                : cursorState === "disabled"
                ? "grayscale opacity-40"
                : ""
            }`}
            style={{ transform: `rotate(${rotationAngle.current * 0.15}deg)` }}
          >
            <svg
              width="38"
              height="38"
              viewBox="0 0 40 40"
              fill="none"
              className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            >
              {/* Contextual Location Radial Aura Glow */}
              <circle
                cx="6"
                cy="6"
                r="14"
                fill={locationAura.color}
                opacity={cursorState === "hover" ? "0.45" : "0.25"}
                className="animate-pulse"
              />

              {/* Dark Oak Wood Shaft (Base Layer) */}
              <path
                d="M5 5L26 26L22 28L18 24L12 30L8 26L14 20L10 16L5 5Z"
                fill="url(#oakShaftGradient)"
                stroke="#1E1B4B"
                strokeWidth="1"
              />

              {/* Forged Silver Arrowhead Blade (Primary Layer) */}
              <path
                d="M2 2L16 34L20 22L32 18L2 2Z"
                fill="url(#silverBladeGradient)"
                stroke="#0F172A"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />

              {/* Forged Silver Blade Highlight Ridge */}
              <path
                d="M2 2L20 22"
                stroke="#FFFFFF"
                strokeWidth="1.25"
                opacity="0.9"
              />

              {/* Gold Filigree Engraving Line */}
              <path
                d="M8 12L24 16"
                stroke="#F4C542"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Central Blue Magical Crystal Socket */}
              <circle cx="11" cy="11" r="3.5" fill="#0F172A" stroke="#F4C542" strokeWidth="1" />
              <circle cx="11" cy="11" r="2" fill="#38BDF8" className="animate-pulse" />

              {/* Sharp Silver Blade Tip Highlight Dot */}
              <circle cx="2" cy="2" r="1" fill="#FFFFFF" />

              <defs>
                {/* Metallic Silver Gradient */}
                <linearGradient id="silverBladeGradient" x1="2" y1="2" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="0.35" stopColor="#E2E8F0" />
                  <stop offset="0.7" stopColor="#94A3B8" />
                  <stop offset="1" stopColor="#475569" />
                </linearGradient>

                {/* Dark Oak Wood Gradient */}
                <linearGradient id="oakShaftGradient" x1="5" y1="5" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#78350F" />
                  <stop offset="0.5" stopColor="#451A03" />
                  <stop offset="1" stopColor="#1E1B4B" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
