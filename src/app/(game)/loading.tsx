import { Swords } from "lucide-react";

export default function GameLoading() {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
        
        {/* Spinner */}
        <div className="w-24 h-24 border-4 border-background border-t-primary rounded-full animate-spin flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(var(--primary),0.5)]">
          <Swords className="text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" size={32} />
        </div>
      </div>
      
      <div className="mt-8 text-center animate-pulse">
        <h2 className="text-xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-2">
          Syncing World State
        </h2>
        <p className="text-sm text-muted-foreground tracking-widest uppercase">Loading assets...</p>
      </div>
    </div>
  );
}
