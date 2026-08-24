"use client";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { Brain, Zap, Calculator, Compass, Sparkles, Activity, ShieldCheck, Flame, Scroll, Crosshair, ZapOff, Clock } from "lucide-react";
import { FocusMatrix } from "@/components/brain-lab/games/FocusMatrix";
import { NBackChallenge } from "@/components/brain-lab/games/NBackChallenge";
import { SpeedMathDuel } from "@/components/brain-lab/games/SpeedMathDuel";
import { PatternForge } from "@/components/brain-lab/games/PatternForge";
import { MentalRotation } from "@/components/brain-lab/games/MentalRotation";
import { ReflexSprint } from "@/components/brain-lab/games/ReflexSprint";
import { CognitiveSwitch } from "@/components/brain-lab/games/CognitiveSwitch";
import { LogicGrid } from "@/components/brain-lab/games/LogicGrid";
import { SequenceRecall } from "@/components/brain-lab/games/SequenceRecall";
import { MultiTaskArena } from "@/components/brain-lab/games/MultiTaskArena";
import { getBrainLevelProgress } from "@/lib/brain-progression-engine";

const MINI_GAMES = [
  { id: "focus-matrix", name: "Focus Matrix", domain: "Working Memory & Attention", icon: Brain, color: "text-cyan-400" },
  { id: "n-back", name: "N-Back Challenge", domain: "Memory Updating", icon: Zap, color: "text-amber-400" },
  { id: "speed-math", name: "Speed Math Duel", domain: "Processing Speed", icon: Calculator, color: "text-indigo-400" },
  { id: "pattern-forge", name: "Pattern Forge", domain: "Abstract Reasoning", icon: Compass, color: "text-emerald-400" },
  { id: "mental-rotation", name: "Mental Rotation", domain: "Spatial Visualization", icon: Activity, color: "text-purple-400" },
  { id: "reflex-sprint", name: "Reflex Sprint", domain: "Response Inhibition", icon: Flame, color: "text-rose-400" },
  { id: "cognitive-switch", name: "Cognitive Switch", domain: "Task Switching", icon: Sparkles, color: "text-sky-400" },
  { id: "logic-grid", name: "Logic Grid", domain: "Deduction", icon: ShieldCheck, color: "text-teal-400" },
  { id: "sequence-recall", name: "Sequence Recall", domain: "Short-Term Memory", icon: Scroll, color: "text-emerald-300" },
  { id: "multi-task", name: "Multi-Task Arena", domain: "Divided Attention", icon: Crosshair, color: "text-cyan-300" },
];

import { getBrainLabData } from "@/actions/brain-actions";

