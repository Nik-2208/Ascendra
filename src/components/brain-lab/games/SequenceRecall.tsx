"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Scroll, RotateCcw, Sparkles } from "lucide-react";

export function SequenceRecall({ userId = "demo-user" }: { userId?: string }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [phase, setPhase] = useState<"memorize" | "recall" | "result">("memorize");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(3);
  const [feedback, setFeedback] = useState<string | null>(null);

  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const startLevel = () => {
    const newSeq: number[] = [];
    for (let i = 0; i < level; i++) {
      newSeq.push(Math.floor(Math.random() * 9) + 1);
    }
    setSequence(newSeq);
    setUserSeq([]);
    setPhase("memorize");
    setFeedback(null);

    setTimeout(() => {
      setPhase("recall");
    }, 1000 + level * 500);
  };

  useEffect(() => {
    startLevel();
  }, [level]);

  const handleNumClick = (num: number) => {
    if (phase !== "recall") return;
    const nextUserSeq = [...userSeq, num];
    setUserSeq(nextUserSeq);

    const currentIdx = nextUserSeq.length - 1;
    if (nextUserSeq[currentIdx] !== sequence[currentIdx]) {
      setFeedback("SEQUENCE BROKEN!");
      setPhase("result");
      const brainXp = calculateGameBrainXp(score, "medium");
      // synced via DB submitBrainGameResult("sequence-recall", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      submitBrainGameResult(userId, "sequence-recall", score, { domain: "Short-Term & Working Memory" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      return;
    }

    if (nextUserSeq.length === sequence.length) {
      const points = level * 150;
      setScore((s) => s + points);
      setFeedback("PERFECT RECALL! + " + points);
      setTimeout(() => setLevel((l) => l + 1), 1000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Scroll className="w-6 h-6 text-emerald-400" />
          <h2 className="font-bold text-lg text-emerald-100">Sequence Recall</h2>
        </div>
        <div className="text-sm font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
          Score: {score}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center mb-6">
        {phase === "memorize" ? "Memorize the sequence of numbers!" : phase === "recall" ? "Repeat the sequence in exact order!" : "Recall Finished!"}
      </p>

      {phase === "memorize" && (
        <div className="flex gap-2 justify-center py-8 bg-slate-950 rounded-xl border border-slate-800">
          {sequence.map((n, i) => (
            <div key={i} className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center animate-bounce">
              {n}
            </div>
          ))}
        </div>
      )}

      {phase === "recall" && (
        <div className="space-y-6">
          <div className="flex gap-2 justify-center min-h-[48px] bg-slate-950 p-2 rounded-xl border border-slate-800">
            {userSeq.map((n, i) => (
              <div key={i} className="w-10 h-10 rounded-lg bg-emerald-950 text-emerald-300 font-bold flex items-center justify-center border border-emerald-800">
                {n}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => handleNumClick(n)}
                className="py-4 bg-slate-800 hover:bg-emerald-600 font-black text-xl rounded-xl border border-slate-700 transition transform active:scale-95"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="text-center py-6 space-y-4">
          <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-xl font-bold">Sequence Recall Complete!</h3>
          <p className="text-sm text-slate-400">Total Score: {score}</p>
          <button
            onClick={() => {
              setLevel(3);
              setScore(0);
              setPhase("memorize");
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}

      {feedback && <p className="text-xs font-bold text-emerald-300 text-center mt-4 animate-pulse">{feedback}</p>}
    </div>
  );
}
