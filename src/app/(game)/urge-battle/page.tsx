"use client";

import { useState } from "react";
import { Shield, Heart, Zap, Book, ShieldAlert, Activity, ArrowRight, CheckCircle2, Sparkles, Coins } from "lucide-react";
import { soundEngine } from "@/lib/sound-engine";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function ResiliencePage() {
  const [state, setState] = useState<"idle" | "reflecting" | "deflecting" | "overcame" | "relapsed">("idle");
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string>("");
  const [rewardMsg, setRewardMsg] = useState<string>("");

  const { data: session } = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();

  const startReflection = () => {
    const newSessionId = `resilience_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setSessionId(newSessionId);
    setRewardMsg("");
    setState("reflecting");
    setTimeout(() => setState("deflecting"), 1500);
  };

  const deflectAction = () => {
    soundEngine.playQuestComplete();
    const newProgress = Math.min(100, progress + 34); // takes ~3 actions
    setProgress(newProgress);
    if (newProgress >= 100) {
      setTimeout(async () => {
        setState("overcame");
        soundEngine.playUrgeVictory();
        if (user?.id) {
          const { urgeVictoryAction } = await import("@/actions/game-actions");
          const result = await urgeVictoryAction(user.id, sessionId);
          if (result.success) {
            setRewardMsg(result.notificationMessage || "Distraction Resisted! +5 XP • +10 Gold");
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["character"] });
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            const { dispatchGameEvent } = await import("@/lib/game-event-bus");
            await dispatchGameEvent("URGE_WON", { ...result, userId: user.id });
          }
        }
      }, 500);
    }
  };

  const recordRelapse = async () => {
    setState("relapsed");
    soundEngine.playUrgeDefeat();
    if (user?.id) {
      const { urgeDefeatAction } = await import("@/actions/game-actions");
      const result = await urgeDefeatAction(user.id, sessionId);
      if (result.success) {
        setRewardMsg(result.notificationMessage || "Distraction Won. -5 XP");
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["character"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        const { dispatchGameEvent } = await import("@/lib/game-event-bus");
        await dispatchGameEvent("URGE_LOST", { userId: user.id });
      }
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto py-8 px-4">
      <header className="mb-12">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Shield className="text-[#f59e0b]" size={24} /> Resilience Center
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A safe space to acknowledge distractions and redirect your energy.
        </p>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <button 
                onClick={startReflection}
                className="w-48 h-48 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex flex-col items-center justify-center gap-3 hover:bg-[#f59e0b]/20 transition-all shadow-[0_0_30px_rgba(245,158,11,0.15)] group"
              >
                <ShieldAlert size={48} className="text-[#f59e0b] group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm text-[#f59e0b] tracking-wide">Record a Distraction</span>
              </button>
            </motion.div>
          )}

          {state === "reflecting" && (
            <motion.div
              key="reflecting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-4"
            >
              <Activity className="w-12 h-12 text-[#f59e0b] mx-auto animate-pulse" />
              <h2 className="text-lg font-medium text-foreground">Acknowledge the feeling.</h2>
              <p className="text-sm text-muted-foreground">Breathe in. You are in control.</p>
            </motion.div>
          )}

          {state === "deflecting" && (
            <motion.div
              key="deflecting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-lg rpg-panel rounded-2xl p-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-lg font-medium text-foreground mb-2">Redirect Energy</h2>
                <p className="text-xs text-muted-foreground">Complete positive actions to overcome the distraction.</p>
              </div>
              
              <div className="mb-8">
                <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  <span>Resilience</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={deflectAction} className="bg-black/40 border border-white/10 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:border-purple-500 transition-colors">
                  <Zap size={16} className="text-purple-400" /> Do 10 Pushups
                </button>
                <button onClick={deflectAction} className="bg-black/40 border border-white/10 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:border-purple-500 transition-colors">
                  <Book size={16} className="text-blue-400" /> Read 5 Pages
                </button>
                <button onClick={deflectAction} className="bg-black/40 border border-white/10 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:border-purple-500 transition-colors sm:col-span-2">
                  <Heart size={16} className="text-red-500" /> Meditate for 2 Minutes
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-border/30 text-center">
                <button 
                  onClick={recordRelapse} 
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Log a setback
                </button>
              </div>
            </motion.div>
          )}

          {state === "overcame" && (
            <motion.div
              key="overcame"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 rpg-panel p-10 rounded-2xl max-w-md border border-amber-500/30"
            >
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-foreground">You Overcame It</h2>
                <p className="text-sm text-muted-foreground mt-2">Your resilience grows. You gained XP and momentum.</p>
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-bold font-mono flex items-center justify-center gap-3">
                  <span className="flex items-center gap-1"><Sparkles size={14} /> +5 XP</span>
                  <span className="flex items-center gap-1"><Coins size={14} /> +10 Gold</span>
                </div>
              </div>
              <button 
                onClick={() => { setState("idle"); setProgress(0); }} 
                className="rpg-btn-primary px-6 py-2.5 rounded-lg text-sm w-full font-bold"
              >
                Continue
              </button>
            </motion.div>
          )}

          {state === "relapsed" && (
            <motion.div
              key="relapsed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 rpg-panel p-10 rounded-2xl max-w-md border-t-4 border-t-rose-500"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto">
                <ArrowRight className="w-6 h-6 text-rose-400 rotate-45" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Setback Recorded</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Progress isn't perfectly linear. Acknowledge this moment, forgive yourself, and step forward.
                </p>
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold font-mono flex items-center justify-center gap-2">
                  <Sparkles size={14} /> {rewardMsg || "Distraction Won. -5 XP"}
                </div>
              </div>
              <button 
                onClick={() => { setState("idle"); setProgress(0); }} 
                className="w-full bg-black/40 border border-white/10 hover:border-white/30 text-white px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all"
              >
                Reset and Move On
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
