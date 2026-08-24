"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, Book, Heart, Coins, Palette, Compass, ChevronRight } from "lucide-react";

const CLASSES = [
  {
    id: "warrior",
    name: "Warrior",
    icon: Swords,
    color: "var(--danger)",
    description: "Focuses on physical health and raw discipline. Deals heavy damage to bosses.",
    bonuses: ["+10% Strength", "+10% Health", "+10% Discipline"]
  },
  {
    id: "scholar",
    name: "Scholar",
    icon: Book,
    color: "var(--primary)",
    description: "Master of knowledge and wisdom. Learns quickly and earns more XP.",
    bonuses: ["+30% Knowledge", "+10% Wisdom", "+10% Focus"]
  },
  {
    id: "monk",
    name: "Monk",
    icon: Heart,
    color: "#a855f7", // purple
    description: "Unbreakable focus and discipline. Excels at fighting distractions and maintaining streaks.",
    bonuses: ["+30% Discipline", "+20% Focus", "+0% Health"]
  },
  {
    id: "builder",
    name: "Builder",
    icon: Coins,
    color: "var(--xp-gold)",
    description: "Focuses on wealth and structure. Masters the economy and long-term goals.",
    bonuses: ["+30% Finance", "+10% Discipline", "+10% Knowledge"]
  },
  {
    id: "creator",
    name: "Creator",
    icon: Palette,
    color: "#ec4899", // pink
    description: "Driven by inspiration. Excels in creativity and charisma.",
    bonuses: ["+30% Creativity", "+20% Charisma", "+0% Focus"]
  },
  {
    id: "explorer",
    name: "Explorer",
    icon: Compass,
    color: "var(--success)",
    description: "Jack of all trades. Discovers world regions faster and finds better loot.",
    bonuses: ["+20% Wisdom", "+10% Health", "+10% Charisma"]
  }
];

export default function ClassSelectionPage() {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedClass) return;
    // Save to local storage temporarily during onboarding
    localStorage.setItem("onboarding_class", selectedClass);
    router.push("/onboarding/avatar");
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-white">Choose Your Path</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Every great adventurer begins with a choice. Your class determines your starting bonuses and shapes your initial journey.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {CLASSES.map((c) => {
          const isSelected = selectedClass === c.id;
          const Icon = c.icon;
          
          return (
            <div 
              key={c.id}
              onClick={() => setSelectedClass(c.id)}
              className={`rpg-panel rpg-panel-interactive p-6 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                isSelected 
                  ? "border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105" 
                  : "hover:border-white/50 hover:bg-white/5"
              }`}
              style={{
                borderColor: isSelected ? c.color : undefined,
                boxShadow: isSelected ? `0 0 30px ${c.color}40` : undefined
              }}
            >
              {/* Glow background */}
              {isSelected && (
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{ background: `radial-gradient(circle at center, ${c.color}, transparent)` }}
                />
              )}
              
              <div 
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  isSelected ? "bg-black/50" : "bg-black/30 group-hover:bg-black/50"
                }`}
                style={{ border: `2px solid ${c.color}` }}
              >
                <Icon size={32} style={{ color: c.color }} />
              </div>
              
              <h3 className="text-2xl font-cinzel font-bold mb-2">{c.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 h-16">{c.description}</p>
              
              <div className="space-y-1">
                {c.bonuses.map((bonus) => (
                  <div key={bonus} className="text-xs font-bold uppercase tracking-wider" style={{ color: c.color }}>
                    {bonus}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleContinue}
          disabled={!selectedClass}
          className="group relative inline-flex items-center justify-center px-12 py-4 font-bold text-white transition-all duration-200 bg-primary rounded-full hover:shadow-[0_0_40px_rgba(var(--primary),0.6)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="uppercase tracking-widest text-sm flex items-center gap-2">
            Confirm Path <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>
    </div>
  );
}
