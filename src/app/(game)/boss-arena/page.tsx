"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveBoss, toggleBossChallengeAction } from "@/actions/boss-actions";
import { getDashboardData } from "@/actions/dashboard-actions";
import { getTasksAction, completeTaskAction } from "@/actions/task-actions";
import { Skull, Swords, Shield, HeartPulse, Sparkles, Brain, CheckCircle2, Flame, Award, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { motion, AnimatePresence } from "framer-motion";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SpecularButton } from "@/components/ui/specular-button";

const BOSS_LORE: Record<string, { emoji: string; quote: string; weakness: string; lore: string }> = {
  boss_dummy: {
    emoji: "🎯",
    quote: "Practice makes perfect. Strike true!",
    weakness: "None (Starting training)",
    lore: "A sturdy wooden practice dummy to test your combat readiness."
  },
  boss_plague: {
    emoji: "☣️",
    quote: "A toxic mutant terrorizing the Health Kingdom.",
    weakness: "Health (Workout resists the toxicity)",
    lore: "A toxic mutant representation of unhealthy lifestyle habits."
  },
  boss_hydra: {
    emoji: "🐉",
    quote: "Why do today what you can delay until tomorrow?",
    weakness: "Discipline (Focus shield blocks notifications)",
    lore: "A multi-headed beast growing new distractions for every head cut."
  },
  boss_colossus: {
    emoji: "🤖",
    quote: "Challenge your physical limitations.",
    weakness: "Strength (Raw active force breaks iron)",
    lore: "A giant metal golem testing your strength in the arena."
  },
  boss_phantom: {
    emoji: "👻",
    quote: "Forgotten secrets protect the grand library.",
    weakness: "Knowledge (Deep wisdom overrides self-doubt)",
    lore: "A ghostly librarian protecting ancient forgotten secrets."
  },
  boss_titan: {
    emoji: "💼",
    quote: "You belong to the corporate machine.",
    weakness: "Career (Structured goals rejects career burnout)",
    lore: "A towering figure representing stress and career burnout."
  },
  boss_muse: {
    emoji: "🎨",
    quote: "Disrupting creative flows forever.",
    weakness: "Creativity (Artistic outlets defeat blocks)",
    lore: "A chaotic entity disrupting the creative flow of the forest."
  },
  boss_wyrm: {
    emoji: "💰",
    quote: "Your coins belong in my hoard.",
    weakness: "Finance (Frugality rejects impulse spending)",
    lore: "A massive dragon hoarded with coins, testing financial wisdom."
  },
  boss_diplomat: {
    emoji: "🤝",
    quote: "Isolation breeds absolute doubt.",
    weakness: "Relationships (True connections override isolation)",
    lore: "A mysterious figure trying to isolate the islands."
  },
  boss_mastery: {
    emoji: "⏳",
    quote: "Your bad habits will always bind you.",
    weakness: "Focus (Legendary focus overrides limitations)",
    lore: "The ultimate representation of your bad habits and past limitations."
  }
};

