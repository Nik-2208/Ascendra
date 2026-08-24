"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { ShieldCheck, RotateCcw, Sparkles } from "lucide-react";

interface LogicClue {
  statement: string;
  isTrue: boolean;
}

export function LogicGrid({ userId = "demo-user" }: { userId?: string }) {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [clue, setClue] = useState<LogicClue | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const generateClue = () => {
    setFeedback(null);
    const names = ["Alex", "Blake", "Charlie", "Dana"];
    const colors = ["Red", "Blue", "Green", "Gold"];

    const name = names[Math.floor(Math.random() * names.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const isTrue = Math.random() < 0.5;

    if (isTrue) {
      setClue({ statement: `${name} is assigned to team ${color}.`, isTrue: true });
    } else {
      setClue({ statement: `${name} is NOT assigned to team ${color}.`, isTrue: false });
    }
  };

  useEffect(() => {
    generateClue();
  }, [round]);

  const handleAnswer = (userChoice: boolean) => {
    if (!clue || gameOver) return;

    if (userChoice === clue.isTrue) {
      const points = 120 + round * 15;
      setScore((s) => s + points);
      setFeedback("LOGICAL DEDUCTION SUCCESS! + " + points);
      setTimeout(() => {
        if (round >= 8) {
          setGameOver(true);
          const brainXp = calculateGameBrainXp(score, "medium");
          // synced via DB submitBrainGameResult("logic-grid", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
          submitBrainGameResult(userId, "logic-grid", score, { domain: "Logical Deduction" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
        } else {
          setRound((r) => r + 1);
        }
      }, 1000);
    } else {
      setFeedback("LOGIC ERROR");
      setGameOver(true);
      const brainXp = calculateGameBrainXp(score, "medium");
      // synced via DB submitBrainGameResult("logic-grid", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      submitBrainGameResult(userId, "logic-grid", score, { domain: "Logical Deduction" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-teal-400" />
          <h2 className="font-bold text-lg text-teal-100">Logic Grid</h2>
        </div>
        <div className="text-sm font-semibold text-teal-400 bg-teal-950/60 px-3 py-1 rounded-full border border-teal-800">
          Score: {score}
        </div>
      </div>

      {!gameOver && clue ? (
        <div className="space-y-6 text-center">
          <p className="text-xs text-slate-400">Evaluate the deduction statement:</p>

          <div className="bg-slate-950 p-6 rounded-xl border border-teal-500/30 text-lg font-bold text-teal-200">
            "{clue.statement}"
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleAnswer(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-md transition"
            >
              TRUE (VALID)
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-500 font-bold rounded-xl text-white shadow-md transition"
            >
              FALSE (INVALID)
            </button>
          </div>

          {feedback && <p className="text-xs font-bold text-teal-300 animate-pulse">{feedback}</p>}
        </div>
      ) : (
        <div className="text-center py-6 space-y-4">
          <Sparkles className="w-10 h-10 text-teal-400 mx-auto mb-2" />
          <h3 className="text-xl font-bold">Logic Grid Complete!</h3>
          <p className="text-sm text-slate-400">Total Score: {score}</p>
          <button
            onClick={() => {
              setScore(0);
              setRound(1);
              setGameOver(false);
              generateClue();
            }}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 font-bold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
