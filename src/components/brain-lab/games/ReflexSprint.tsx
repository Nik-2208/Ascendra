"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Flame, RotateCcw, Sparkles } from "lucide-react";

export function ReflexSprint({ userId = "demo-user" }: { userId?: string }) {
  const [score, setScore] = useState(0);
  const [targetType, setTargetType] = useState<"GREEN" | "RED">("GREEN");
  const [currentDisplay, setCurrentDisplay] = useState<"GREEN" | "RED" | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);
  const [feedback, setFeedback] = useState<string | null>(null);
  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const startGame = () => {
    setScore(0);
    setTimeLeft(25);
    setIsPlaying(true);
    setTargetType(Math.random() < 0.5 ? "GREEN" : "RED");
    setFeedback(null);
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (timeLeft <= 0) {
      setIsPlaying(false);
      const brainXp = calculateGameBrainXp(score, "medium");
      // synced via DB submitBrainGameResult("reflex-sprint", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      submitBrainGameResult(userId, "reflex-sprint", score, { domain: "Response Inhibition" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      return;
    }

    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    if (!isPlaying) return;

    const spawnItem = () => {
      const nextDisplay = Math.random() < 0.6 ? targetType : targetType === "GREEN" ? "RED" : "GREEN";
      setCurrentDisplay(nextDisplay);
    };

    spawnItem();
    const interval = setInterval(spawnItem, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, targetType]);

  const handleTap = () => {
    if (!isPlaying || !currentDisplay) return;

    if (currentDisplay === targetType) {
      setScore((s) => s + 100);
      setFeedback("FAST REFLEX! +100");
    } else {
      setScore((s) => Math.max(0, s - 50));
      setFeedback("INHIBITION FAILURE! -50");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-rose-400" />
          <h2 className="font-bold text-lg text-rose-100">Reflex Sprint</h2>
        </div>
        <div className="text-sm font-semibold text-rose-400 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-800">
          Score: {score}
        </div>
      </div>

      {!isPlaying ? (
        <div className="text-center py-8 space-y-4">
          <p className="text-xs text-slate-400">React ONLY to target stimuli while ignoring distractors!</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-rose-600 hover:bg-rose-500 font-bold rounded-xl text-white shadow-lg transition"
          >
            Start Reflex Sprint
          </button>
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>Target: <strong className={targetType === "GREEN" ? "text-emerald-400" : "text-rose-400"}>{targetType} CIRCLE ONLY</strong></span>
            <span>Time: <strong className="text-amber-300">{timeLeft}s</strong></span>
          </div>

          <div
            onClick={handleTap}
            className={`w-36 h-36 mx-auto rounded-full border-4 flex items-center justify-center cursor-pointer transition transform active:scale-90 shadow-2xl ${
              currentDisplay === "GREEN"
                ? "bg-emerald-500 border-emerald-300 shadow-emerald-500/40"
                : "bg-rose-500 border-rose-300 shadow-rose-500/40"
            }`}
          >
            <span className="font-black text-2xl text-slate-950">{currentDisplay}</span>
          </div>

          <p className="text-xs text-slate-400">TAP THE CIRCLE ONLY IF IT IS {targetType}!</p>
          {feedback && <p className="text-xs font-bold text-rose-300 animate-bounce">{feedback}</p>}
        </div>
      )}
    </div>
  );
}
