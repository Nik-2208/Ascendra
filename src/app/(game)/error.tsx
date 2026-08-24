"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error("Game Engine Error:", error);
  }, [error]);

  return (
    <div className="h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="rpg-panel max-w-md w-full p-8 rounded-2xl text-center border-red-500/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-danger to-orange-500" />
        
        <div className="w-20 h-20 mx-auto rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center mb-6">
          <AlertTriangle className="text-danger w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-serif font-bold mb-2 text-white">System Failure</h2>
        <p className="text-muted-foreground mb-8">
          A temporal anomaly disrupted your progression. The timeline must be realigned.
        </p>

        <div className="bg-black/30 p-4 rounded-xl text-left text-xs text-red-400 font-mono mb-8 overflow-x-auto whitespace-pre-wrap">
          {error.message || "Unknown anomaly detected"}
        </div>
        
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 w-full rpg-btn-primary py-3 rounded-xl transition-all"
        >
          <RefreshCcw size={16} /> Realign Timeline
        </button>
      </div>
    </div>
  );
}
