"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

export default function OnboardingCinematic() {
  const router = useRouter();
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 3000); // Wait 3 seconds before showing continue button
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-2xl mx-auto text-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
      <div className="space-y-6">
        <h1 className="text-4xl md:text-5xl font-cinzel font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-pulse">
          AWAKENING
        </h1>
        
        <p className="text-xl md:text-2xl font-light leading-relaxed text-muted-foreground delay-700 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-backwards">
          You have slumbered for far too long. <br/>
          The world outside moves on, but your potential remains dormant.
        </p>
        
        <p className="text-lg md:text-xl font-light leading-relaxed text-muted-foreground delay-[2000ms] animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-backwards">
          It is time to rise. To forge your legacy. <br/>
          To treat your life as the ultimate game.
        </p>
      </div>

      <div className={`transition-all duration-1000 ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <button
          onClick={() => router.push("/onboarding/class")}
          className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-transparent border-2 border-primary rounded-full hover:bg-primary hover:shadow-[0_0_40px_rgba(var(--primary),0.6)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <span className="uppercase tracking-widest text-sm flex items-center gap-2">
            Open Your Eyes <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>
    </div>
  );
}
