"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getQuestsAction, 
  claimQuestRewardAction, 
  markManualQuestCompleteAction,
  getCommunityIntegrityStatsAction
} from "@/actions/quest-actions";
import { 
  Swords, 
  CheckCircle2, 
  Zap, 
  Coins, 
  Target, 
  Award, 
  Sparkles, 
  Lock, 
  Check, 
  ShieldCheck, 
  HeartHandshake,
  HelpCircle
} from "lucide-react";
import { useSession } from "next-auth/react";
import { soundEngine } from "@/lib/sound-engine";
import { motion, AnimatePresence } from "framer-motion";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SpecularButton } from "@/components/ui/specular-button";

export default function QuestsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [confirmModalQuest, setConfirmModalQuest] = useState<any | null>(null);

  const { data: response = { success: false, data: { active: [], completed: [] } }, isLoading } = useQuery({
    queryKey: ["activeQuests"],
    queryFn: () => getQuestsAction(),
  });

  const { data: communityStatsRes } = useQuery({
    queryKey: ["communityIntegrityStats"],
    queryFn: () => getCommunityIntegrityStatsAction()
  });

  const rawActive = response.success && Array.isArray(response.data?.active) ? response.data.active : [];
  const rawCompleted = response.success && Array.isArray(response.data?.completed) ? response.data.completed : [];

  const active = Array.from(
    new Map(
      rawActive.map((q: any) => [`${q.id}-${q.userId || ''}-${q.createdAt || ''}`, q])
    ).values()
  );

  const completed = Array.from(
    new Map(
      rawCompleted.map((q: any) => [`${q.id}-${q.userId || ''}-${q.createdAt || ''}`, q])
    ).values()
  );

  const claimReward = useMutation({
    mutationFn: (progressId: string) => claimQuestRewardAction(progressId),
    onSuccess: (res) => {
      if (res.success) {
        soundEngine.playQuestComplete();
        import("canvas-confetti").then((m) => m.default({ particleCount: 60, spread: 70 }));
        queryClient.invalidateQueries({ queryKey: ["activeQuests"] });
        queryClient.invalidateQueries({ queryKey: ["quests"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["character"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["chronicles"] });
      } else {
        alert(res.error || "Failed to claim reward");
      }
    }
  });

  const markManualComplete = useMutation({
    mutationFn: (progressId: string) => markManualQuestCompleteAction(progressId),
    onSuccess: (res) => {
      if (res.success) {
        soundEngine.playQuestComplete();
        setConfirmModalQuest(null);
        queryClient.invalidateQueries({ queryKey: ["activeQuests"] });
        queryClient.invalidateQueries({ queryKey: ["quests"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["character"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["chronicles"] });
      }
    }
  });

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "WEEKLY": return "bg-purple-500/20 text-purple-300 border border-purple-500/40";
      case "DAILY":
      default:
        return "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40";
    }
  };

  const communityStats = communityStatsRes?.success ? communityStatsRes.data : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 max-w-5xl mx-auto"
    >
      <header className="space-y-2">
        <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-full text-xs font-bold uppercase tracking-widest">
          Hybrid Quest Engine (Auto + Honest Manual)
        </span>
        <h1 className="text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 drop-shadow-md">
          Active Bounties & Quests
        </h1>
        <p className="text-slate-400 text-sm">
          Every quest automatically tracks in-game events. Manual verification is always available for external or real-world progress.
        </p>
      </header>

      {/* Honesty Philosophy Box */}
      <GlassSurface glow="purple" className="p-6 border-purple-500/30 bg-slate-950/80 space-y-3">
        <div className="flex items-center gap-3">
          <HeartHandshake size={24} className="text-amber-400 shrink-0" />
          <div>
            <h2 className="text-lg font-serif font-bold text-white">ASCENDRA Trusts You</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              "The purpose of quests isn't to impress the game—it's to become the person you're striving to be. The strongest progress is the progress you're proud of."
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 border-t border-white/10 pt-2 flex items-center justify-between">
          <span className="italic">
            {communityStats?.hasEnoughData ? communityStats.message : "Community insights will unlock as ASCENDRA grows."}
          </span>
          <span className="font-mono text-purple-300 font-bold">Hybrid Auto + Manual Engine</span>
        </div>
      </GlassSurface>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-4">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-3 font-serif text-sm font-bold border-b-2 transition-all uppercase tracking-wider flex items-center gap-2 ${
            activeTab === "active" 
              ? "border-purple-500 text-white" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Swords size={16} /> Active Quests ({active.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-3 font-serif text-sm font-bold border-b-2 transition-all uppercase tracking-wider flex items-center gap-2 ${
            activeTab === "completed" 
              ? "border-emerald-500 text-white" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CheckCircle2 size={16} /> Completed Archives ({completed.length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
        </div>
      ) : activeTab === "active" ? (
        active.length === 0 ? (
          <GlassSurface glow="purple" className="p-16 text-center flex flex-col items-center justify-center">
            <Target className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-2xl font-black font-serif text-white mb-2">Noticeboard Cleared</h2>
            <p className="text-slate-400 text-sm max-w-md">All active quests completed! Scheduled quests automatically replenish daily.</p>
          </GlassSurface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {active.map((quest: any) => {
              const currentProgress = quest.progress || 0;
              const target = quest.target || 1;
              const percent = Math.min(100, Math.round((currentProgress / target) * 100));
              const isReadyToClaim = currentProgress >= target;

              return (
                <SpotlightCard 
                  key={`${quest.id}-${quest.userId || ''}-${quest.createdAt || ''}`} 
                  className={`p-6 flex flex-col justify-between border ${
                    isReadyToClaim 
                      ? "border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-slate-950/90" 
                      : "border-white/10 bg-slate-950/70"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-xl font-black font-serif text-white">{quest.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold ${getBadgeColor(quest.type)}`}>
                            {quest.type}
                          </span>
                          {isReadyToClaim ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <ShieldCheck size={12} /> Automatically Verified
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-slate-800 text-slate-300 border border-white/10">
                              Auto-Tracking Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-mono">
                          +{quest.xpReward} XP
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
                          +{quest.coinReward} GP
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{quest.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1 mb-6">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-slate-400">Progress</span>
                        <span className={isReadyToClaim ? "text-amber-300" : "text-purple-300"}>{currentProgress} / {target} ({percent}%)</span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isReadyToClaim 
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" 
                              : "bg-gradient-to-r from-purple-600 to-cyan-400"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions: BOTH Claim Rewards AND Manual Completion */}
                  {isReadyToClaim ? (
                    <SpecularButton
                      variant="primary"
                      onClick={() => claimReward.mutate(quest.progressId || quest.id)}
                      disabled={claimReward.isPending}
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold tracking-widest uppercase"
                    >
                      <Sparkles size={16} /> {claimReward.isPending ? "Claiming..." : "Claim Rewards"}
                    </SpecularButton>
                  ) : (
                    <div className="space-y-2">
                      <SpecularButton
                        variant="primary"
                        onClick={() => setConfirmModalQuest(quest)}
                        className="w-full"
                      >
                        <Check size={16} /> ✓ Mark as Completed
                      </SpecularButton>
                      <p className="text-[10px] text-center text-slate-400 italic">
                        "Be true to yourself. The strongest heroes are built through honesty."
                      </p>
                    </div>
                  )}
                </SpotlightCard>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {completed.map((quest: any) => (
            <GlassSurface key={`${quest.id}-${quest.userId || ''}-${quest.createdAt || ''}`} className="p-4 flex items-center justify-between opacity-80 border-emerald-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold font-serif text-white line-through">{quest.title}</h3>
                  <p className="text-xs text-slate-400">Completed quest bounty</p>
                </div>
              </div>
              <span className="text-xs font-mono text-cyan-300 font-bold">+{quest.xpReward} XP</span>
            </GlassSurface>
          ))}
        </div>
      )}

      {/* Honest Manual Confirmation Modal */}
      {confirmModalQuest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-950 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <HelpCircle size={44} className="text-purple-400 mx-auto" />
            <h3 className="text-xl font-bold font-serif text-white">Confirm Objective Completion</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Did you genuinely complete <strong className="text-purple-300">"{confirmModalQuest.title}"</strong> outside the app?
            </p>
            <div className="flex gap-3 pt-3">
              <button 
                onClick={() => setConfirmModalQuest(null)} 
                className="flex-1 py-2.5 bg-slate-900 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={() => markManualComplete.mutate(confirmModalQuest.progressId || confirmModalQuest.id)} 
                disabled={markManualComplete.isPending}
                className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-purple-500 shadow-lg"
              >
                {markManualComplete.isPending ? "Confirming..." : "Yes, I Did"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
