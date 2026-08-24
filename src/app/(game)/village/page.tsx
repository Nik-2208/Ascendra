"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getCharacterAction } from "@/actions/game-actions";
import { ascendVillageAction } from "@/actions/character-actions";
import { 
  Sun,
  Moon,
  Wind,
  Shield,
  ArrowUpCircle,
  Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Milestone {
  name: string;
  icon: string;
  minLevel: number;
  description: string;
}

const MILESTONES: Milestone[] = [
  { name: "Dummy Village", icon: "🏠", minLevel: 1, description: "Where your journey begins." },
  { name: "Health Village", icon: "❤️", minLevel: 5, description: "A place of physical vitality." },
  { name: "Knowledge Village", icon: "📚", minLevel: 10, description: "Infinite shelves of wisdom." },
  { name: "Strength Village", icon: "⚔️", minLevel: 15, description: "Proving ground for warriors." },
  { name: "Creativity Village", icon: "🎨", minLevel: 20, description: "A forest of pure imagination." },
  { name: "Finance Village", icon: "💰", minLevel: 25, description: "Desert testing financial wisdom." },
  { name: "Discipline Village", icon: "🧠", minLevel: 30, description: "Unwavering focus settlement." },
  { name: "Master Village", icon: "🌎", minLevel: 35, description: "For legends of habit." },
  { name: "Eternal Citadel", icon: "🏰", minLevel: 40, description: "The peak of life mastery." }
];

export default function EnvironmentPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  
  const [currentTime, setCurrentTime] = useState<"day" | "night">("day");
 
  const { data: rawCharacter, isLoading } = useQuery({
    queryKey: ["character", userId],
    queryFn: () => getCharacterAction(userId!),
    enabled: !!userId
  });

  // Cycle day/night for visual ambiance
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 18 || hours < 6) {
      setCurrentTime("night");
    } else {
      setCurrentTime("day");
    }
  }, []);

  const triggerAscension = useMutation({
    mutationFn: async () => {
      const res = await ascendVillageAction();
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      import("@/lib/sound-engine").then(m => m.soundEngine.playLevelUp());
      queryClient.invalidateQueries({ queryKey: ["character", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      alert("You have Ascended. Your foundation is stronger.");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to Ascend.");
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Fallbacks if character is empty
  const character = rawCharacter || {
    name: "User",
    level: 1,
    villageLevel: 1,
    villageHealth: 100,
    rebirths: 0,
    className: "Novice"
  };

  const vLevel = character.level || 1;
  const vHealth = (character as any).villageHealth !== undefined ? (character as any).villageHealth : 100;
  const ascensionCount = Math.max((character as any).prestige || 0, (character as any).rebirths || 0);

  const activeMilestones = MILESTONES.filter(b => vLevel >= b.minLevel);
  const lockedMilestones = MILESTONES.filter(b => vLevel < b.minLevel);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Wind size={24} className="text-primary" /> Sanctuary
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Watch your inner world grow as you complete tasks in the physical world.
          </p>
        </div>
        
        {/* Day/Night visual toggler */}
        <button 
          onClick={() => setCurrentTime(c => c === "day" ? "night" : "day")}
          className="bg-black/40 border border-white/10 hover:border-white/30 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-white transition-colors"
        >
          {currentTime === "day" ? (
            <><Sun size={14} className="text-[#eab308]" /> Day Phase</>
          ) : (
            <><Moon size={14} className="text-[#3b82f6]" /> Night Phase</>
          )}
        </button>
      </header>

      {/* Sanctuary HUD panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rpg-panel p-5 rounded-xl border border-white/10 space-y-1">
          <div className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">Sanctuary Level</div>
          <div className="text-xl font-light text-foreground flex items-center gap-2">
            Level {vLevel} / 50
          </div>
        </div>

        <div className="rpg-panel p-5 rounded-xl border border-white/10 space-y-1">
          <div className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Foundation Integrity</span>
            {vHealth < 50 && <span className="text-[#f59e0b] text-[9px] uppercase font-bold animate-pulse">Needs Attention</span>}
          </div>
          <div className="text-xl font-light text-foreground flex items-center gap-2">
            {vHealth}% Stable
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                vHealth < 40 ? "bg-[#ef4444]" : vHealth < 80 ? "bg-[#f59e0b]" : "bg-[#10b981]"
              }`}
              style={{ width: `${vHealth}%` }}
            />
          </div>
        </div>

        <div className="rpg-panel p-5 rounded-xl border border-white/10 space-y-1">
          <div className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">Ascension Status</div>
          <div className="text-xl font-light text-foreground">
            {ascensionCount} cycles ({ascensionCount * 10}% Boost)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Interactive map visualization grid */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`w-full aspect-[16/9] rounded-2xl border border-border/30 relative overflow-hidden transition-colors duration-1000 ${
            currentTime === "day" 
              ? "bg-gradient-to-b from-sky-400/10 via-emerald-950/10 to-emerald-950/20" 
              : "bg-gradient-to-b from-indigo-950/20 via-slate-900/30 to-background/50"
          }`}>
            {/* Ambient weather particles (stars/clouds) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03),_transparent)] pointer-events-none" />

            <div className="absolute inset-0 p-8 grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-6 items-center justify-center">
              {activeMilestones.map((b) => (
                <motion.div 
                  key={b.name}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl rpg-panel rpg-panel-interactive border-none bg-background/20 hover:bg-background/40 transition-all relative overflow-hidden backdrop-blur-md"
                >
                  <div className="ambient-particle" style={{ left: "20%", bottom: "15%", animationDelay: "0.5s", opacity: 0.3 }} />
                  <div className="ambient-particle" style={{ right: "20%", bottom: "20%", animationDelay: "1.5s", opacity: 0.3 }} />
                  <span className="text-4xl sm:text-5xl drop-shadow-sm select-none z-10">{b.icon}</span>
                  <span className="text-[10px] font-medium text-foreground mt-3 text-center tracking-wide z-10">{b.name}</span>
                  <span className="text-[8px] font-bold text-[#10b981] mt-1 z-10">Unlocked</span>
                </motion.div>
              ))}
              {lockedMilestones.map((b) => (
                <div 
                  key={b.name}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-border/50 bg-background/5 opacity-40 grayscale"
                  title={`Unlocks at level ${b.minLevel}`}
                >
                  <span className="text-4xl sm:text-5xl select-none">{b.icon}</span>
                  <span className="text-[10px] font-medium text-muted-foreground mt-3 text-center">{b.name}</span>
                  <span className="text-[8px] font-mono text-muted-foreground mt-1">Lvl {b.minLevel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ascension details and logs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Rebirth Hub card */}
          <div className="rpg-panel p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <ArrowUpCircle size={16} className="text-[#10b981]" /> Ascend
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once you reach level 50, you can reset your level in exchange for a permanent foundation multiplier. This signifies mastering a chapter of your life.
            </p>

            <button 
              onClick={() => triggerAscension.mutate()}
              disabled={character.level < 50}
              className="w-full rpg-btn-primary py-3 rounded-lg font-bold text-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Begin Ascension
            </button>
            {character.level < 50 && (
              <p className="text-[10px] text-muted-foreground font-medium text-center">
                Requires Level 50
              </p>
            )}
          </div>

          {/* Negative Marking Wall Decays */}
          <div className="rpg-panel p-6 rounded-xl space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Activity size={16} className="text-[#3b82f6]" /> Sanctuary Status
            </h3>
            {vHealth < 100 ? (
              <div className="bg-muted/30 border border-border/50 p-4 rounded-lg">
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Your foundation is slightly weakened. Complete tasks and maintain streaks to restore its integrity.
                </p>
              </div>
            ) : (
              <div className="bg-muted/10 p-4 rounded-lg">
                <p className="text-xs text-muted-foreground leading-relaxed">Your foundation is perfectly stable. Your focus and discipline are flourishing.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
