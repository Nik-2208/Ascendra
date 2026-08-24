"use client";

import { usePetStore } from "@/stores/pet-store";
import { PET_TEMPLATES, getEvolutionEmoji } from "@/lib/pet-engine";
import { useState, useEffect, useRef } from "react";
import { Sparkles, X } from "lucide-react";

export function PetWidget() {
  const { pets } = usePetStore();
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [petMessage, setPetMessage] = useState<string | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePet = pets.find((p) => p.isActive);

  // Random pet messages
  useEffect(() => {
    if (!activePet) return;
    let messageTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const messages = [
          "You got this!",
          "Keep going!",
          "Let's conquer the day!",
          `Level ${activePet.level} and growing!`,
          "I'm hungry for XP!",
        ];
        setPetMessage(messages[Math.floor(Math.random() * messages.length)]);
        if (messageTimeoutId) clearTimeout(messageTimeoutId);
        messageTimeoutId = setTimeout(() => setPetMessage(null), 5000);
      }
    }, 60000); // Check every minute
    return () => {
      clearInterval(interval);
      if (messageTimeoutId) clearTimeout(messageTimeoutId);
    };
  }, [activePet]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  if (!activePet || !isVisible) return null;

  const template = PET_TEMPLATES.find((t) => t.id === activePet.templateId);
  if (!template) return null;

  const emoji = getEvolutionEmoji(template, activePet.evolutionStage);

  return (
    <div 
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none"
    >
      {/* Speech Bubble */}
      {petMessage && (
        <div className="mb-2 mr-4 bg-card border border-border p-3 rounded-2xl rounded-br-sm shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto relative">
          <Sparkles size={12} className="absolute -top-1 -left-1 text-primary animate-pulse" />
          {petMessage}
        </div>
      )}

      {/* Pet Character */}
      <div 
        className="relative pointer-events-auto cursor-pointer group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          setPetMessage("Petting... ❤️");
          if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = setTimeout(() => setPetMessage(null), 2000);
        }}
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse-glow" />
        
        {/* Close Button (only on hover) */}
        {isHovered && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
            className="absolute -top-2 -right-2 bg-black text-muted-foreground hover:text-white rounded-full p-1 border border-border z-10"
          >
            <X size={12} />
          </button>
        )}

        {/* Pet Avatar */}
        <div className="relative w-16 h-16 bg-black/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-4xl shadow-2xl transition-transform duration-300 hover:scale-110 group-hover:rotate-6">
          <span className="animate-bounce-slow" style={{ animationDuration: '3s' }}>
            {emoji}
          </span>
        </div>
      </div>
    </div>
  );
}
