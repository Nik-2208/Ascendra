"use client";

import { useBossStore } from "@/stores/boss-store";
import { useEffect, useState, useMemo, useRef } from "react";
import { WORLD_REGIONS, type WorldRegion, isRegionUnlocked } from "@/lib/world-engine";
import { playSound } from "@/lib/sound-engine";
import { Map as MapIcon, Lock, Compass, Swords, Crown, Target, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboardData } from "@/actions/dashboard-actions";
import { getActiveBoss, toggleBossChallengeAction } from "@/actions/boss-actions";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SpecularButton } from "@/components/ui/specular-button";

export default function WorldMapPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });
  const profile = dashboard?.profile;
  const { data: bossData } = useQuery({
    queryKey: ["bossArena", null],
    queryFn: () => getActiveBoss(null),
    enabled: !!profile?.userId || !!profile?.id,
  });
  const { bosses } = useBossStore();
  const [selectedRegion, setSelectedRegion] = useState<WorldRegion | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string | null>(null);

  const playerLevel = profile?.level || 1;
  const playerStats = useMemo(() => {
    const rawStats = profile?.stats || {};
    return {
      knowledge: { level: (rawStats as any).intelligence || 1, xp: 0 },
      strength: { level: (rawStats as any).strength || 1, xp: 0 },
      health: { level: (rawStats as any).defense || 1, xp: 0 },
      discipline: { level: (rawStats as any).agility || 1, xp: 0 },
      finance: { level: (rawStats as any).luck || 1, xp: 0 },
      focus: { level: 1, xp: 0 },
      creativity: { level: 1, xp: 0 },
      charisma: { level: 1, xp: 0 },
      wisdom: { level: 1, xp: 0 },
      relationships: { level: 1, xp: 0 },
    };
  }, [profile?.stats]);

  const activeToggledBossId = bossData?.bossProgress?.dedicatedBossId || null;

  const unlockedRegions: string[] = (profile as any)?.unlockedRegions || [];

  const prevUnlockedRef = useRef<string[]>([]);
  useEffect(() => {
    if (prevUnlockedRef.current.length > 0) {
      const newlyUnlockedRegions = unlockedRegions.filter((id: string) => !prevUnlockedRef.current.includes(id));
      if (newlyUnlockedRegions.length > 0) {
        const region = WORLD_REGIONS.find(r => r.id === newlyUnlockedRegions[0]);
        if (region) {
          setNewlyUnlocked(region.name);
          playSound("region_discovery");
          setTimeout(() => setNewlyUnlocked(null), 5000);
        }
      }
    }
    prevUnlockedRef.current = unlockedRegions;
  }, [unlockedRegions]);

  const handleRegionClick = (region: WorldRegion) => {
    playSound("click");
    setSelectedRegion(region);
  };

  const setDedicatedTargetMutation = useMutation({
    mutationFn: async ({ bossId, navigate }: { bossId: string; navigate?: boolean }) => {
      await toggleBossChallengeAction(bossId, true);
      if (navigate) {
        router.push(`/boss-arena?boss=${bossId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["bossArena"] });
    }
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 max-w-6xl mx-auto"
    >
      {/* Region unlock toast */}
      {newlyUnlocked && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#6D5EF8] border border-[#897DFF] text-white px-6 py-4 rounded-2xl shadow-2xl animate-bounce flex items-center gap-3">
          <Compass className="animate-spin text-[#F4C542]" size={24} />
          <div>
            <div className="font-bold text-sm">New Region Explored!</div>
            <div className="text-xs opacity-90">You have entered {newlyUnlocked}.</div>
          </div>
        </div>
      )}

      <header className="space-y-2">
        <span className="px-3 py-1 bg-[#6D5EF8]/20 border border-[#6D5EF8]/40 text-[#6D5EF8] rounded-full text-xs font-bold uppercase tracking-widest">
          Animated Kingdom Atlas
        </span>
        <h1 className="text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-[#38BDF8] drop-shadow-md">
          World Map & Territory Exploration
        </h1>
        <p className="text-slate-400 text-sm">
          Chart unlocked territories across the kingdom, set dedicated targets, and launch boss combat encounters.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Interactive Canvas */}
        <GlassSurface glow="cyan" className="lg:col-span-2 p-6 relative overflow-hidden aspect-[4/3] flex flex-col justify-between">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-bold font-serif text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
              <MapIcon size={16} /> Kingdom Territory Grid
            </span>
            <span className="text-xs font-mono text-slate-400">
              Unlocked: {unlockedRegions.length} / {WORLD_REGIONS.length}
            </span>
          </div>

          {/* Connected Region Nodes */}
          <div className="relative flex-1 my-4">
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
              {WORLD_REGIONS.flatMap((region) =>
                region.connections.map((connId) => {
                  const target = WORLD_REGIONS.find((r) => r.id === connId);
                  if (!target || region.id > connId) return null;

                  const fromUnlocked = unlockedRegions.includes(region.id);
                  const toUnlocked = unlockedRegions.includes(target.id);
                  const pathUnlocked = fromUnlocked && toUnlocked;

                  return (
                    <line
                      key={`${region.id}-${connId}`}
                      x1={`${region.position.x}%`}
                      y1={`${region.position.y}%`}
                      x2={`${target.position.x}%`}
                      y2={`${target.position.y}%`}
                      stroke={pathUnlocked ? "#6D5EF8" : "rgba(255,255,255,0.1)"}
                      strokeWidth={pathUnlocked ? "1" : "0.5"}
                      strokeDasharray={pathUnlocked ? "none" : "3 3"}
                    />
                  );
                })
              )}
            </svg>

            {/* Region Location Pins */}
            {WORLD_REGIONS.map((region) => {
              const REGION_BOSS_MAP: Record<string, string> = {
                starting_village: "boss_dummy",
                health_kingdom: "boss_plague",
                forest_of_focus: "boss_hydra",
                arena_of_strength: "boss_colossus",
                library_of_knowledge: "boss_phantom",
                career_mountains: "boss_titan",
                creativity_forest: "boss_muse",
                finance_desert: "boss_wyrm",
                relationship_isles: "boss_diplomat",
                citadel: "boss_mastery"
              };

              const isUnlocked = unlockedRegions.includes(region.id);
              const isSelected = selectedRegion?.id === region.id;
              const isDedicated = activeToggledBossId === REGION_BOSS_MAP[region.id];

              return (
                <button
                  key={region.id}
                  onClick={() => handleRegionClick(region)}
                  style={{ left: `${region.position.x}%`, top: `${region.position.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 z-10 ${
                    isSelected ? "scale-125 z-20" : "hover:scale-110"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border text-base shadow-lg transition-all ${
                    isUnlocked
                      ? isDedicated
                        ? "bg-[#6D5EF8] border-[#F4C542] text-white shadow-[0_0_20px_rgba(244,197,66,0.8)] border-2 animate-pulse"
                        : isSelected
                          ? "bg-[#6D5EF8] border-[#6D5EF8] text-white shadow-[0_0_20px_#6D5EF8]"
                          : "bg-slate-900 border-[#6D5EF8] text-white hover:bg-[#6D5EF8]/30"
                      : "bg-slate-950 border-white/10 text-slate-600"
                  }`}>
                    {isUnlocked ? (isDedicated ? <Target size={18} className="text-[#F4C542] animate-spin" style={{ animationDuration: '6s' }} /> : region.emoji) : <Lock size={16} />}
                  </div>
                  {isDedicated ? (
                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-full bg-slate-950/90 border border-[#F4C542] text-[8px] font-bold font-serif whitespace-nowrap text-[#F4C542] flex items-center gap-1 shadow-[0_0_10px_rgba(244,197,66,0.3)]">
                      <Target size={8} /> CURRENT TARGET
                    </span>
                  ) : (
                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-full bg-slate-950/90 border border-white/10 text-[9px] font-bold font-serif whitespace-nowrap text-white">
                      {region.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </GlassSurface>

        {/* Region Information Sidebar */}
        <div>
          {selectedRegion ? (
            <SpotlightCard className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedRegion.emoji}</span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-white">{selectedRegion.name}</h3>
                  <span className="text-xs text-[#38BDF8] font-bold uppercase tracking-wider">
                    {unlockedRegions.includes(selectedRegion.id) ? "Unlocked Territory" : "Locked Region"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed border-y border-white/10 py-3">
                {selectedRegion.description}
              </p>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Requirements</h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <p>• Unlock Condition: {selectedRegion.unlockCondition.type}</p>
                  {selectedRegion.bossName && <p>• Local Boss: {selectedRegion.bossName}</p>}
                </div>
              </div>

              {/* Action Buttons for Unlocked Regions */}
              {unlockedRegions.includes(selectedRegion.id) && selectedRegion.bossName && (
                <div className="pt-4 border-t border-white/10 space-y-3">
                  {(() => {
                    const REGION_BOSS_MAP: Record<string, string> = {
                      starting_village: "boss_dummy",
                      health_kingdom: "boss_plague",
                      forest_of_focus: "boss_hydra",
                      arena_of_strength: "boss_colossus",
                      library_of_knowledge: "boss_phantom",
                      career_mountains: "boss_titan",
                      creativity_forest: "boss_muse",
                      finance_desert: "boss_wyrm",
                      relationship_isles: "boss_diplomat",
                      citadel: "boss_mastery"
                    };
                    const targetBossId = REGION_BOSS_MAP[selectedRegion.id];

                    return (
                      <>
                        <SpecularButton
                          onClick={() => setDedicatedTargetMutation.mutate({ bossId: targetBossId, navigate: true })}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#E74C3C] to-[#F4C542] text-white py-3 rounded-xl font-serif font-bold text-xs uppercase tracking-wider shadow-lg"
                        >
                          <Swords size={16} /> Fight Boss
                        </SpecularButton>

                        <button
                          onClick={() => setDedicatedTargetMutation.mutate({ bossId: targetBossId, navigate: false })}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition-colors"
                        >
                          <Target size={14} className="text-[#F4C542]" /> Set as Dedicated Target
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </SpotlightCard>
          ) : (
            <GlassSurface className="p-8 text-center flex flex-col items-center justify-center">
              <Compass className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-serif text-white font-bold">Select a Kingdom Region</p>
              <p className="text-xs text-slate-400 mt-1">Click any pin on the atlas to inspect region lore, set dedicated targets, or launch boss battles.</p>
            </GlassSurface>
          )}
        </div>
      </div>
    </motion.div>
  );
}