export default function BrainLabPage() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [energyStatus, setEnergyStatus] = useState({ currentEnergy: 10, timeToNextSec: 0 });
  const [energyError, setEnergyError] = useState<string | null>(null);

  const { brainXp, brainLevel, brainRank, brainEnergy, maxBrainEnergy, personalBests, syncEnergy, consumeEnergy, setBrainProfile } = useBrainStore();

  const progress = getBrainLevelProgress(brainXp);

  // Fetch canonical DB profile on mount
  useEffect(() => {
    getBrainLabData().then((profile) => {
      if (profile) setBrainProfile(profile);
    }).catch(console.error);
  }, [setBrainProfile]);

  // Real-time energy sync timer
  useEffect(() => {
    const update = () => {
      const status = syncEnergy();
      setEnergyStatus(status);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [syncEnergy]);

  const handleStartGame = async (gameId: string) => {
    setEnergyError(null);
    const { consumeBrainEnergyAction } = await import("@/actions/brain-actions");
    const res = await consumeBrainEnergyAction();
    if (!res.success) {
      setEnergyError("NO BRAIN ENERGY! Wait for energy to regenerate (+1 every 15m).");
      return;
    }
    if (res.profile) {
      setBrainProfile(res.profile);
    }
    setActiveGameId(gameId);
  };

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-cyan-400 animate-pulse" />
            <h1 className="text-3xl font-black tracking-tight text-white">Brain Evolution Lab</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Scientifically Inspired Cognitive Skill Training & Motivation Platform</p>
        </div>

        {/* Energy & Stats Meter */}
        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between gap-3">
              <span>Brain Level & Rank</span>
              <span className="text-cyan-400 font-mono">{progress.xpIntoCurrentLevel} / {progress.xpRequiredForNext} XP</span>
            </div>
            <div className="text-sm font-bold text-cyan-300">Lvl {progress.currentLevel} • {progress.rank}</div>
            <div className="h-1.5 w-44 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/20 mt-1">
              <div className="h-full bg-cyan-400 shadow-[0_0_8px_#38BDF8] transition-all duration-300" style={{ width: `${progress.percentage}%` }} />
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              Brain Energy {energyStatus.timeToNextSec > 0 && <Clock className="w-3 h-3 text-amber-400 animate-spin-slow" />}
            </div>
            <div className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span>{brainEnergy} / {maxBrainEnergy}⚡</span>
              {energyStatus.timeToNextSec > 0 && brainEnergy < maxBrainEnergy && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Next in {formatCountdown(energyStatus.timeToNextSec)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Energy Depleted Notice */}
      {energyError && (
        <div className="bg-rose-950/60 border border-rose-800 p-4 rounded-xl text-rose-200 text-xs font-bold flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <ZapOff className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{energyError}</span>
          </div>
          {energyStatus.timeToNextSec > 0 && (
            <span className="font-mono bg-rose-900 px-3 py-1 rounded-lg border border-rose-700 text-amber-300">
              Next Energy in {formatCountdown(energyStatus.timeToNextSec)}
            </span>
          )}
        </div>
      )}

      {/* Purpose Section / Disclaimer */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          <strong>Notice:</strong> The Brain Lab is a collection of cognitive training games designed to challenge attention, memory, reasoning, flexibility, and processing speed. Regular practice can help you build consistent mental habits and track your improvement over time. Scores reflect performance within the game and are intended as motivational feedback rather than measures of intelligence or guarantees of real-world cognitive improvement.
        </p>
      </div>

      {/* Active Game Modal / Container */}
      {activeGameId && (
        <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-6 relative shadow-2xl backdrop-blur-lg">
          <button
            onClick={() => setActiveGameId(null)}
            className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 transition"
          >
            Close Game
          </button>
          {activeGameId === "focus-matrix" && <FocusMatrix />}
          {activeGameId === "n-back" && <NBackChallenge />}
          {activeGameId === "speed-math" && <SpeedMathDuel />}
          {activeGameId === "pattern-forge" && <PatternForge />}
          {activeGameId === "mental-rotation" && <MentalRotation />}
          {activeGameId === "reflex-sprint" && <ReflexSprint />}
          {activeGameId === "cognitive-switch" && <CognitiveSwitch />}
          {activeGameId === "logic-grid" && <LogicGrid />}
          {activeGameId === "sequence-recall" && <SequenceRecall />}
          {activeGameId === "multi-task" && <MultiTaskArena />}
        </div>
      )}

      {/* Mini Game Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MINI_GAMES.map((game) => {
          const Icon = game.icon;
          const pb = personalBests[game.id] || 0;

          return (
            <div
              key={game.id}
              onClick={() => handleStartGame(game.id)}
              className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 p-5 rounded-2xl cursor-pointer transition transform hover:-translate-y-1 group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-7 h-7 ${game.color} group-hover:scale-110 transition`} />
                <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                  PB: {pb}
                </span>
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{game.name}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{game.domain}</p>
              
              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-amber-400 font-bold">
                <span>Cost: 1 Energy⚡</span>
                <span className="group-hover:translate-x-1 transition text-cyan-400">Play →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
