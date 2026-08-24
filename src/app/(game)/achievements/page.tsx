"use client";

import { Trophy, Lock, Star, CheckCircle, Zap, Swords, Filter, Calendar, Gift } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAchievementsAction } from "@/actions/achievement-actions";

const ACHIEVEMENT_CATEGORIES = [
  { id: "All", label: "All" },
  { id: "Levels", label: "⭐ Character" },
  { id: "Bosses", label: "⚔ Boss Battles" },
  { id: "World Map", label: "🗺 World Exploration" },
  { id: "Village", label: "🏰 Village" },
  { id: "Quests", label: "📜 Quest Board" },
  { id: "Study", label: "📚 Study" },
  { id: "Health", label: "💪 Fitness" },
  { id: "Focus", label: "🧘 Mindfulness" },
  { id: "Finance", label: "💰 Finance" },
  { id: "Collection", label: "🎒 Inventory" },
  { id: "Skills", label: "🌳 Skill Tree" },
  { id: "Streaks", label: "🔥 Streaks" },
  { id: "Hidden", label: "❓ Hidden" }
];

export default function MilestonesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeFilter, setActiveFilter] = useState("all"); // all, unlocked, locked, near

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => getAchievementsAction(),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  // Filter logic
  const filteredAchievements = achievements.filter(a => {
    // 1. Category Filter
    if (activeCategory !== "All") {
      const match = (a.category || "Hidden").toLowerCase() === activeCategory.toLowerCase();
      if (!match) return false;
    }

    // 2. Lock state filter
    if (activeFilter === "unlocked") return a.isUnlocked;
    if (activeFilter === "locked") return !a.isUnlocked;
    if (activeFilter === "near") {
      if (a.isUnlocked) return false;
      const progress = a.progress || 0;
      const req = a.requirement || 1;
      return (progress / req) >= 0.7; // 70%+ progress
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 drop-shadow-md flex items-center gap-2">
            <Trophy size={26} className="text-purple-400" /> Trophies & Milestones
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Collect moments of growth and exceptional performance. Every milestone awards Coins + XP.
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <div className="text-2xl font-light text-foreground">{unlockedCount} <span className="text-muted-foreground text-sm">/ {achievements.length}</span></div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Unlocked Trophies</div>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 bg-black/40 border border-white/5 p-1 rounded-xl w-full md:w-auto">
          {ACHIEVEMENT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                activeCategory === cat.id
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Lock State Filter Button Group */}
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 p-1 rounded-xl shrink-0">
          {["all", "unlocked", "locked", "near"].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                activeFilter === f
                  ? "bg-zinc-800 text-white"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {f === "near" ? "Near Completion" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      {filteredAchievements.length === 0 ? (
        <div className="rpg-panel border-dashed border-2 border-white/10 rounded-2xl p-16 text-center text-muted-foreground">
          <Trophy size={48} className="mx-auto mb-4 opacity-20 text-purple-400" />
          <p className="font-serif font-bold text-lg text-white">No Trophies found</p>
          <p className="text-xs mt-1">No achievements match the current selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((def) => {
            const isUnlocked = def.isUnlocked;
            const progress = def.progress || 0;
            const req = def.requirement || 1;
            const progressPct = Math.min(100, (progress / req) * 100);

            return (
              <div 
                key={def.id} 
                className={`rpg-panel rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 relative border overflow-hidden ${
                  isUnlocked 
                    ? "border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.08)] bg-black/50" 
                    : "opacity-60 bg-black/20 border-white/5"
                }`}
              >
                {isUnlocked && (
                  <div className="absolute top-3 right-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
                    Completed
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl border border-white/5 shrink-0 ${
                      isUnlocked ? "bg-purple-600/10 shadow-[0_0_10px_rgba(168,85,247,0.3)] text-yellow-400" : "bg-zinc-900 text-zinc-600"
                    }`}>
                      {isUnlocked ? (def.iconUrl || "🏆") : <Lock size={20} />}
                    </div>
                    <div>
                      <h3 className={`font-bold font-serif text-sm ${isUnlocked ? 'text-white' : 'text-zinc-400'}`}>
                        {def.name}
                      </h3>
                      <span className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">
                        {def.category || "Hidden"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {def.description}
                  </p>
                </div>

                <div className="mt-6 space-y-3 pt-4 border-t border-white/5">
                  {/* Rewards preview */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Gift size={12} className="text-purple-400" /> Rewards
                    </span>
                    <span className="font-bold text-purple-300">
                      +{def.rewards?.xp || 50} XP / +{def.rewards?.coins || 25} Coins
                    </span>
                  </div>

                  {/* Progress or Unlock Date */}
                  {isUnlocked ? (
                    def.unlockedAt && (
                      <div className="flex items-center justify-between text-[9px] text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> Unlocked on
                        </span>
                        <span className="font-bold">
                          {new Date(def.unlockedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )
                  ) : (
                    req > 1 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                          <span>Progress</span>
                          <span>{progress} / {req}</span>
                        </div>
                        <div className="h-1.5 bg-black border border-white/5 rounded-full overflow-hidden w-full">
                          <div 
                            className="h-full bg-purple-600/70 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
