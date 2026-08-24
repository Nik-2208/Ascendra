"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Brain, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";

interface FocusMatrixProps {
  userId?: string;
  onClose?: () => void;
}

export function FocusMatrix({ userId = "demo-user", onClose }: FocusMatrixProps) {
  const [gridSize, setGridSize] = useState(3);
  const [targetCount, setTargetCount] = useState(3);
  const [targets, setTargets] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [phase, setPhase] = useState<"memorize" | "recall" | "result">("memorize");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const startRound = () => {
    const totalTiles = gridSize * gridSize;
    const newTargets: number[] = [];
    while (newTargets.length < targetCount) {
      const randomIdx = Math.floor(Math.random() * totalTiles);
      if (!newTargets.includes(randomIdx)) {
        newTargets.push(randomIdx);
      }
    }
    setTargets(newTargets);
    setSelected([]);
    setPhase("memorize");
    setFeedback(null);

    // Hide targets after 1.8s
    setTimeout(() => {
      setPhase("recall");
    }, 1800);
  };

  useEffect(() => {
    startRound();
  }, [round]);

  const handleTileClick = (index: number) => {
    if (phase !== "recall") return;
    if (selected.includes(index)) return;

    const newSelected = [...selected, index];
    setSelected(newSelected);

    if (newSelected.length === targetCount) {
      // Check correctness
      const correct = newSelected.every((idx) => targets.includes(idx));
      if (correct) {
        const roundPoints = targetCount * 100;
        const newTotalScore = score + roundPoints;
        setScore(newTotalScore);
        setFeedback("PERFECT RECALL! + " + roundPoints);

        // Progression
        if (targetCount < 12) {
          setTargetCount((prev) => prev + 1);
          if (round >= 3 && gridSize < 4) setGridSize(4);
          if (round >= 6 && gridSize < 5) setGridSize(5);
        }

        setTimeout(() => setRound((r) => r + 1), 1200);
      } else {
        setFeedback("INCORRECT PATTERN");
        setPhase("result");
        const brainXp = calculateGameBrainXp(score, "medium");
        // synced via DB submitBrainGameResult("focus-matrix", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
        submitBrainGameResult(userId, "focus-matrix", score, { domain: "Attention & Working Memory" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h2 className="font-bold text-lg text-cyan-100">Focus Matrix</h2>
        </div>
        <div className="text-sm font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
          Score: {score}
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4 text-center">
        {phase === "memorize" ? "Memorize the highlighted cyan tiles!" : phase === "recall" ? "Tap the tiles you memorized!" : "Round Finished!"}
      </p>

      {/* Grid */}
      <div
        className="grid gap-3 my-6 justify-center mx-auto"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
          const isTarget = targets.includes(idx);
          const isSelected = selected.includes(idx);
          const isMemorize = phase === "memorize";

          let bgClass = "bg-slate-800 border-slate-700 hover:border-slate-500";
          if (isMemorize && isTarget) {
            bgClass = "bg-cyan-500 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-95";
          } else if (phase === "recall" && isSelected) {
            bgClass = isTarget ? "bg-emerald-500 border-emerald-300" : "bg-rose-500 border-rose-300";
          }

          return (
            <button
              key={idx}
              disabled={phase !== "recall"}
              onClick={() => handleTileClick(idx)}
              className={`w-16 h-16 rounded-xl border-2 transition-all duration-300 transform active:scale-90 flex items-center justify-center font-bold text-lg ${bgClass}`}
            />
          );
        })}
      </div>

      {feedback && (
        <div className="text-center font-bold text-sm text-cyan-300 my-2 animate-bounce">
          {feedback}
        </div>
      )}

      {phase === "result" && (
        <div className="mt-6 text-center space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h3 className="font-bold text-lg">Brain Exercise Completed!</h3>
            <p className="text-xs text-slate-400">Total Score: {score}</p>
          </div>
          <button
            onClick={() => {
              setGridSize(3);
              setTargetCount(3);
              setScore(0);
              setRound(1);
            }}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
