"use client";

import { useEffect } from "react";
import { AscendraLogo } from "@/components/ui/ascendra-logo";
import { SpecularButton } from "@/components/ui/specular-button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/20 rounded-full blur-[140px] pointer-events-none" />
      
      <AscendraLogo size="xl" className="mb-6" />
      
      <h1 className="text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-red-400 mb-2">
        A Rift in the Realm
      </h1>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        An unexpected magical disruption occurred. Our grandmasters have been notified.
      </p>

      <div className="flex items-center gap-3">
        <SpecularButton variant="danger" onClick={() => reset()}>
          Re-cast Spell (Retry)
        </SpecularButton>
        <SpecularButton variant="secondary" onClick={() => window.location.href = "/"}>
          Return Home
        </SpecularButton>
      </div>
    </div>
  );
}
