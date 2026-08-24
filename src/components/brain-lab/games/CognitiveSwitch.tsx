"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Sparkles, RotateCcw } from "lucide-react";

interface RuleItem {
  color: "RED" | "BLUE";
  shape: "CIRCLE" | "SQUARE";
}

export function CognitiveSwitch({ userId = "demo-user" }: { userId?: string }) {
  const [score, setScore] = useState(0);
  const [rule, setRule] = useState<"COLOR" | "SHAPE">("COLOR");
  const [item, setItem] = useState<RuleItem>({ color: "RED", shape: "CIRCLE" });
  const [timeLeft, setTimeLeft] = useState(25);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const spawnNewItem = () => {
    const colors: ("RED" | "BLUE")[] = ["RED", "BLUE"];
    const shapes: ("CIRCLE" | "SQUARE")[] = ["CIRCLE", "SQUARE"];
    const newColor = colors[Math.floor(Math.random() * 2)];
    const newShape = shapes[Math.floor(Math.random() * 2)];

    // 40% chance rule switches
    if (Math.random() < 0.4) {
      setRule((r) => (r === "COLOR" ? "SHAPE" : "COLOR"));
    }

    setItem({ color: newColor, shape: newShape });
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(25);
    setIsPlaying(true);
    spawnNewItem();
    setFeedback(null);
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (timeLeft <= 0) {
      setIsPlaying(false);
      const brainXp = calculateGameBrainXp(score, "medium");
      // synced via DB submitBrainGameResult("cognitive-switch", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      submitBrainGameResult(userId, "cognitive-switch", score, { domain: "Task Switching" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      return;
    }

    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const handleChoice = (choice: string) => {
    if (!isPlaying) return;

    let isCorrect = false;
    if (rule === "COLOR" && choice === item.color) isCorrect = true;
    if (rule === "SHAPE" && choice === item.shape) isCorrect = true;

    if (isCorrect) {
      setScore((s) => s + 100);
      setFeedback("FLEXIBLE SWITCH! +100");
    } else {
      setFeedback("RULE MISMATCH!");
    }

    spawnNewItem();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-sky-400" />
          <h2 className="font-bold text-lg text-sky-100">Cognitive Switch</h2>
        </div>
        <div className="text-sm font-semibold text-sky-400 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-800">
          Score: {score}
        </div>
      </div>

      {!isPlaying ? (
        <div className="text-center py-8 space-y-4">
          <p className="text-xs text-slate-400">Alternate rapidly between changing sorting rules (COLOR vs SHAPE)!</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-sky-600 hover:bg-sky-500 font-bold rounded-xl text-white shadow-lg transition"
          >
            Start Cognitive Switch
          </button>
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <div className="bg-sky-950 border border-sky-500/40 p-3 rounded-xl">
            <span className="text-xs uppercase font-bold text-sky-400">Current Rule:</span>
            <div className="text-xl font-black text-white">{rule === "COLOR" ? "MATCH COLOR" : "MATCH SHAPE"}</div>
          </div>

          <div className="py-6 flex justify-center">
            <div
              className={`w-28 h-28 border-4 flex items-center justify-center font-bold text-lg transition-transform ${
                item.shape === "CIRCLE" ? "rounded-full" : "rounded-2xl"
              } ${item.color === "RED" ? "bg-rose-500 border-rose-300" : "bg-sky-500 border-sky-300"}`}
            >
              {item.color} {item.shape}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {rule === "COLOR" ? (
              <>
                <button
                  onClick={() => handleChoice("RED")}
                  className="py-3 bg-rose-600 hover:bg-rose-500 font-bold rounded-xl"
                >
                  RED
                </button>
                <button
                  onClick={() => handleChoice("BLUE")}
                  className="py-3 bg-sky-600 hover:bg-sky-500 font-bold rounded-xl"
                >
                  BLUE
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleChoice("CIRCLE")}
                  className="py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-700"
                >
                  CIRCLE
                </button>
                <button
                  onClick={() => handleChoice("SQUARE")}
                  className="py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-700"
                >
                  SQUARE
                </button>
              </>
            )}
          </div>

          {feedback && <p className="text-xs font-bold text-sky-300 animate-pulse">{feedback}</p>}
        </div>
      )}
    </div>
  );
}
