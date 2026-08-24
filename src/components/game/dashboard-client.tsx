"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboardData } from "@/actions/dashboard-actions";
import { completeQuestAction } from "@/actions/quest-actions";
import { claimDailyRationAction } from "@/actions/character-actions";
import {
  CloudRain,
  Sun,
  Wind,
  Swords,
  Map as MapIcon,
  Sparkles,
  Gift,
  AlertTriangle,
  ChevronRight,
  Shield,
  Coffee,
  Coins,
  Scroll,
  Crown,
  Flame,
  User,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SpecularButton } from "@/components/ui/specular-button";

interface DashboardClientProps {
  initialData: any;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    initialData,
    staleTime: 30_000,
  });

  const [timeLeft, setTimeLeft] = useState<string>("");
  const [completedQuestBreakdown, setCompletedQuestBreakdown] = useState<any>(null);

  const claimRationMutation = useMutation({
    mutationFn: () => claimDailyRationAction(),
    onSuccess: (res: any) => {
      if (res.success) {
        import("@/lib/sound-engine").then(m => m.soundEngine.playLevelUp());
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        if (res.awardRes) {
          setCompletedQuestBreakdown({
            transactionId: `tx_ration_${Date.now()}`,
            source: "Daily Ration",
            baseXp: res.xpReward,
            baseCoins: res.goldReward,
            skillXpBonus: 0,
            skillCoinBonus: 0,
            ascensionXpBonus: 0,
            ascensionCoinBonus: 0,
            finalXp: res.xpReward,
            finalCoins: res.goldReward,
            timestamp: Date.now()
          });
        } else {
          alert(`Daily Ration Claimed! Earned +${res.xpReward} XP and +${res.goldReward} Gold.`);
        }
      } else {
        alert(res.error || "Failed to claim daily ration.");
      }
    }
  });

  const completeQuestMutation = useMutation({
    mutationFn: (questId: string) => completeQuestAction(questId),
    onSuccess: (res: any, questId) => {
      if (res?.success || res?.alreadyCompleted) {
        import("@/lib/sound-engine").then(m => m.soundEngine.playQuestComplete());
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["quests"] });
        queryClient.invalidateQueries({ queryKey: ["activeQuests"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["character"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["chronicles"] });
        queryClient.invalidateQueries({ queryKey: ["streaks"] });
        
        if (res?.breakdown) {
          setCompletedQuestBreakdown(res.breakdown);
        }

        import("@/lib/game-event-bus").then((m) => {
          m.dispatchGameEvent("QUEST_COMPLETED", { questId, userId: profile?.userId || "" });
        });
      } else {
        alert(res?.error || "Failed to complete bounty.");
      }
    }
  });

  const profile = data?.profile;
  const rawQuestsList = Array.isArray(data?.quests) ? data.quests : [];
  const quests = rawQuestsList.filter((q: any) => q.status !== "COMPLETED");
  const uniqueQuests = Array.from(
    new Map(
      quests.map((q: any) => [`${q.id}-${q.userId || ''}-${q.createdAt || ''}`, q])
    ).values()
  );
  const dailyRewardClaimed = !!data?.dailyRewardClaimed;

  useEffect(() => {
    if (!dailyRewardClaimed || !data?.nextDailyRationClaimAt) {
      setTimeLeft("");
      return;
    }

    const targetTime = new Date(data.nextDailyRationClaimAt).getTime();

    const updateTimer = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft("");
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dailyRewardClaimed, data?.nextDailyRationClaimAt, queryClient]);

  const weatherTypes = [{ icon: Sun, label: "Clear Skies", color: "text-amber-400" }, { icon: CloudRain, label: "Light Rain", color: "text-sky-400" }, { icon: Wind, label: "Brisk Winds", color: "text-emerald-400" }];
  const dayIndex = typeof data?.dayIndex === "number" ? data.dayIndex : 0;
  const todayWeather = weatherTypes[dayIndex % weatherTypes.length];

  const npcDialogues = [
    "The blacksmith is forging something legendary today.",
    "Bounties are double value on the Guild Noticeboard.",
    "A rare traveling merchant has arrived in the Marketplace."
  ];
  const todayDialogue = npcDialogues[dayIndex % npcDialogues.length];

  const levelProgress = data?.levelProgress || { currentLevel: profile?.level || 1, xpIntoLevel: 0, xpRequiredForNextLevel: 100, percentage: 0 };
  const strokeDashoffset = typeof data?.strokeDashoffset === "number" ? data.strokeDashoffset : 251.2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="space-y-8 pb-12 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#6D5EF8]/20 border border-[#6D5EF8]/40 text-[#6D5EF8] rounded-full text-xs font-bold uppercase tracking-widest">
              Adventurer's Hall
            </span>
            <span className="text-xs text-slate-400 font-serif">Realm Location</span>
          </div>
          <h1 className="text-4xl font-black font-serif tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[#6D5EF8] drop-shadow-md mt-2">
            The Tavern & Guild Command
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Rest, manage daily bounties, inspect your hero stats, and launch your next quest.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg">
          <todayWeather.icon size={20} className={todayWeather.color} />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Atmosphere</span>
            <span className="text-xs font-bold font-serif text-white tracking-wider uppercase">{todayWeather.label}</span>
          </div>
        </div>
      </header>

      {/* Hero Character Card Spotlight */}
      <GlassSurface glow="purple" className="p-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Animated XP Ring Frame */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" className="text-slate-800" fill="transparent" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-[#38BDF8] transition-all duration-1000 ease-out"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <User className="w-7 h-7 text-[#6D5EF8]" />
                <span className="text-xs font-bold font-mono text-[#38BDF8]">Lvl {levelProgress.currentLevel}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black font-serif text-white">{profile?.name || "Hero Adventurer"}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F4C542]/20 border border-[#F4C542]/40 text-[#F4C542] text-[10px] font-bold uppercase tracking-wider">
                  {profile?.class || "Novice"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Level {levelProgress.currentLevel} Adventurer</p>

              {/* Stat Chips */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#38BDF8]">
                  <Sparkles size={14} /> {profile?.xp || 0} XP
                </span>
                <span className="flex items-center gap-1.5 text-[#F4C542]">
                  <Coins size={14} /> {data?.moneyJar?.coins || 0} GP
                </span>
                <span className="flex items-center gap-1.5 text-[#E74C3C]">
                  <Flame size={14} /> Streak: {((data?.streaks || []).find((s: any) => s.name === "Daily Activity") || data?.streaks?.[0])?.current || 0} days
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {dailyRewardClaimed ? (
              <SpecularButton
                variant="secondary"
                disabled
                className="opacity-70 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Coffee size={16} /> Daily Ration Claimed {timeLeft && `(${timeLeft})`}
              </SpecularButton>
            ) : (
              <SpecularButton
                variant="gold"
                onClick={() => claimRationMutation.mutate()}
                disabled={claimRationMutation.isPending}
                className="flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,197,66,0.3)] animate-pulse"
              >
                <Gift size={16} /> Claim Daily Ration (+10 XP, +20 GP)
              </SpecularButton>
            )}

            <Link href="/boss-arena">
              <SpecularButton variant="primary" className="w-full sm:w-auto flex items-center justify-center gap-2">
                <Swords size={16} /> Boss Arena
              </SpecularButton>
            </Link>
          </div>
        </div>
      </GlassSurface>

      {/* Guild Notice Board Dialogue */}
      <SpotlightCard className="p-4 flex items-center gap-4 bg-slate-900/60 border border-white/10">
        <div className="w-10 h-10 rounded-2xl bg-[#6D5EF8]/20 border border-[#6D5EF8]/40 flex items-center justify-center shrink-0">
          <Coffee size={20} className="text-[#6D5EF8]" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-mono text-[#38BDF8] uppercase tracking-wider block">Tavern Gossip</span>
          <p className="text-xs text-slate-300 font-serif italic mt-0.5">"{todayDialogue}"</p>
        </div>
      </SpotlightCard>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Bounties Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              <Scroll size={20} className="text-[#6D5EF8]" /> Active Bounties ({uniqueQuests.length})
            </h3>
            <Link href="/quests" className="text-xs text-[#38BDF8] hover:underline font-semibold flex items-center gap-1">
              View All Quests <ChevronRight size={14} />
            </Link>
          </div>

          {uniqueQuests.length === 0 ? (
            <GlassSurface className="p-8 text-center flex flex-col items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-sm font-serif font-bold text-white">No Active Bounties</p>
              <p className="text-xs text-slate-400 mt-1">Visit the Quests board to accept new challenges.</p>
            </GlassSurface>
          ) : (
            <div className="space-y-3">
              {uniqueQuests.slice(0, 3).map((quest: any) => {
                const displayXpVal = Math.min(99, quest.xpReward || 0);
                if (process.env.NODE_ENV !== "production" && quest.xpReward > 100) {
                  console.error(`[RewardPolicy Violation] Quest "${quest.title}" returned ${quest.xpReward} XP. Clamping to ${displayXpVal} XP.`);
                }
                return (
                  <SpotlightCard key={quest.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-[#6D5EF8]/20 text-[#6D5EF8] border border-[#6D5EF8]/30 text-[9px] font-bold uppercase">
                          {quest.type}
                        </span>
                        <h4 className="text-sm font-bold font-serif text-white">{quest.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{quest.description}</p>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-[#F4C542] pt-1">
                        <span>+{displayXpVal} XP</span>
                        <span>+{quest.coinReward} GP</span>
                      </div>
                    </div>

                    <SpecularButton
                      variant="primary"
                      size="sm"
                      onClick={() => completeQuestMutation.mutate(quest.progressId || quest.id)}
                      disabled={completeQuestMutation.isPending}
                      className="shrink-0"
                    >
                      Complete
                    </SpecularButton>
                  </SpotlightCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Guild Quick Navigation Sidebar */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold font-serif text-white flex items-center gap-2">
            <Crown size={20} className="text-[#F4C542]" /> Guild Operations
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <Link href="/life-map">
              <SpotlightCard className="p-4 flex items-center gap-3 hover:border-[#6D5EF8] transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MapIcon size={20} className="text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-serif text-white">World Map</h4>
                  <p className="text-xs text-slate-400">Explore realm regions & sanctuary</p>
                </div>
              </SpotlightCard>
            </Link>

            <Link href="/brain-lab">
              <SpotlightCard className="p-4 flex items-center gap-3 hover:border-[#38BDF8] transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} className="text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-serif text-white">Brain Lab</h4>
                  <p className="text-xs text-slate-400">Train focus, memory & agility</p>
                </div>
              </SpotlightCard>
            </Link>

            <Link href="/urge-battle">
              <SpotlightCard className="p-4 flex items-center gap-3 hover:border-[#F4C542] transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Shield size={20} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-serif text-white">Resilience Center</h4>
                  <p className="text-xs text-slate-400">Overcome distractions & track urge victory</p>
                </div>
              </SpotlightCard>
            </Link>
          </div>
        </div>
      </div>

      {completedQuestBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in">
          <SpotlightCard className="w-full max-w-md p-6 bg-slate-900/90 border border-amber-500/30 shadow-[0_0_50px_rgba(244,197,66,0.2)] rounded-3xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-white mb-1">Quest Complete</h3>
              <p className="text-[10px] text-slate-400 font-mono mb-6">Transaction ID: {completedQuestBreakdown.transactionId}</p>

              <div className="w-full space-y-4 text-left">
                {/* Base Reward */}
                <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Base Reward</h4>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-[#38BDF8]">+{completedQuestBreakdown.baseXp} XP</span>
                    <span className="text-[#F4C542]">+{completedQuestBreakdown.baseCoins} GP</span>
                  </div>
                </div>

                {/* Active Skill Bonuses */}
                {(completedQuestBreakdown.skillXpBonus > 0 || completedQuestBreakdown.skillCoinBonus > 0) && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Active Skill Bonuses</h4>
                    <div className="space-y-1 text-xs text-slate-300">
                      {completedQuestBreakdown.skillXpBonus > 0 && (
                        <div className="flex justify-between">
                          <span>Skill Tree Mastery</span>
                          <span className="text-[#38BDF8]">+{completedQuestBreakdown.skillXpBonus} XP</span>
                        </div>
                      )}
                      {completedQuestBreakdown.skillCoinBonus > 0 && (
                        <div className="flex justify-between">
                          <span>Skill Tree Economy</span>
                          <span className="text-[#F4C542]">+{completedQuestBreakdown.skillCoinBonus} GP</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Other Bonuses */}
                {(completedQuestBreakdown.ascensionXpBonus > 0 || completedQuestBreakdown.ascensionCoinBonus > 0) && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Other Bonuses</h4>
                    <div className="space-y-1 text-xs text-slate-300">
                      {completedQuestBreakdown.ascensionXpBonus > 0 && (
                        <div className="flex justify-between">
                          <span>Ascension Cycle</span>
                          <span className="text-[#38BDF8]">+{completedQuestBreakdown.ascensionXpBonus} XP</span>
                        </div>
                      )}
                      {completedQuestBreakdown.ascensionCoinBonus > 0 && (
                        <div className="flex justify-between">
                          <span>Ascension Cycle</span>
                          <span className="text-[#F4C542]">+{completedQuestBreakdown.ascensionCoinBonus} GP</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback if no modifiers */}
                {!(completedQuestBreakdown.skillXpBonus > 0 || completedQuestBreakdown.skillCoinBonus > 0 || completedQuestBreakdown.ascensionXpBonus > 0 || completedQuestBreakdown.ascensionCoinBonus > 0) && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 text-center text-xs text-slate-400 italic">
                    No active reward modifiers.
                  </div>
                )}

                {/* Final Award */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/25">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">Final Award</h4>
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span className="text-[#38BDF8]">+{completedQuestBreakdown.finalXp} XP</span>
                    <span className="text-[#F4C542]">+{completedQuestBreakdown.finalCoins} GP</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between w-full mt-6 text-[9px] text-slate-500 font-mono">
                <span>{new Date(completedQuestBreakdown.timestamp).toLocaleDateString()}</span>
                <span>{new Date(completedQuestBreakdown.timestamp).toLocaleTimeString()}</span>
              </div>

              <SpecularButton
                variant="gold"
                onClick={() => setCompletedQuestBreakdown(null)}
                className="mt-6 w-full py-2 rounded-2xl font-serif text-xs"
              >
                Collect Rewards
              </SpecularButton>
            </div>
          </SpotlightCard>
        </div>
      )}
    </motion.div>
  );
}