export default function BossArenaPage() {
   const searchParams = useSearchParams();
  const router = useRouter();
  const bossQuery = searchParams.get("boss");
  const queryClient = useQueryClient();
  const [isAttacking, setIsAttacking] = useState(false);
  const [damageText, setDamageText] = useState<{ id: number; dmg: number; marginLeft: number }[]>([]);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);

  const fleeMutation = useMutation({
    mutationFn: async () => {
      const { fleeBossAction } = await import("@/actions/boss-actions");
      return await fleeBossAction();
    },
    onSuccess: (data: any) => {
      alert(`Fled successfully from ${data.bossName}! Lost ${data.xpLoss} XP and ${data.coinLoss} Coins.`);
      queryClient.invalidateQueries({ queryKey: ["bossArena"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      router.push("/life-map");
    },
    onError: (err: any) => {
      alert(`Failed to flee: ${err.message}`);
    }
  });

  const handleFleeClick = () => {
    const ok = window.confirm("Running away has consequences. You will lose XP and Coins. Continue?");
    if (ok) {
      fleeMutation.mutate();
    }
  };
  
  const { profile } = useCharacterStore();
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const lastRegenStr = (dashboard?.profile as any)?.buildings?.lastRegeneratedAt;
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!lastRegenStr) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const lastRegen = new Date(lastRegenStr);
      const now = new Date();
      const diffMs = now.getTime() - lastRegen.getTime();
      const cooldownMs = 24 * 60 * 60 * 1000;

      if (diffMs >= cooldownMs) {
        setTimeLeft("");
      } else {
        const remainingMs = cooldownMs - diffMs;
        const hours = Math.floor(remainingMs / (60 * 60 * 1000));
        const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
        const pad = (n: number) => n.toString().padStart(2, "0");
        setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastRegenStr]);

  const regenerateTasksMutation = useMutation({
    mutationFn: async (bossId: string) => {
      const { regenerateBossTasksAction } = await import("@/actions/boss-actions");
      return regenerateBossTasksAction(bossId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["bossArena"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      alert(`Failed to regenerate tasks: ${err.message}`);
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ["bossArena", bossQuery],
    queryFn: () => getActiveBoss(bossQuery),
    enabled: !!dashboard?.profile?.userId || !!dashboard?.profile?.id,
  });

  const { data: tasksRes, isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasksAction()
  });

  const generateTasksMutation = useMutation({
    mutationFn: async (bossId: string) => {
      const { generateBossTasksAction } = await import("@/actions/boss-actions");
      return generateBossTasksAction(bossId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["bossArena"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      alert(`Failed to generate tasks: ${err.message}. Retrying...`);
    }
  });

  const solveTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskText, bossMaxHp, difficulty }: { taskId: string; taskText: string; bossMaxHp: number; difficulty: string }) => {
      let fixedDmg = 20;
      if (difficulty === "MEDIUM") fixedDmg = 35;
      else if (difficulty === "HARD") fixedDmg = 50;

      const { completeBossTaskAction } = await import("@/actions/boss-actions");
      const res = await completeBossTaskAction(taskText, boss?.id || "", difficulty as "EASY" | "MEDIUM" | "HARD");
      return { res, dmg: fixedDmg };
    },
    onSuccess: (data, variables) => {
      setCompletedTaskId(variables.taskId);
      setIsAttacking(true);
      import("@/lib/sound-engine").then(m => m.soundEngine.playQuestComplete());
      setTimeout(() => setIsAttacking(false), 500);

      const id = Date.now();
      setDamageText((prev) => [...prev, { id, dmg: data.dmg, marginLeft: (id % 40) - 20 }]);
      setTimeout(() => setDamageText((prev) => prev.filter((d) => d.id !== id)), 1000);

      queryClient.invalidateQueries({ queryKey: ["bossArena"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setTimeout(() => setCompletedTaskId(null), 600);
    }
  });

  if (isLoading || isTasksLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#E74C3C] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(231,76,60,0.5)]" />
      </div>
    );
  }

  const boss = data?.boss;
  const bossProgress = data?.bossProgress;

  if (!boss) {
    return (
      <GlassSurface glow="crimson" className="max-w-4xl mx-auto p-16 text-center flex flex-col items-center justify-center">
        <Skull className="w-20 h-20 text-slate-600 mb-6" />
        <h2 className="text-3xl font-black font-serif text-white mb-2">The Colosseum is Peaceful</h2>
        <p className="text-slate-400">All current realm bosses have been vanquished. Prepare for future kingdom challenges!</p>
      </GlassSurface>
    );
  }

  const currentHp = bossProgress?.bossHP ?? boss.hp;
  const hpPercent = Math.max(0, (currentHp / boss.maxHp) * 100);
  const isDefeated = currentHp <= 0;

  const loreMeta = BOSS_LORE[boss.id] || {
    emoji: "🐉",
    quote: "You stand no chance against the ultimate distraction.",
    weakness: "None (Raw willpower required)",
    lore: boss.description || "A powerful manifestation of a negative habit."
  };

  const activeTasks: any[] = [];
  if (bossProgress) {
    const parseTasks = (field: string | null, priority: "EASY" | "MEDIUM" | "HARD") => {
      if (!field) return [];
      try {
        if (field.startsWith("[")) {
          const arr = JSON.parse(field);
          return arr.map((title: string, index: number) => ({
            id: `${priority}_${index}`,
            title,
            priority,
            category: "Self-Improvement"
          }));
        }
      } catch (e) {}
      return [{ id: priority, title: field, priority, category: "Self-Improvement" }];
    };

    activeTasks.push(...parseTasks(bossProgress.activeEasyTask, "EASY"));
    activeTasks.push(...parseTasks(bossProgress.activeMediumTask, "MEDIUM"));
    activeTasks.push(...parseTasks(bossProgress.activeHardTask, "HARD"));
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 max-w-5xl mx-auto"
    >
      <header className="text-center space-y-2">
        <span className="px-3 py-1 bg-[#E74C3C]/20 border border-[#E74C3C]/40 text-[#E74C3C] rounded-full text-xs font-bold uppercase tracking-widest">
          The Colosseum
        </span>
        <h1 className="text-4xl md:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E74C3C] via-orange-400 to-[#F4C542] drop-shadow-md">
          Boss Encounter Arena
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Execute combat bounties to strike down boss manifestations and earn rare kingdom rewards.
        </p>
      </header>

      {/* Main Boss Encounter Glass Stage */}
      <GlassSurface glow="crimson" className="p-8 relative overflow-hidden">
        <div className="flex flex-col items-center relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-black font-serif text-white">{boss.name}</h2>
          <p className="text-xs text-[#E74C3C] font-bold uppercase tracking-widest mt-1">Colosseum Challenger</p>

          <div className="my-6 bg-slate-950/80 border border-white/10 p-4 rounded-2xl max-w-md italic text-slate-200 text-sm">
            &ldquo;{loreMeta.quote}&rdquo;
          </div>

          {/* Glowing Boss Health Bar */}
          <div className="w-full max-w-xl space-y-2 mb-8">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[#E74C3C]">
              <span className="flex items-center gap-1.5"><HeartPulse size={16} /> Boss Vitality</span>
              <span>{currentHp} / {boss.maxHp} HP</span>
            </div>
            <div className="h-6 bg-slate-950 rounded-full overflow-hidden border border-[#E74C3C]/40 p-[2px] shadow-inner relative">
              <div 
                className="h-full bg-gradient-to-r from-[#E74C3C] via-orange-500 to-[#F4C542] rounded-full shadow-[0_0_20px_rgba(231,76,60,0.8)] transition-all duration-500"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Boss Sprite Container with Damage Text Overlay */}
          <div className="relative mb-8">
            {damageText.map((dt) => (
              <div 
                key={dt.id} 
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-5xl font-black text-[#E74C3C] drop-shadow-[0_0_20px_rgba(231,76,60,1)] animate-bounce z-50 font-mono"
                style={{ marginLeft: `${dt.marginLeft}px` }}
              >
                -{dt.dmg}
              </div>
            ))}
            
            <div className={`w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-[#E74C3C]/30 bg-slate-950/90 flex items-center justify-center shadow-[0_0_50px_rgba(231,76,60,0.3)] transition-all duration-150 ${isAttacking ? 'scale-90 border-[#E74C3C] bg-[#E74C3C]/20' : ''} ${isDefeated ? 'grayscale opacity-40' : ''}`}>
               <span className="text-8xl md:text-9xl select-none filter drop-shadow-[0_0_20px_rgba(231,76,60,0.6)]">
                 {loreMeta.emoji}
               </span>
            </div>
          </div>

          {/* Active Combat Tasks List */}
          <div className="w-full max-w-2xl space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#E74C3C] uppercase tracking-widest font-serif flex items-center gap-2">
                <Swords size={16} /> Combat Bounties
              </h3>
              {!isDefeated && (
                <div className="flex items-center gap-2">
                  {activeTasks.length > 0 && (
                    <button
                      type="button"
                      disabled={regenerateTasksMutation.isPending || !!timeLeft}
                      onClick={() => regenerateTasksMutation.mutate(boss.id)}
                      className="text-xs px-3 py-1.5 rounded-xl border border-[#E74C3C]/40 bg-[#E74C3C]/10 text-[#E74C3C] hover:bg-[#E74C3C] hover:text-white font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                    >
                      <RefreshCw size={12} className="inline mr-1" /> {timeLeft ? `Cooldown (${timeLeft})` : "Regenerate Bounties"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={fleeMutation.isPending}
                    onClick={handleFleeClick}
                    className="text-xs px-3 py-1.5 rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                  >
                    🏃 {fleeMutation.isPending ? "Fleeing..." : "Flee Battle"}
                  </button>
                </div>
              )}
            </div>

            {activeTasks.length === 0 && !isDefeated ? (
              <div className="p-8 bg-slate-950/60 rounded-2xl border border-white/10 text-center">
                <p className="text-sm text-slate-300 mb-4">No active combat bounties generated for this boss encounter.</p>
                <SpecularButton
                  variant="primary"
                  onClick={() => generateTasksMutation.mutate(boss.id)}
                  disabled={generateTasksMutation.isPending}
                >
                  <Swords size={16} /> {generateTasksMutation.isPending ? "Generating..." : "Generate Boss Combat Bounties"}
                </SpecularButton>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTasks.map((task: any) => (
                  <SpotlightCard key={task.id} className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold font-serif text-white">{task.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Priority: {task.priority} • Category: {task.category}</p>
                    </div>
                    <SpecularButton
                      variant="danger"
                      size="sm"
                      onClick={() => solveTaskMutation.mutate({ taskId: task.id, taskText: task.title, bossMaxHp: boss.maxHp, difficulty: task.priority })}
                      disabled={solveTaskMutation.isPending && completedTaskId === task.id}
                    >
                      <Swords size={14} /> Strike Boss
                    </SpecularButton>
                  </SpotlightCard>
                ))}
              </div>
            )}
          </div>
        </div>
      </GlassSurface>
    </motion.div>
  );
}
