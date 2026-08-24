"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAscensionDetailsAction, ascendUserAction } from "@/actions/ascension-actions";
import { soundEngine } from "@/lib/sound-engine";
import { 
  Sparkles, 
  Flame, 
  ShieldAlert, 
  Award, 
  ArrowRight, 
  Check, 
  X, 
  Lock, 
  RotateCcw, 
  TrendingUp, 
  Trophy, 
  Clock, 
  Coins, 
  Swords, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AscensionPage() {
  const queryClient = useQueryClient();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ["ascensionDetails"],
    queryFn: () => getAscensionDetailsAction()
  });

  const ascendMutation = useMutation({
    mutationFn: () => ascendUserAction(),
    onSuccess: (res) => {
      if (res.success) {
        soundEngine.playQuestComplete();
        queryClient.invalidateQueries({ queryKey: ["ascensionDetails"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["character"] });
        setShowConfirmModal(false);
      } else {
        alert(res.error || "Failed to Ascend");
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
      </div>
    );
  }

  const details = response?.success ? response.data : null;
  const currentLevel = details?.currentLevel || 1;
  const canAscend = details?.canAscend ?? false;
  const ascensionCount = details?.ascensionCount || 0;
  const currentDifficultyPercent = details?.currentDifficultyPercent || "100%";
  const nextDifficultyPercent = details?.nextDifficultyPercent || "110%";
  const stats = details?.lifetimeStats || {};

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-24 animate-in fade-in duration-700">
      
      {/* Hero Section: Cinematic Title & Vision */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 border border-amber-500/30 p-10 md:p-16 text-center shadow-[0_0_60px_rgba(245,158,11,0.15)]">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-purple-950/20 to-slate-950 pointer-events-none" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} className="animate-spin-slow" /> ASCENDRA PRESTIGE
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-100 drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            ASCENSION
          </h1>

          <p className="text-lg md:text-xl font-serif italic text-slate-200 max-w-2xl mx-auto leading-relaxed pt-2">
            "Ascension isn't the end of your journey—it's where your better version begins."
          </p>

          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Leave behind your current self, embrace a stronger world, and forge a legacy worthy of eternity.
          </p>
        </div>
      </section>

      {/* Difficulty Preview Card */}
      <section className="rpg-panel rounded-3xl p-8 border border-purple-500/30 bg-slate-900/60 shadow-xl space-y-6">
        <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-purple-400" size={22} /> World Difficulty Evolution
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
          <div className="bg-slate-950/80 border border-white/10 p-6 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Current World</span>
            <span className="text-4xl font-mono font-black text-white">{currentDifficultyPercent}</span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <ArrowRight className="text-amber-400 hidden md:block animate-pulse" size={32} />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono mt-1">+10% World Multiplier</span>
          </div>

          <div className="bg-slate-950/80 border border-amber-500/40 p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block mb-1">After Ascension</span>
            <span className="text-4xl font-mono font-black text-amber-300">{nextDifficultyPercent}</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 text-center italic border-t border-white/10 pt-4">
          "Every Ascension permanently increases the world's difficulty by 10%. Enemies grow stronger, bosses become tougher, XP per level increases, and merchant prices adapt as your power evolves."
        </p>
      </section>

      {/* Before Ascending: What Resets vs What You Keep */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reset Section */}
        <div className="rpg-panel rounded-3xl p-6 border border-rose-500/30 bg-slate-950/60 space-y-4">
          <h3 className="text-base font-serif font-bold text-rose-400 flex items-center gap-2">
            <RotateCcw size={18} /> World Progression Resets
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Character Level resets to 1</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Character XP resets to 0</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Boss HP & Arena progression resets</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Villages & World Region unlocks reset</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Active Campaign quest progression resets</li>
          </ul>
        </div>

        {/* Keep Section */}
        <div className="rpg-panel rounded-3xl p-6 border border-emerald-500/30 bg-slate-950/60 space-y-4">
          <h3 className="text-base font-serif font-bold text-emerald-400 flex items-center gap-2">
            <Trophy size={18} /> Permanent Legacy Retained
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> All Unlocked Achievements & Badges</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Kingdom Chronicles & Lifetime Statistics</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Permanent Ascension Count & Title</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Inventory Items, Gold & Gems</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> +2% Crit Chance per Ascension & +1 Inv Slot every 2 Ascensions</li>
          </ul>
        </div>
      </section>

      {/* Future Self Card */}
      <section className="rpg-panel rounded-3xl p-8 border border-amber-500/30 bg-gradient-to-r from-slate-950 via-purple-950/30 to-slate-950 shadow-2xl space-y-3 text-center">
        <Award size={36} className="text-amber-400 mx-auto animate-pulse" />
        <h3 className="text-2xl font-serif font-bold text-white">Your Better Version Awaits</h3>
        <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
          "Every Ascension is a step toward mastery. The path ahead grows harder, but so does your legacy. Only those willing to leave comfort behind can discover their strongest self."
        </p>
      </section>

      {/* Legacy Statistics Grid */}
      <section className="space-y-4">
        <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
          <Clock size={18} className="text-purple-400" /> Lifetime Legacy Statistics
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
          <div className="bg-slate-950/80 border border-white/10 p-4 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Ascension Count</span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">{ascensionCount}</span>
          </div>
          <div className="bg-slate-950/80 border border-white/10 p-4 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Current Level</span>
            <span className="text-2xl font-black text-purple-300 mt-1 block">{currentLevel}</span>
          </div>
          <div className="bg-slate-950/80 border border-white/10 p-4 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Lifetime XP</span>
            <span className="text-2xl font-black text-[#38BDF8] mt-1 block">{(stats.lifetimeXP || 0).toLocaleString()}</span>
          </div>
          <div className="bg-slate-950/80 border border-white/10 p-4 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Boss Victories</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats.lifetimeBossKills || 0}</span>
          </div>
        </div>
      </section>

      {/* Warning Box & Ascend Action */}
      <section className="space-y-6">
        <div className="bg-amber-950/30 border border-amber-500/40 p-5 rounded-2xl flex items-center gap-4 text-amber-200 text-xs font-semibold">
          <AlertTriangle size={24} className="text-amber-400 shrink-0" />
          <span><strong>Warning:</strong> Ascension cannot be undone. Ensure you are ready to enter New Game+ and embrace a 10% harder world difficulty.</span>
        </div>

        <div className="text-center">
          <button
            disabled={!canAscend || ascendMutation.isPending}
            onClick={() => setShowConfirmModal(true)}
            className={`px-12 py-5 rounded-2xl font-bold uppercase tracking-widest text-base transition-all shadow-2xl ${
              canAscend
                ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.4)] animate-pulse"
                : "bg-slate-900 border border-white/10 text-slate-500 cursor-not-allowed"
            }`}
          >
            {canAscend ? (
              <span className="flex items-center gap-2">
                <Sparkles size={20} /> Ready to Ascend (Enter New Game+)
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock size={18} /> Requires Level 20 to Ascend (Current: Level {currentLevel})
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-950 border border-amber-500/50 rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
            <Flame size={48} className="text-amber-400 mx-auto animate-bounce" />
            <h3 className="text-2xl font-bold font-serif text-white">Begin Ascension?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you certain you wish to Ascend? The world will become <strong className="text-amber-400">10% stronger</strong>. Only your legacy will remain.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-slate-900 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-800">
                Cancel
              </button>
              <button 
                onClick={() => ascendMutation.mutate()} 
                disabled={ascendMutation.isPending}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:opacity-90 shadow-lg"
              >
                {ascendMutation.isPending ? "Ascending..." : "Ascend"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
