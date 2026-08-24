"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Activity, RotateCcw, Sparkles } from "lucide-react";

export function MultiTaskArena({ userId = "demo-user" }: { userId?: string }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isPlaying, setIsPlaying] = useState(false);
  const [movingPos, setMovingPos] = useState({ x: 50, y: 50 });
  const [mathAns, setMathAns] = useState(0);
  const [mathQ, setMathQ] = useState("");
  const [options, setOptions] = useState<number[]>([]);
  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const generateTask = () => {
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 9) + 1;
    const ans = n1 + n2;
    setMathQ(`${n1} + ${n2} = ?`);
    setMathAns(ans);

    const opts = [ans, ans + 1, ans - 1, ans + 2].sort(() => Math.random() - 0.5);
    setOptions(opts);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(25);
    setIsPlaying(true);
    generateTask();
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (timeLeft <= 0) {
      setIsPlaying(false);
      const brainXp = calculateGameBrainXp(score, "medium");
      // synced via DB submitBrainGameResult("multi-task", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      submitBrainGameResult(userId, "multi-task", score, { domain: "Divided Attention" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      return;
    }

    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    if (!isPlaying) return;
    const moveTimer = setInterval(() => {
      setMovingPos({
        x: Math.floor(Math.random() * 70) + 15,
        y: Math.floor(Math.random() * 70) + 15,
      });
    }, 1500);
    return () => clearInterval(moveTimer);
  }, [isPlaying]);

  const handleMathChoice = (choice: number) => {
    if (choice === mathAns) {
      setScore((s) => s + 120);
      generateTask();
    } else {
      setScore((s) => Math.max(0, s - 40));
    }
  };

  const handleTargetClick = () => {
    setScore((s) => s + 80);
    setMovingPos({
      x: Math.floor(Math.random() * 70) + 15,
      y: Math.floor(Math.random() * 70) + 15,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-cyan-400" />
          <h2 className="font-bold text-lg text-cyan-100">Multi-Task Arena</h2>
        </div>
        <div className="text-sm font-semibold text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
          Score: {score}
        </div>
      </div>

      {!isPlaying ? (
        <div className="text-center py-8 space-y-4">
          <p className="text-xs text-slate-400">Track moving objects while solving arithmetic tasks simultaneously!</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 font-bold rounded-xl text-white shadow-lg transition"
          >
            Start Multi-Task Arena
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>Divided Attention Arena</span>
            <span className="text-amber-300">Time: {timeLeft}s</span>
          </div>

          {/* Arena Box */}
          <div className="relative w-full h-44 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <button
              onClick={handleTargetClick}
              className="absolute w-10 h-10 rounded-full bg-cyan-500 border-2 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all duration-700 flex items-center justify-center font-bold text-xs"
              style={{ top: `${movingPos.y}%`, left: `${movingPos.x}%` }}
            >
              TAP
            </button>
          </div>

          {/* Math Dual Task */}
          <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30">
            <span className="text-xs text-cyan-400 font-bold">{mathQ}</span>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleMathChoice(opt)}
                  className="py-2 bg-slate-800 hover:bg-cyan-600 font-bold rounded-lg text-sm border border-slate-700"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
