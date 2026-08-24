"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getFocusStatsAction, 
  completeFocusSessionAction, 
  getPomodoroTimingsAction, 
  savePomodoroTimingsAction,
  type PomodoroTimings 
} from "@/actions/focus-actions";
import { getTasksAction } from "@/actions/task-actions";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Sparkles, 
  Clock, 
  History, 
  TrendingUp, 
  BookOpen,
  ArrowLeft,
  Flame,
  Award,
  Settings as SettingsIcon,
  Check,
  X
} from "lucide-react";
import { soundEngine } from "@/lib/sound-engine";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_TIMINGS: PomodoroTimings = {
  focusMins: 25,
  shortBreakMins: 5,
  longBreakMins: 15
};

function FocusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialTaskId = searchParams.get("taskId");

  // Timings State
  const [timings, setTimings] = useState<PomodoroTimings>(DEFAULT_TIMINGS);
  const [draftTimings, setDraftTimings] = useState<PomodoroTimings>(DEFAULT_TIMINGS);

  // Load Timings from DB & LocalStorage
  const { data: timingsResponse } = useQuery({
    queryKey: ["pomodoroTimings"],
    queryFn: () => getPomodoroTimingsAction()
  });

  useEffect(() => {
    if (timingsResponse?.success && timingsResponse.data) {
      setTimings(timingsResponse.data);
      setDraftTimings(timingsResponse.data);
    } else if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ascendra_pomodoro_timings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTimings(parsed);
          setDraftTimings(parsed);
        } catch (e) {}
      }
    }
  }, [timingsResponse]);

  // Save Timings Mutation
  const saveTimingsMutation = useMutation({
    mutationFn: savePomodoroTimingsAction,
    onSuccess: (res) => {
      if (res.success && res.data) {
        setTimings(res.data);
        if (typeof window !== "undefined") {
          localStorage.setItem("ascendra_pomodoro_timings", JSON.stringify(res.data));
        }
        queryClient.invalidateQueries({ queryKey: ["pomodoroTimings"] });
        // Instantly update timer if idle
        if (timerStatus === "idle") {
          if (timerMode === "pomodoro") setTimeLeft(res.data.focusMins * 60);
          else if (timerMode === "shortBreak") setTimeLeft(res.data.shortBreakMins * 60);
          else if (timerMode === "longBreak") setTimeLeft(res.data.longBreakMins * 60);
        }
      }
      setShowSettingsModal(false);
    }
  });

  // Timer States
  const [timerMode, setTimerMode] = useState<"pomodoro" | "shortBreak" | "longBreak">("pomodoro");
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">("idle");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(initialTaskId);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Stats / Tracking
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewards, setRewards] = useState<any>(null);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update timer duration when mode or timings change while idle
  useEffect(() => {
    if (timerStatus === "idle") {
      if (timerMode === "pomodoro") setTimeLeft(timings.focusMins * 60);
      else if (timerMode === "shortBreak") setTimeLeft(timings.shortBreakMins * 60);
      else if (timerMode === "longBreak") setTimeLeft(timings.longBreakMins * 60);
    }
  }, [timings, timerMode, timerStatus]);

  // Queries & Mutations
  const { data: statsResponse = { success: false, data: null } } = useQuery({
    queryKey: ["focusStats"],
    queryFn: () => getFocusStatsAction()
  });

  const stats = statsResponse.success ? (statsResponse.data as any) : null;

  const { data: tasksResponse = { success: false, data: [] } } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasksAction()
  });

  const tasks = tasksResponse.success ? tasksResponse.data : [];
  const linkedTask = tasks.find((t: { id: string }) => t.id === linkedTaskId);

  const saveSession = useMutation({
    mutationFn: completeFocusSessionAction,
    onSuccess: (res) => {
      if (res.success) {
        setRewards(res.data);
        setShowRewardModal(true);
        queryClient.invalidateQueries({ queryKey: ["focusStats"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });

        import("@/lib/game-event-bus").then((m) => {
          m.dispatchGameEvent("FOCUS_SESSION_COMPLETED", {
            duration: res.data.focusSession.duration,
            targetDuration: timings.focusMins * 60,
            xpEarned: res.data.xpGained,
            isPomodoro: timerMode === "pomodoro"
          });
        });
      } else {
        alert(res.error);
      }
    }
  });

  const handleTimerComplete = useCallback(() => {
    setTimerStatus("idle");
    soundEngine.playQuestComplete();

    if (timerMode === "pomodoro") {
      const nextCycleCount = completedCycles + 1;
      setCompletedCycles(nextCycleCount);

      saveSession.mutate({
        taskId: linkedTaskId,
        targetDuration: timings.focusMins * 60,
        actualDuration: timings.focusMins * 60
      });

      const isLongBreak = nextCycleCount % 4 === 0;
      if (isLongBreak) {
        setTimerMode("longBreak");
        setTimeLeft(timings.longBreakMins * 60);
      } else {
        setTimerMode("shortBreak");
        setTimeLeft(timings.shortBreakMins * 60);
      }
    } else {
      setTimerMode("pomodoro");
      setTimeLeft(timings.focusMins * 60);
    }
  }, [timings, timerMode, completedCycles, linkedTaskId, saveSession]);

  // Handle timer interval ticks
  useEffect(() => {
    if (timerStatus === "running") {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          setSecondsElapsed((elapsed) => elapsed + 1);
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerStatus, handleTimerComplete]);

  const resetTimer = useCallback(() => {
    setTimerStatus("idle");
    setSecondsElapsed(0);
    if (timerMode === "pomodoro") setTimeLeft(timings.focusMins * 60);
    else if (timerMode === "shortBreak") setTimeLeft(timings.shortBreakMins * 60);
    else setTimeLeft(timings.longBreakMins * 60);
  }, [timerMode, timings]);

  const handleStartPause = () => {
    if (timerStatus === "running") {
      setTimerStatus("paused");
    } else {
      setTimerStatus("running");
    }
  };

  const handleFinishSession = () => {
    if (secondsElapsed < 10) {
      alert("Sessions shorter than 10 seconds cannot be saved.");
      return;
    }
    setTimerStatus("idle");
    saveSession.mutate({
      taskId: linkedTaskId,
      targetDuration: timings.focusMins * 60,
      actualDuration: secondsElapsed
    });
    resetTimer();
  };

  const handleSaveSettings = () => {
    saveTimingsMutation.mutate(draftTimings);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatDurationHrsMins = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.round((secs % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Navigation & Timer Settings Header */}
      <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
        <button 
          onClick={() => router.push("/schedule")}
          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white font-bold uppercase tracking-wider"
        >
          <ArrowLeft size={16} /> Back to Schedule
        </button>

        <button
          onClick={() => {
            setDraftTimings(timings);
            setShowSettingsModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold hover:bg-purple-500/30 transition-colors"
        >
          <SettingsIcon size={14} /> Timer Settings
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Pomodoro Focus Room */}
        <div className="flex-1 rpg-panel rounded-3xl p-8 border border-white/10 flex flex-col justify-between items-center min-h-[500px] relative overflow-hidden bg-slate-950/90 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
          
          <div className="text-center space-y-4 my-auto w-full">
            {linkedTask && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs uppercase tracking-wider">
                <BookOpen size={14} /> Focusing: {linkedTask.title}
              </div>
            )}

            {/* Mode Switcher Pills */}
            <div className="flex flex-wrap justify-center gap-2 bg-slate-900/90 border border-white/10 p-1.5 rounded-2xl w-fit mx-auto shadow-inner">
              <button
                disabled={timerStatus !== "idle"}
                onClick={() => setTimerMode("pomodoro")}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${timerMode === "pomodoro" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
              >
                Focus ({timings.focusMins}m)
              </button>
              <button
                disabled={timerStatus !== "idle"}
                onClick={() => setTimerMode("shortBreak")}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${timerMode === "shortBreak" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
              >
                Short Break ({timings.shortBreakMins}m)
              </button>
              <button
                disabled={timerStatus !== "idle"}
                onClick={() => setTimerMode("longBreak")}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${timerMode === "longBreak" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
              >
                Long Break ({timings.longBreakMins}m)
              </button>
            </div>

            {/* Giant Digital Timer */}
            <div className="text-8xl md:text-9xl font-mono font-black tracking-tighter select-none py-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-purple-200 drop-shadow-[0_0_35px_rgba(168,85,247,0.3)]">
              {formatTime(timeLeft)}
            </div>

            <div className="text-xs text-slate-400 font-mono">
              {timerStatus === "running" ? "Stay focused on your current task." : timerStatus === "paused" ? "Timer paused." : "Ready to focus."}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 w-full sm:w-80 mt-6 z-10">
            <div className="flex gap-3">
              <button 
                onClick={handleStartPause}
                className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                  timerStatus === "running"
                    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40"
                }`}
              >
                {timerStatus === "running" ? (
                  <><Pause size={18} /> Pause</>
                ) : (
                  <><Play size={18} className="fill-current" /> Start Focus</>
                )}
              </button>

              {timerStatus !== "idle" && (
                <button 
                  onClick={resetTimer}
                  className="px-4 py-4 bg-slate-900 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors"
                  title="Reset Timer"
                >
                  <RotateCcw size={18} />
                </button>
              )}
            </div>

            {timerStatus !== "idle" && (
              <button 
                onClick={handleFinishSession}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all shadow-lg"
              >
                <CheckCircle size={16} /> Complete Session Early
              </button>
            )}

            {/* Task Selector */}
            {timerStatus === "idle" && (
              <select
                value={linkedTaskId || ""}
                onChange={(e) => setLinkedTaskId(e.target.value || null)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 w-full focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Link to Bounty Task --</option>
                {tasks.filter((t: { completed: boolean }) => !t.completed).map((t: { id: string; title: string }) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Right Sidebar: Analytics & Focus Log */}
        <div className="w-full lg:w-96 space-y-6">
          <div className="rpg-panel rounded-3xl p-6 border border-white/10 space-y-4 bg-slate-900/60">
            <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-400" /> Focus Analytics
            </h2>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-center">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 block font-sans">Today</span>
                <span className="text-lg font-bold text-purple-300 mt-1 block">{formatDurationHrsMins(stats?.todayFocusTime || 0)}</span>
              </div>
              <div className="bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-center">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 block font-sans">Weekly</span>
                <span className="text-lg font-bold text-[#38BDF8] mt-1 block">{formatDurationHrsMins(stats?.weeklyFocusTime || 0)}</span>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="rpg-panel rounded-3xl p-6 border border-white/10 bg-slate-900/60">
            <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2 mb-4">
              <History size={18} className="text-purple-400" /> Session History
            </h2>

            {!stats || !stats.history || stats.history.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No focus sessions recorded yet today.</p>
            ) : (
              <div className="space-y-3">
                {stats.history.slice(0, 5).map((h: any) => (
                  <div key={h.id} className="p-3 bg-slate-950/60 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block line-clamp-1">{h.taskTitle}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{Math.round(h.duration / 60)} mins</span>
                    </div>
                    <span className="text-[#38BDF8] font-bold font-mono">+{h.xpEarned} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Streamlined Timer Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                <SettingsIcon size={18} className="text-purple-400" /> Timer Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Timing Customization Only */}
            <div className="space-y-5">
              
              {/* Focus Time */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-2">Focus Time (minutes)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[15, 20, 25, 30, 45, 60].map((m) => (
                    <button 
                      key={m} 
                      type="button"
                      onClick={() => setDraftTimings(s => ({ ...s, focusMins: m }))} 
                      className={`px-3 py-1.5 text-xs rounded-xl border font-bold transition-colors ${draftTimings.focusMins === m ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'}`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Custom (5–180):</span>
                  <input 
                    type="number" 
                    min={5} 
                    max={180} 
                    value={draftTimings.focusMins} 
                    onChange={(e) => setDraftTimings(s => ({ ...s, focusMins: Math.max(5, Math.min(180, parseInt(e.target.value) || 25)) }))} 
                    className="w-20 bg-slate-950 border border-white/10 rounded-xl px-3 py-1 text-xs text-white font-bold text-center focus:outline-none focus:border-purple-500" 
                  />
                </div>
              </div>

              {/* Short Break */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">Short Break (minutes, 1–30)</label>
                <input 
                  type="number" 
                  min={1} 
                  max={30} 
                  value={draftTimings.shortBreakMins} 
                  onChange={(e) => setDraftTimings(s => ({ ...s, shortBreakMins: Math.max(1, Math.min(30, parseInt(e.target.value) || 5)) }))} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500" 
                />
              </div>

              {/* Long Break */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">Long Break (minutes, 5–60)</label>
                <input 
                  type="number" 
                  min={5} 
                  max={60} 
                  value={draftTimings.longBreakMins} 
                  onChange={(e) => setDraftTimings(s => ({ ...s, longBreakMins: Math.max(5, Math.min(60, parseInt(e.target.value) || 15)) }))} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500" 
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button 
                type="button"
                onClick={() => setShowSettingsModal(false)} 
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveSettings} 
                disabled={saveTimingsMutation.isPending}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-900/30"
              >
                {saveTimingsMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rewards Modal */}
      {showRewardModal && rewards && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl">
            <Award size={48} className="text-purple-400 mx-auto" />
            <h2 className="text-2xl font-bold font-serif text-white">Session Complete!</h2>
            <div className="bg-slate-950 p-4 rounded-2xl flex justify-around font-mono">
              <div><span className="text-[10px] text-slate-400 block">XP Earned</span><strong className="text-purple-400 text-lg">+{rewards.xpGained} XP</strong></div>
              <div><span className="text-[10px] text-slate-400 block">Coins Earned</span><strong className="text-amber-400 text-lg">+{rewards.coinsGained} GP</strong></div>
            </div>
            <button onClick={() => { setShowRewardModal(false); setRewards(null); }} className="w-full py-3 bg-purple-600 text-white font-bold rounded-2xl text-xs uppercase tracking-widest">
              Claim Rewards
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FocusPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading Focus Workspace...</div>}>
      <FocusContent />
    </Suspense>
  );
}
