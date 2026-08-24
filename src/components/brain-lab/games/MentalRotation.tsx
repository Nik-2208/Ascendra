"use client";
import { calculateGameBrainXp } from "@/lib/brain-progression-engine";

import React, { useState, useEffect } from "react";
import { useBrainStore } from "@/stores/brain-store";
import { submitBrainGameResult } from "@/actions/brain-actions";
import { Activity, RotateCcw, Sparkles } from "lucide-react";

// Shapes drawn with SVG points or rotation offsets
const SHAPES = [
  { name: "L-Block", svg: "M10 10 H30 V40 H50 V60 H10 Z" },
  { name: "T-Block", svg: "M10 10 H50 V30 H35 V60 H25 V30 H10 Z" },
  { name: "Z-Block", svg: "M10 10 H35 V30 H60 V50 H35 V30 H10 Z" },
];

export function MentalRotation({ userId = "demo-user" }: { userId?: string }) {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [refRotation, setRefRotation] = useState(0);
  const [options, setOptions] = useState<{ rotation: number; isMatch: boolean }[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [shapeIndex, setShapeIndex] = useState(0);

  const setBrainProfile = useBrainStore((s) => s.setBrainProfile);

  const generateRound = () => {
    setSelectedIdx(null);
    setFeedback(null);
    const newShape = Math.floor(Math.random() * SHAPES.length);
    setShapeIndex(newShape);

    const refRot = Math.floor(Math.random() * 4) * 90;
    setRefRotation(refRot);

    // 1 match option (same shape rotated), 3 non-matching options (flipped/mirrored shape)
    const matchRot = (refRot + (Math.floor(Math.random() * 3) + 1) * 90) % 360;
    const opts = [
      { rotation: matchRot, isMatch: true },
      { rotation: refRot, isMatch: false },
      { rotation: (matchRot + 90) % 360, isMatch: false },
      { rotation: (matchRot + 180) % 360, isMatch: false },
    ].sort(() => Math.random() - 0.5);

    setOptions(opts);
  };

  useEffect(() => {
    generateRound();
  }, [round]);

  const handleSelect = (idx: number, isMatch: boolean) => {
    if (selectedIdx !== null || gameOver) return;
    setSelectedIdx(idx);

    if (isMatch) {
      const points = 150 + round * 20;
      setScore((s) => s + points);
      setFeedback("CORRECT SPATIAL MATCH! + " + points);
      setTimeout(() => {
        if (round >= 10) {
          setGameOver(true);
          const brainXp = calculateGameBrainXp(score, "medium");
          // synced via DB submitBrainGameResult("mental-rotation", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
          submitBrainGameResult(userId, "mental-rotation", score, { domain: "Spatial Visualization" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
        } else {
          setRound((r) => r + 1);
        }
      }, 1000);
    } else {
      setFeedback("INCORRECT ALIGNMENT");
      setTimeout(() => {
        setGameOver(true);
        const brainXp = calculateGameBrainXp(score, "medium");
        // synced via DB submitBrainGameResult("mental-rotation", score, brainXp).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
        submitBrainGameResult(userId, "mental-rotation", score, { domain: "Spatial Visualization" }).then((res) => { if (res && res.profile) setBrainProfile(res.profile); });
      }, 1200);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-purple-400" />
          <h2 className="font-bold text-lg text-purple-100">Mental Rotation</h2>
        </div>
        <div className="text-sm font-semibold text-purple-400 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-800">
          Score: {score}
        </div>
      </div>

      {!gameOver ? (
        <div className="space-y-6 text-center">
          <p className="text-xs text-slate-400">Which option is a rotated version of the reference object?</p>

          {/* Reference shape */}
          <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 inline-block mx-auto">
            <div className="text-[10px] uppercase font-bold text-purple-400 mb-1">Reference Object</div>
            <svg
              width="70"
              height="70"
              viewBox="0 0 70 70"
              className="mx-auto transition-transform duration-500"
              style={{ transform: `rotate(${refRotation}deg)` }}
            >
              <path d={SHAPES[shapeIndex].svg} fill="#c084fc" stroke="#a855f7" strokeWidth="2" />
            </svg>
          </div>

          {/* 4 Candidate options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((opt, idx) => {
              let borderClass = "border-slate-700 hover:border-purple-500 bg-slate-950";
              if (selectedIdx === idx) {
                borderClass = opt.isMatch ? "border-emerald-400 bg-emerald-950/60" : "border-rose-400 bg-rose-950/60";
              }
              return (
                <button
                  key={idx}
                  disabled={selectedIdx !== null}
                  onClick={() => handleSelect(idx, opt.isMatch)}
                  className={`p-4 rounded-xl border-2 transition transform active:scale-95 flex flex-col items-center justify-center ${borderClass}`}
                >
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 70 70"
                    style={{
                      transform: `rotate(${opt.rotation}deg) ${!opt.isMatch ? "scaleX(-1)" : ""}`,
                    }}
                  >
                    <path d={SHAPES[shapeIndex].svg} fill="#e9d5ff" stroke="#c084fc" strokeWidth="2" />
                  </svg>
                </button>
              );
            })}
          </div>

          {feedback && <p className="text-xs font-bold text-purple-300 animate-pulse">{feedback}</p>}
        </div>
      ) : (
        <div className="text-center py-6 space-y-4">
          <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-2" />
          <h3 className="text-xl font-bold">Mental Rotation Complete!</h3>
          <p className="text-sm text-slate-400">Total Score: {score}</p>
          <button
            onClick={() => {
              setScore(0);
              setRound(1);
              setGameOver(false);
              generateRound();
            }}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 font-bold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
