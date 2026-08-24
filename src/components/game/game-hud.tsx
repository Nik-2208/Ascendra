"use client";

import { useCharacterStore } from "@/stores/character-store";
import { usePetStore } from "@/stores/pet-store";
import { useBossStore } from "@/stores/boss-store";
import { useStreakStore } from "@/stores/streak-store";
import { calculateTitle, xpForCurrentLevel, xpForNextLevel } from "@/lib/game-engine";
import { PET_TEMPLATES, getEvolutionEmoji } from "@/lib/pet-engine";
import { Coins, Flame, Swords } from "lucide-react";

/**
 * GameHUD displays global real-time stats across the entire application.
 * It subscribes to Zustand stores independently.
 */
export function GameHUD() {
  const { profile } = useCharacterStore();
  const { pets } = usePetStore();
  const { bosses } = useBossStore();
  const { streaks } = useStreakStore();

  if (!profile) return null;

  // Level Math
  const currentLevelBaseXP = xpForCurrentLevel(profile.level);
  const nextLevelXP = xpForNextLevel(profile.level);
  const xpIntoLevel = profile.totalXP - currentLevelBaseXP;
  const xpNeededForNext = nextLevelXP - currentLevelBaseXP;
  const xpProgress = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForNext) * 100));

  // Active Pet
  const activePet = pets.find(p => p.isActive);
  const activePetTemplate = activePet ? PET_TEMPLATES.find(t => t.id === activePet.templateId) : null;
  const petEmoji = (activePetTemplate && activePet) 
    ? getEvolutionEmoji(activePetTemplate, activePet.evolutionStage) 
    : null;

  // Active Boss
  const activeBoss = bosses.find(b => b.status === "active");

  // Best active streak
  let bestStreak = 0;
  streaks.forEach(s => {
    if (s.currentCount > bestStreak) bestStreak = s.currentCount;
  });

  return (
    <div className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50 shadow-sm hidden md:block">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* Left: Level & XP */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-background border border-primary/50 flex items-center justify-center text-xs font-bold text-primary">
              {profile.level}
            </div>
            <div className="hidden lg:block">
              <div className="text-sm font-bold font-cinzel leading-none">
                {calculateTitle(profile.level, profile.prestige)}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                {profile.totalXP.toLocaleString()} XP
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block flex-1 max-w-[200px]">
            <div className="h-2 bg-background border border-border/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-xp-gold to-yellow-300 transition-all duration-1000 ease-out"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Active Boss (if any) */}
        <div className="flex-1 flex justify-center">
          {activeBoss && (
            <div className="flex items-center gap-3 bg-danger/10 border border-danger/30 px-4 py-1 rounded-full">
              <Swords size={14} className="text-danger" />
              <div className="text-xs font-bold font-cinzel text-danger">{activeBoss.name}</div>
              <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden">
                <div 
                  className="h-full bg-danger transition-all duration-500"
                  style={{ width: `${Math.max(0, (activeBoss.currentHP / activeBoss.maxHP) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Economy & Status */}
        <div className="flex items-center justify-end gap-6 flex-1">
          
          {/* Best Streak */}
          {bestStreak > 0 && (
            <div className="flex items-center gap-1 text-danger">
              <Flame size={16} className={bestStreak > 0 ? "fill-danger" : ""} />
              <span className="font-bold text-sm">{bestStreak}</span>
            </div>
          )}

          {/* Active Pet */}
          {petEmoji && (
            <div className="text-lg" title={`Active: ${activePet?.name}`}>
              {petEmoji}
            </div>
          )}

          {/* Coins */}
          <div className="flex items-center gap-1.5 text-coins bg-coins/10 px-3 py-1 rounded-full border border-coins/20">
            <Coins size={14} />
            <span className="font-bold font-cinzel">{profile.coins.toLocaleString()}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
