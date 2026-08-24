"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Flame, 
  Trophy, 
  Zap, 
  Plus, 
  Trash2, 
  Archive, 
  Play, 
  Pause, 
  Sparkles, 
  AlertCircle,
  Edit3,
  Calendar,
  Clock,
  Coins,
  Check,
  Undo2
} from "lucide-react";
import { soundEngine } from "@/lib/sound-engine";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getStreaksAction, 
  createStreakAction, 
  updateStreakAction, 
  deleteStreakAction, 
  toggleArchiveStreakAction,
  togglePauseStreakAction,
  checkInStreakAction,
  undoStreakCheckInAction,
  type HabitData
} from "@/actions/streak-actions";

const ICONS = ["🔥", "💧", "📚", "🏃‍♂️", "🧘", "💼", "🎨", "💰", "🛌", "🍎", "🧹", "🔌"];
const COLORS = [
  { name: "Red", value: "red", bg: "bg-red-500/10 hover:border-red-500/50", text: "text-red-400", border: "border-red-500/20", progressBg: "bg-red-500" },
  { name: "Blue", value: "blue", bg: "bg-blue-500/10 hover:border-blue-500/50", text: "text-blue-400", border: "border-blue-500/20", progressBg: "bg-blue-500" },
  { name: "Green", value: "green", bg: "bg-green-500/10 hover:border-green-500/50", text: "text-green-400", border: "border-green-500/20", progressBg: "bg-green-500" },
  { name: "Yellow", value: "yellow", bg: "bg-yellow-500/10 hover:border-yellow-500/50", text: "text-yellow-400", border: "border-yellow-500/20", progressBg: "bg-yellow-500" },
  { name: "Purple", value: "purple", bg: "bg-purple-500/10 hover:border-purple-500/50", text: "text-purple-400", border: "border-purple-500/20", progressBg: "bg-purple-500" },
  { name: "Orange", value: "orange", bg: "bg-orange-500/10 hover:border-orange-500/50", text: "text-orange-400", border: "border-orange-500/20", progressBg: "bg-orange-500" }
];

interface StreakHabit {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color: string;
  frequency: string;
  reminder?: string | null;
  xpReward?: number;
  coinReward?: number;
  lastCheckin: string | null | Date;
  createdAt: string | Date;
  totalCompletions: number;
  current: number;
  best: number;
  stat?: string;
  status?: string;
  isArchived: boolean;
  isPaused: boolean;
}

