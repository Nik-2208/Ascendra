"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboardData } from "@/actions/dashboard-actions";
import { 
  getTasksAction, 
  createTaskAction, 
  updateTaskAction, 
  deleteTaskAction, 
  completeTaskAction,
  type TaskData
} from "@/actions/task-actions";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  Calendar,
  Play,
  ScrollText,
  Brain,
  Wand2,
  X,
  Swords,
  Timer,
  Sparkles,
  Coins,
  ShieldAlert,
  Map as MapIcon
} from "lucide-react";
import { soundEngine } from "@/lib/sound-engine";
import { estimateTaskDuration, autoOptimizeSchedule } from "@/lib/local-ai";
import { motion, AnimatePresence } from "framer-motion";

interface ScheduleTask {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | Date | null;
  dueTime?: string | null;
  priority: string;
  category?: string | null;
  repeat?: string | null;
  notes?: string | null;
  completed?: boolean;
}


import { useSession } from "next-auth/react";

export default function QuestBoardPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });
  const characterLevel = dashboard?.profile?.level || 1;

  // View States
  const [activeTab, setActiveTab] = useState<"bounties" | "focus">("bounties");
  const [searchQuery, setSearchQuery] = useState("");

  // Undo Stack
  const [lastDeletedTask, setLastDeletedTask] = useState<ScheduleTask | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [category, setCategory] = useState("General");

  // Focus Mode Removed (Now routes to Pomodoro 2.0)

  const [nlpInput, setNlpInput] = useState("");

  const { data: rawTasks = [], isLoading } = useQuery<ScheduleTask[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await getTasksAction();
      if (res.success) return res.data as unknown as ScheduleTask[];
      return [];
    }
  });

  // Focus timer logic removed (Moved to /focus)

  const createTask = useMutation({
    mutationFn: (data: TaskData) => createTaskAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskData }) => updateTaskAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const completeTask = useMutation({
    mutationFn: (id: string) => completeTaskAction(id, true),
    onSuccess: (_, taskId) => {
      soundEngine.playQuestComplete();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["character"] });
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["activeQuests"] });
      import("@/lib/game-event-bus").then((m) => {
        m.dispatchGameEvent("QUEST_COMPLETED", { questId: `TASK_COMPLETED:${taskId}`, userId: session?.user?.id || "" });
      });
    }
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => deleteTaskAction(id),
    onSuccess: (_, deletedId) => {
      const tasks = Array.isArray(rawTasks) ? rawTasks : [];
      const task = tasks.find(t => t.id === deletedId);
      if (task) setLastDeletedTask(task);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const handleNlpAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpInput.trim()) return;
    const lower = nlpInput.toLowerCase();
    let parsedPriority = "Medium";
    if (lower.includes("boss") || lower.includes("urgent")) parsedPriority = "High";
    if (lower.includes("scout")) parsedPriority = "Low";

    createTask.mutate({
      title: nlpInput,
      description: "Auto-generated quest from the Seer.",
      dueDate: new Date(),
      dueTime: "12:00 PM",
      priority: parsedPriority,
      category: "General",
      repeat: "None",
      notes: ""
    });
    setNlpInput("");
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("Medium");
    setCategory("General");
    setEditingTask(null);
  };

  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const filteredTasks = tasks.filter(task => {
    if (task.completed) return false;
    return task.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getRank = (priority: string) => {
    if (priority === "High") return { label: "S-Rank", color: "text-red-400 border-red-500/30 bg-red-500/10" };
    if (priority === "Low") return { label: "C-Rank", color: "text-green-400 border-green-500/30 bg-green-500/10" };
    return { label: "A-Rank", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-md">
            Quest Board
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Accept bounties and embark on campaigns to earn glory.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="rpg-btn-primary text-xs px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={14} /> Post Bounty
          </button>
        </div>
      </header>

      {/* Views Navigation */}
      <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar gap-2 pb-2">
        {[
          { id: "bounties", icon: Swords, label: "Daily Bounties" },
          { id: "focus", icon: Timer, label: "Meditation Chamber" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.id === "focus" ? router.push("/focus") : setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest font-serif flex items-center gap-2 rounded-t-lg transition-all ${
              activeTab === tab.id ? "bg-purple-500/20 text-purple-300 border-b-2 border-purple-500" : "bg-black/20 text-muted-foreground hover:bg-white/5 hover:text-white"
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleNlpAdd} className="flex gap-3 max-w-xl">
          <input 
            type="text" 
            value={nlpInput}
            onChange={(e) => setNlpInput(e.target.value)}
            placeholder="Consult the Seer (e.g. 'Defeat the laundry boss today')" 
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 text-white shadow-inner"
          />
          <button 
            type="submit"
            className="bg-purple-900/40 hover:bg-purple-800/40 border border-purple-500/50 px-4 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors text-purple-300"
          >
            <Wand2 size={14} /> Invoke
          </button>
      </form>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === "bounties" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="rpg-panel rounded-2xl p-12 text-center border-dashed border-2 border-white/10">
                <ShieldAlert className="mx-auto text-muted-foreground/30 mb-3" size={40} />
                <h3 className="text-lg font-serif font-bold text-white">No Active Bounties</h3>
                <p className="text-xs text-muted-foreground mt-1">The realm is safe for now.</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredTasks.map(task => {
                  const rank = getRank(task.priority);
                  return (
                    <motion.div 
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`rpg-panel rpg-panel-interactive p-4 rounded-xl flex items-center justify-between group ${
                        task.completed ? "opacity-50 grayscale" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <button 
                          onClick={() => completeTask.mutate(task.id)}
                          disabled={task.completed}
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shadow-inner border-white/20 hover:border-green-400 bg-black/40 text-transparent hover:text-green-400"
                        >
                          {task.completed ? <CheckCircle className="text-green-400 w-4 h-4" /> : <Swords className="w-4 h-4" />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm border ${rank.color}`}>
                              {rank.label}
                            </span>
                            <h4 className={`text-base font-bold font-serif text-white group-hover:text-purple-300 transition-colors ${task.completed ? "line-through" : ""}`}>
                              {task.title}
                            </h4>
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mt-1 italic">"{task.description}"</p>}
                          
                          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest mt-2 border-t border-white/5 pt-2">
                            <span className="text-purple-400 flex items-center gap-1"><Sparkles size={10}/> +50 XP</span>
                            <span className="text-yellow-400 flex items-center gap-1"><Coins size={10}/> +25 GP</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-col">
                        <button 
                          onClick={() => router.push('/focus?taskId=' + task.id)}
                          className="p-1.5 hover:bg-white/10 rounded text-blue-400 transition-all"
                          title="Enter Meditation"
                        >
                          <Play size={14} />
                        </button>
                        <button 
                          onClick={() => deleteTask.mutate(task.id)}
                          className="p-1.5 hover:bg-white/10 rounded text-muted-foreground hover:text-red-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          <div className="space-y-4">
            <div className="rpg-panel p-5 rounded-xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2 font-serif">
                <Brain size={14} /> Grandmaster's Advice
              </h3>
              <p className="text-sm font-serif text-white/90 leading-relaxed italic relative z-10">
                "Complete the highest rank bounties first. A hero's energy wanes as the sun sets."
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rpg-panel w-full max-w-md p-6 rounded-2xl relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-purple-500/30">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-lg font-bold font-serif text-white mb-4 uppercase tracking-widest">
              {editingTask ? "Amend Bounty" : "Post Bounty"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Target Name</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white mt-1 shadow-inner"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Lore / Intel</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white mt-1 shadow-inner resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Threat Level</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white mt-1 shadow-inner"
                >
                  <option value="Low">C-Rank (Low)</option>
                  <option value="Medium">A-Rank (Medium)</option>
                  <option value="High">S-Rank (High/Boss)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-2">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors text-muted-foreground"
                >
                  Flee
                </button>
                <button 
                  onClick={() => {
                    createTask.mutate({
                      title, description, dueDate: new Date(), dueTime: "", priority, category, repeat: "None", notes: ""
                    });
                  }}
                  className="rpg-btn-primary px-6 py-2 rounded-lg text-xs"
                >
                  Post to Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
