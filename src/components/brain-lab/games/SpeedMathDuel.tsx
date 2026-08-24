"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Calculator, CheckCircle2, RotateCcw } from "lucide-react";

export function SpeedMathDuel({ userId = "demo-user" }: { userId?: string }) {
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState({ q: "4 + 7", a: 11 });
  const [inputVal, setInputVal] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const generateProblem = () => {
    const ops = ["+", "-", "*"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let n1 = Math.floor(Math.random() * 12) + 1;
    let n2 = Math.floor(Math.random() * 12) + 1;
    let ans = 0;
    if (op === "+") ans = n1 + n2;
    if (op === "-") {
      if (n1 < n2) [n1, n2] = [n2, n1];
      ans = n1 - n2;
    }
    if (op === "*") ans = n1 * n2;

    setProblem({ q: `${n1} ${op} ${n2}`, a: ans });
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
    generateProblem();

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setIsPlaying(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlaying) return;

    if (parseInt(inputVal, 10) === problem.a) {
      const newScore = score + 100;
      setScore(newScore);
      setInputVal("");
      generateProblem();
    } else {
      setInputVal("");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-indigo-400" />
          <h2 className="font-bold text-lg text-indigo-100">Speed Math Duel</h2>
        </div>
        <div className="text-sm font-semibold text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800">
          Score: {score}
        </div>
      </div>

      {!isPlaying ? (
        <div className="text-center py-6 space-y-4">
          <p className="text-xs text-slate-400">Solve as many arithmetic problems as possible in 30 seconds!</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-white shadow-lg transition"
          >
            Start Speed Math Duel
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>Time Remaining:</span>
            <span className="text-indigo-300 font-bold">{timeLeft}s</span>
          </div>

          <div className="text-center bg-slate-950 py-8 rounded-xl border border-slate-800">
            <span className="text-4xl font-black text-indigo-300 tracking-wider">{problem.q} = ?</span>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="number"
              autoFocus
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Your answer..."
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-center text-xl focus:border-indigo-500 outline-none"
            />
            <button
              type="submit"
              className="px-6 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-white transition"
            >
              Submit
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
