"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

const AVATARS = ["🧙‍♂️", "🧝‍♀️", "🥷", "🧛‍♂️", "🧟‍♀️", "🦸‍♂️", "🧜‍♀️", "🧚‍♂️", "🧞‍♀️", "🦁", "🐉", "🐺"];

export default function AvatarSelectionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [charClass, setCharClass] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("onboarding_class");
    }
    return null;
  });

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedAvatar) return;
    
    localStorage.setItem("onboarding_name", name);
    localStorage.setItem("onboarding_avatar", selectedAvatar);
    
    router.push("/onboarding/first-quest");
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-white">Identify Yourself</h1>
        <p className="text-muted-foreground">
          What shall the bards call you, {charClass || "adventurer"}?
        </p>
      </div>

      <form onSubmit={handleContinue} className="rpg-panel p-8 rounded-3xl space-y-8">
        
        {/* Avatar Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">
            Choose Your Visage
          </label>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                type="button"
                onClick={() => setSelectedAvatar(avatar)}
                className={`text-4xl w-16 h-16 rounded-full mx-auto flex items-center justify-center transition-all ${
                  selectedAvatar === avatar 
                    ? "bg-purple-500/20 border-2 border-purple-500 scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)]" 
                    : "bg-black/30 border border-white/10 hover:bg-black/50 hover:scale-105"
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border/50 w-full" />

        {/* Name Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">
            Your True Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g. Arthur, Merlin, Kael..."
            className="w-full text-center text-2xl font-cinzel font-bold bg-black/50 border-b-2 border-border/50 py-4 focus:outline-none focus:border-primary transition-colors text-white placeholder:text-white/20"
            maxLength={20}
            required
          />
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={!name.trim()}
            className="group relative inline-flex items-center justify-center px-12 py-4 font-bold text-white transition-all duration-200 bg-primary rounded-full hover:shadow-[0_0_40px_rgba(var(--primary),0.6)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="uppercase tracking-widest text-sm flex items-center gap-2">
              Step Forward <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