export default function StreaksPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"active" | "paused" | "archived">("active");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<StreakHabit | null>(null);


  // Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🔥");
  const [color, setColor] = useState("red");
  const [frequency, setFrequency] = useState("Daily");
  const [reminder, setReminder] = useState("");
  const [xpReward, setXpReward] = useState(20);
  const [coinReward, setCoinReward] = useState(5);

  // Fetch Habits
  const { data: response = { success: false, data: [] }, isLoading } = useQuery({
    queryKey: ["streaks"],
    queryFn: () => getStreaksAction()
  });

  const habits = response.success ? response.data : [];

  // Mutations
  const createStreak = useMutation({
    mutationFn: createStreakAction,
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["streaks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        closeModal();
      } else {
        alert(res.error);
      }
    }
  });

  const updateStreak = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HabitData }) => updateStreakAction(id, data),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["streaks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        closeModal();
      } else {
        alert(res.error);
      }
    }
  });

  const deleteStreak = useMutation({
    mutationFn: deleteStreakAction,
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["streaks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        alert(res.error);
      }
    }
  });

  const toggleArchive = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) => toggleArchiveStreakAction(id, archive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const togglePause = useMutation({
    mutationFn: ({ id, pause }: { id: string; pause: boolean }) => togglePauseStreakAction(id, pause),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const checkIn = useMutation({
    mutationFn: checkInStreakAction,
    onSuccess: (res) => {
      const response = res as {
        success: boolean;
        data?: {
          alreadyCheckedIn?: boolean;
          levelUp?: boolean;
        };
        error?: string;
      };
      if (response.success && response.data) {
        if (!response.data.alreadyCheckedIn) {
          soundEngine.playStreakCheckin();
          if (response.data.levelUp) {
            soundEngine.playLevelUp();
          }
          import("canvas-confetti").then((m) => m.default({ particleCount: 30, spread: 40 }));
        }
        queryClient.invalidateQueries({ queryKey: ["streaks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        alert(response.error);
      }
    }
  });

  const undoCheckIn = useMutation({
    mutationFn: undoStreakCheckInAction,
    onSuccess: (res) => {
      const response = res as {
        success: boolean;
        error?: string;
      };
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["streaks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        alert(response.error);
      }
    }
  });

  const openAddModal = () => {
    setEditingHabit(null);
    setName("");
    setDescription("");
    setIcon("🔥");
    setColor("red");
    setFrequency("Daily");
    setReminder("");
    setXpReward(20);
    setCoinReward(5);
    setIsModalOpen(true);
  };

  const openEditModal = (habit: StreakHabit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setDescription(habit.description || "");
    setIcon(habit.icon || "🔥");
    setColor(habit.color || "red");
    setFrequency(habit.frequency || "Daily");
    setReminder(habit.reminder || "");
    setXpReward(habit.xpReward ?? 20);
    setCoinReward(habit.coinReward ?? 5);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const habitData = {
      name,
      description: description || null,
      icon,
      color,
      frequency,
      reminder: reminder || null,
      xpReward,
      coinReward
    };

    if (editingHabit) {
      updateStreak.mutate({ id: editingHabit.id, data: habitData });
    } else {
      createStreak.mutate(habitData);
    }
  };

  // Filter based on tabs
  const filteredHabits = habits.filter((habit: StreakHabit) => {
    if (activeTab === "archived") return habit.isArchived;
    if (activeTab === "paused") return habit.isPaused && !habit.isArchived;
    return !habit.isPaused && !habit.isArchived;
  });

  // Calculate completion percentage
  const getCompletionPercentage = (createdAt: string | Date, totalCompletions: number, freq: string) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    let possibleCompletions = 1;
    if (freq === "Daily") {
      possibleCompletions = diffDays;
    } else if (freq === "Weekly") {
      possibleCompletions = Math.max(1, Math.ceil(diffDays / 7));
    } else if (freq === "Monthly") {
      possibleCompletions = Math.max(1, Math.ceil(diffDays / 30));
    }
    
    return Math.min(100, Math.round((totalCompletions / possibleCompletions) * 100));
  };

  const getColorConfig = (colorVal: string) => {
    return COLORS.find(c => c.value === colorVal) || COLORS[0];
  };

  const isCheckedInForPeriod = (lastCheckinDate: string | Date | null, freq: string) => {
    if (!lastCheckinDate) return false;
    const now = new Date();
    const lastCheckin = new Date(lastCheckinDate);

    if (freq === "Daily") {
      return (
        lastCheckin.getDate() === now.getDate() &&
        lastCheckin.getMonth() === now.getMonth() &&
        lastCheckin.getFullYear() === now.getFullYear()
      );
    } else if (freq === "Weekly") {
      const startOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
      };
      return startOfWeek(now) === startOfWeek(lastCheckin);
    } else if (freq === "Monthly") {
      return (
        lastCheckin.getMonth() === now.getMonth() &&
        lastCheckin.getFullYear() === now.getFullYear()
      );
    }
    return false;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 flex items-center gap-3">
            <Flame className="text-red-500 fill-red-500/20" size={32} /> Habits & Streaks Board
          </h1>
          <p className="text-muted-foreground mt-1">Develop good habits. Paused habits protect your streaks; missing active ones resets them.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all hover:scale-[1.02]"
        >
          <Plus size={18} /> Start Habit
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["active", "paused", "archived"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-cinzel text-sm font-bold border-b-2 transition-all uppercase tracking-wider ${
              activeTab === tab 
                ? "border-red-500 text-red-500" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab} Habits
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rpg-panel animate-pulse rounded-2xl h-64 w-full" />
          ))}
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="rpg-panel rounded-2xl p-12 text-center text-muted-foreground border-dashed border-2 border-white/10 flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/45 mb-4" />
          <h3 className="text-lg font-bold text-white font-serif mb-1">No Habits in Category</h3>
          <p className="text-sm">Tap &ldquo;Start Habit&rdquo; to build up your discipline board.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHabits.map((habit: StreakHabit) => {
            const config = getColorConfig(habit.color);
            const isCheckedIn = isCheckedInForPeriod(habit.lastCheckin, habit.frequency) && habit.totalCompletions > 0;
            const completionPct = getCompletionPercentage(habit.createdAt, habit.totalCompletions, habit.frequency);
            const multiplier = Math.min(2.0, 1.0 + Math.floor(habit.current / 7) * 0.1).toFixed(2);

            return (
              <div 
                key={habit.id} 
                className={`rpg-panel rpg-panel-interactive rounded-2xl p-6 border ${config.border} flex flex-col justify-between relative group hover:shadow-lg transition-all`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{habit.icon}</span>
                      <div>
                        <h3 className="font-bold text-lg leading-tight line-clamp-1">{habit.name}</h3>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{habit.frequency}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(habit)}
                        className="p-1 text-muted-foreground hover:text-primary rounded"
                        title="Edit Habit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Delete "${habit.name}"? This action cannot be undone.`)) {
                            deleteStreak.mutate(habit.id);
                          }
                        }}
                        className="p-1 text-muted-foreground hover:text-red-500 rounded"
                        title="Delete Habit"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {habit.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-normal">{habit.description}</p>
                  )}

                  <div className="flex items-center gap-4 mb-5 pt-2">
                    <Flame size={44} className={isCheckedIn ? "text-red-500 fill-red-500/10 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse" : "text-muted-foreground/40"} />
                    <div>
                      <div className="text-4xl font-cinzel font-bold text-foreground">{habit.current}</div>
                      <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Current Streak</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/50 text-xs">
                  {/* Progress completion % */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                      <span>Consistency Target</span>
                      <span>{completionPct}% ({habit.totalCompletions} total)</span>
                    </div>
                    <div className="w-full h-1.5 bg-background border border-border rounded-full overflow-hidden">
                      <div className={`h-full ${config.progressBg} rounded-full transition-all duration-300`} style={{ width: `${completionPct}%` }} />
                    </div>
                  </div>

                  {/* Rewards and reminders */}
                  <div className="flex justify-between items-center text-muted-foreground font-medium">
                    {habit.reminder && (
                      <span className="flex items-center gap-1"><Clock size={12} /> {habit.reminder}</span>
                    )}
                    <span className="flex items-center gap-1.5 ml-auto text-purple-400"><Sparkles size={12} /> +{habit.xpReward} XP</span>
                    <span className="flex items-center gap-1.5 ml-3 text-yellow-450"><Coins size={12} /> +{habit.coinReward} Gold</span>
                  </div>

                  {/* Actions (Check in, Pause, Archive) */}
                  <div className="flex gap-2 pt-1.5 justify-between items-center">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => togglePause.mutate({ id: habit.id, pause: !habit.isPaused })}
                        className="p-2 rounded-lg bg-background border border-border hover:text-primary transition-colors"
                        title={habit.isPaused ? "Resume Habit" : "Pause Habit"}
                      >
                        {habit.isPaused ? <Play size={12} className="fill-current" /> : <Pause size={12} />}
                      </button>
                      <button
                        onClick={() => toggleArchive.mutate({ id: habit.id, archive: !habit.isArchived })}
                        className="p-2 rounded-lg bg-background border border-border hover:text-primary transition-colors"
                        title={habit.isArchived ? "Restore Habit" : "Archive Habit"}
                      >
                        <Archive size={12} />
                      </button>
                    </div>

                    {activeTab === "active" && (
                      isCheckedIn ? (
                        <button
                          onClick={() => undoCheckIn.mutate(habit.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/30 bg-success/10 hover:bg-red-500/10 hover:border-red-500/30 text-success hover:text-red-500 transition-all font-bold group/undo"
                          title="Undo today's check-in"
                        >
                          <Check size={12} className="group-hover/undo:hidden" />
                          <Undo2 size={12} className="hidden group-hover/undo:block animate-in spin-in-12" />
                          <span className="group-hover/undo:hidden">Done ✓</span>
                          <span className="hidden group-hover/undo:inline">Undo</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => checkIn.mutate(habit.id)}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors shadow-sm hover:shadow"
                        >
                          Check In
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Start/Edit Habit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="rpg-panel rounded-2xl max-w-md w-full p-6 space-y-4 relative border border-white/10 shadow-2xl animate-in scale-in duration-200">
            <h2 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300">
              {editingHabit ? "Edit Habit Details" : "Start New Habit"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Habit Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Morning Meditation"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (Optional)</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the routine for this habit?"
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              {/* Icon selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose Icon</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg transition-all ${
                        icon === i ? "border-red-500 bg-red-500/10 scale-110" : "border-border bg-background hover:bg-white/5"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Theme Color</label>
                <div className="flex gap-2 pt-1">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        color === c.value 
                          ? "border-white scale-110 shadow-lg" 
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frequency</label>
                  <select 
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reminder Time</label>
                  <input 
                    type="time" 
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">XP Reward</label>
                  <input 
                    type="number" 
                    min={1}
                    max={100}
                    value={xpReward}
                    onChange={(e) => setXpReward(parseInt(e.target.value) || 20)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gold Reward</label>
                  <input 
                    type="number" 
                    min={1}
                    max={50}
                    value={coinReward}
                    onChange={(e) => setCoinReward(parseInt(e.target.value) || 5)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 justify-end">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createStreak.isPending || updateStreak.isPending}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg disabled:opacity-50"
                >
                  {createStreak.isPending || updateStreak.isPending ? "Saving..." : editingHabit ? "Save Changes" : "Start Habit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
