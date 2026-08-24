"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Brain, Zap, RotateCcw } from "lucide-react";

const SYMBOLS = ["▲", "■", "★", "●", "◆"];

export function NBackChallenge({ userId = "demo-user" }: { userId?: string }) {
  const [n, setN] = useState(2);
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const startGame = () => {
    const newSeq: string[] = [];
    for (let i = 0; i < 20; i++) {
      if (i >= n && Math.random() < 0.4) {
        newSeq.push(newSeq[i - n]); // Force match
      } else {
        newSeq.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }
    }
    setSequence(newSeq);
    setCurrentIndex(0);
    setScore(0);
    setIsPlaying(true);
    setFeedback(null);
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (currentIndex >= sequence.length) {
      setIsPlaying(false);
      setFeedback(`CHALLENGE COMPLETED! Score: ${score}`);
      const brainXp = calculateGameBrainXp(score, "medium");
      // synced via DB submitBrainGameResult("n-back", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      submitBrainGameResult(userId, "n-back", score, { domain: "Working Memory & Updating" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      return;
    }

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, sequence]);

  const handleMatchResponse = (userMatch: boolean) => {
    if (!isPlaying || currentIndex < n) return;

    const actualMatch = sequence[currentIndex] === sequence[currentIndex - n];
    if (userMatch === actualMatch) {
      setScore((s) => s + 150);
      setFeedback("CORRECT! +150");
    } else {
      setFeedback("MISSED / INCORRECT");
    }
  };

  const currentSymbol = sequence[currentIndex] || "?";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-400" />
          <h2 className="font-bold text-lg text-amber-100">{n}-Back Challenge</h2>
        </div>
        <div className="text-sm font-semibold text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800">
          Score: {score}
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-6 text-center">
        Does the current symbol match the one shown <strong>{n} step(s)</strong> ago?
      </p>

      {!isPlaying ? (
        <div className="text-center py-8">
          <button
            onClick={startGame}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 font-bold rounded-xl text-white shadow-lg transition"
          >
            Start N-Back Sprint
          </button>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="w-28 h-28 mx-auto bg-slate-950 border-2 border-amber-500/50 rounded-2xl flex items-center justify-center text-5xl font-black text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            {currentSymbol}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleMatchResponse(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-md transition"
            >
              MATCH (YES)
            </button>
            <button
              onClick={() => handleMatchResponse(false)}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-500 font-bold rounded-xl text-white shadow-md transition"
            >
              NO MATCH
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <p className="text-center text-xs font-bold text-amber-400 mt-4 animate-pulse">{feedback}</p>
      )}
    </div>
  );
}
