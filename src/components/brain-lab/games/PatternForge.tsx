"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Compass, RotateCcw, CheckCircle2, XCircle, Sparkles } from "lucide-react";

interface SequenceProblem {
  sequence: (string | number)[];
  options: (string | number)[];
  answer: string | number;
  explanation: string;
}

export function PatternForge({ userId = "demo-user", onClose }: { userId?: string; onClose?: () => void }) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState<SequenceProblem | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(3);
  const [tier, setTier] = useState<"Beginner" | "Master" | "Legendary">("Beginner");

  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const generateProblem = (lvl: number) => {
    setSelectedOption(null);
    setIsCorrect(null);

    let currentTier: "Beginner" | "Master" | "Legendary" = "Beginner";
    if (lvl > 8) currentTier = "Legendary";
    else if (lvl > 4) currentTier = "Master";
    setTier(currentTier);

    if (lvl <= 2) {
      // Arithmetic sequence
      const step = Math.floor(Math.random() * 4) + 2;
      const start = Math.floor(Math.random() * 10) + 1;
      const seq = [start, start + step, start + step * 2, "?"];
      const ans = start + step * 3;
      const opts = [ans, ans + step, ans - step, ans + 1].sort(() => Math.random() - 0.5);
      setProblem({ sequence: seq, options: opts, answer: ans, explanation: `Add ${step} each step` });
    } else if (lvl <= 5) {
      // Geometric / Doubling sequence
      const mult = 2;
      const start = Math.floor(Math.random() * 5) + 2;
      const seq = [start, start * mult, start * mult * mult, "?"];
      const ans = start * mult * mult * mult;
      const opts = [ans, ans / 2, ans + 4, ans * 2].sort(() => Math.random() - 0.5);
      setProblem({ sequence: seq, options: opts, answer: ans, explanation: `Multiply by 2 each step` });
    } else if (lvl <= 8) {
      // Fibonacci / Addition sequence
      const n1 = Math.floor(Math.random() * 3) + 1;
      const n2 = Math.floor(Math.random() * 3) + 2;
      const n3 = n1 + n2;
      const n4 = n2 + n3;
      const seq = [n1, n2, n3, n4, "?"];
      const ans = n3 + n4;
      const opts = [ans, ans + 2, ans - 1, ans + n1].sort(() => Math.random() - 0.5);
      setProblem({ sequence: seq, options: opts, answer: ans, explanation: "Each number is the sum of the previous two" });
    } else {
      // Shape / Symbol sequence
      const symbols = ["▲", "■", "★", "●", "◆", "✦"];
      const s1 = symbols[Math.floor(Math.random() * symbols.length)];
      let s2 = symbols[Math.floor(Math.random() * symbols.length)];
      while (s2 === s1) s2 = symbols[Math.floor(Math.random() * symbols.length)];
      
      const seq = [s1, s2, s1, s2, "?"];
      const ans = s1;
      const opts = symbols.slice(0, 4).sort(() => Math.random() - 0.5);
      if (!opts.includes(ans)) opts[0] = ans;
      setProblem({ sequence: seq, options: opts, answer: ans, explanation: "Alternating symbol pattern" });
    }
  };

  useEffect(() => {
    generateProblem(1);
  }, []);

  const handleSelect = (opt: string | number) => {
    if (selectedOption !== null || gameOver || !problem) return;
    setSelectedOption(opt);

    if (opt === problem.answer) {
      setIsCorrect(true);
      const points = level * 120 + 100;
      setScore((s) => s + points);
      setTimeout(() => {
        setLevel((l) => l + 1);
        generateProblem(level + 1);
      }, 1200);
    } else {
      setIsCorrect(false);
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        setGameOver(true);
        const brainXp = calculateGameBrainXp(score, "medium");
        // synced via DB submitBrainGameResult("pattern-forge", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
        submitBrainGameResult(userId, "pattern-forge", score, { domain: "Abstract Reasoning", tier }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      } else {
        setTimeout(() => {
          generateProblem(level);
        }, 1500);
      }
    }
  };

  const restart = () => {
    setLevel(1);
    setScore(0);
    setLives(3);
    setGameOver(false);
    generateProblem(1);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-6 h-6 text-emerald-400 animate-spin-slow" />
          <h2 className="font-bold text-lg text-emerald-100">Pattern Forge</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">{tier}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-rose-400 font-bold">{"❤️".repeat(lives)}</span>
          <div className="text-sm font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
            {score}
          </div>
        </div>
      </div>

      {!gameOver && problem ? (
        <div className="space-y-6 text-center">
          <p className="text-xs text-slate-400">Identify the missing rule in the visual sequence:</p>
          
          <div className="flex gap-3 justify-center items-center py-6 bg-slate-950 rounded-xl border border-slate-800">
            {problem.sequence.map((item, idx) => (
              <div
                key={idx}
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black border-2 ${
                  item === "?"
                    ? "border-emerald-400 text-emerald-400 animate-pulse bg-emerald-950/40"
                    : "border-slate-700 bg-slate-900 text-slate-100"
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {problem.options.map((opt, idx) => {
              let bg = "bg-slate-800 border-slate-700 hover:border-emerald-500 hover:bg-slate-750";
              if (selectedOption === opt) {
                bg = opt === problem.answer ? "bg-emerald-600 border-emerald-400" : "bg-rose-600 border-rose-400";
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(opt)}
                  disabled={selectedOption !== null}
                  className={`py-4 rounded-xl font-bold text-lg border transition transform active:scale-95 ${bg}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {isCorrect !== null && (
            <p className={`text-xs font-bold ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
              {isCorrect ? "CRACKED THE RULE! + " + (level * 120 + 100) : `INCORRECT! Rule: ${problem.explanation}`}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-6 space-y-4">
          <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-xl font-bold">Pattern Forge Completed!</h3>
          <p className="text-sm text-slate-400">Final Score: {score} | Level Reached: {level}</p>
          <button
            onClick={restart}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
        </div>
      )}
    </div>
  );
}
