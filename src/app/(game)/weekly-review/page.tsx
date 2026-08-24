"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getChroniclesAction, clearChroniclesAction } from "@/actions/chronicle-actions";
import { 
  Scroll, 
  Search, 
  Filter, 
  CheckCircle2, 
  Award,
  Swords,
  ShoppingBag,
  Heart,
  BookOpen,
  ArrowUpCircle,
  Home,
  Gift,
  Timer,
  RefreshCw,
  Brain,
  Shield,
  Trash2,
  Calendar,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";

function getChronicleMeta(type: string) {
  switch (type) {
    case "BRAIN":
      return { icon: <Brain size={18} className="text-[#38BDF8]" />, color: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300", badge: "Brain Lab" };
    case "TASK":
    case "QUEST":
      return { icon: <CheckCircle2 size={18} className="text-[#2ECC71]" />, color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", badge: "Task" };
    case "BOSS":
    case "BATTLE":
      return { icon: <Swords size={18} className="text-[#6D5EF8]" />, color: "border-purple-500/30 bg-purple-500/10 text-purple-300", badge: "Boss Arena" };
    case "RESILIENCE":
      return { icon: <Shield size={18} className="text-[#F4C542]" />, color: "border-amber-500/30 bg-amber-500/10 text-amber-300", badge: "Resilience" };
    case "ACHIEVEMENT":
      return { icon: <Award size={18} className="text-[#F4C542]" />, color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300", badge: "Achievement" };
    case "LEVEL_UP":
      return { icon: <ArrowUpCircle size={18} className="text-[#F4C542] animate-pulse" />, color: "border-amber-400/40 bg-amber-400/10 text-amber-300", badge: "Level Up" };
    case "PURCHASE":
      return { icon: <ShoppingBag size={18} className="text-[#38BDF8]" />, color: "border-blue-500/30 bg-blue-500/10 text-blue-300", badge: "Purchase" };
    case "PET":
      return { icon: <Heart size={18} className="text-pink-400" />, color: "border-pink-500/30 bg-pink-500/10 text-pink-300", badge: "Pet" };
    case "MASTERY":
    case "SKILL":
      return { icon: <BookOpen size={18} className="text-indigo-400" />, color: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300", badge: "Mastery" };
    case "VILLAGE":
    case "WORLD":
      return { icon: <Home size={18} className="text-[#38BDF8]" />, color: "border-sky-500/30 bg-sky-500/10 text-sky-300", badge: "World Map" };
    case "POMODORO":
    case "STOPWATCH":
      return { icon: <Timer size={18} className="text-[#E74C3C]" />, color: "border-rose-500/30 bg-rose-500/10 text-rose-300", badge: "Focus" };
    case "BACKUP":
      return { icon: <Gift size={18} className="text-emerald-400" />, color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300", badge: "Backup" };
    default:
      return { icon: <Scroll size={18} className="text-slate-400" />, color: "border-slate-700 bg-slate-800/40 text-slate-300", badge: "System" };
  }
}

export default function ChroniclesPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [page, setPage] = useState(1);
  const [refreshMsg, setRefreshMsg] = useState("");
  const limit = 15;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["chronicles", filterType, search, dateRange, page],
    queryFn: async () => {
      const res = await getChroniclesAction({
        type: filterType,
        search,
        dateRange,
        page,
        limit
      });
      if (res.success) return res.data;
      throw new Error(res.error || "Failed to fetch chronicles");
    },
    enabled: !!userId,
    placeholderData: (prev) => prev,
    refetchInterval: 5000
  });

  useEffect(() => {
    setPage(1);
  }, [search, filterType, dateRange]);

  const items = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const totalItems = data?.total || 0;

  const handleRefresh = async () => {
    await refetch();
    setRefreshMsg("Chronicles synced!");
    setTimeout(() => setRefreshMsg(""), 3000);
  };

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear your Chronicle journal history?")) {
      await clearChroniclesAction();
      await refetch();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 max-w-5xl mx-auto"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-[#6D5EF8]/20 border border-[#6D5EF8]/40 text-[#6D5EF8] rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <Sparkles size={12} /> Book of Legends
          </span>
          <h1 className="text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[#6D5EF8] drop-shadow-md">
            Kingdom Chronicles & Event Journal
          </h1>
          <p className="text-slate-400 text-sm">
            Your immutable life journal inside Ascendra. Every task, battle, brain training session, and achievement is automatically recorded.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshMsg && (
            <span className="text-xs text-[#6D5EF8] font-bold animate-pulse">{refreshMsg}</span>
          )}
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all"
          >
            <RefreshCw size={14} className="animate-spin-slow" /> Refresh
          </button>
          <button 
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-rose-900/60 transition-all"
            title="Clear History"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </header>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search journal entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#6D5EF8] transition-all placeholder:text-slate-500"
          />
        </div>

        <div className="relative flex items-center gap-2">
          <Filter className="text-slate-400 shrink-0" size={16} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#6D5EF8] transition-all appearance-none"
          >
            <option value="ALL">All Categories</option>
            <option value="TASK">Tasks & Quests</option>
            <option value="BRAIN">Brain Evolution Lab</option>
            <option value="BOSS">Boss Arena & Battles</option>
            <option value="RESILIENCE">Resilience & Distractions</option>
            <option value="ACHIEVEMENT">Achievements</option>
            <option value="LEVEL_UP">Level Ups</option>
            <option value="WORLD">World Map & Village</option>
            <option value="MASTERY">Mastery & Skills</option>
            <option value="PURCHASE">Purchases & Store</option>
            <option value="PET">Pet Companions</option>
            <option value="POMODORO">Focus Sessions</option>
            <option value="BACKUP">Backups & System</option>
          </select>
        </div>

        <div className="relative flex items-center gap-2">
          <Calendar className="text-slate-400 shrink-0" size={16} />
          <select
            value={dateRange}
            onChange={(e: any) => setDateRange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#6D5EF8] transition-all appearance-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#6D5EF8] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(109,94,248,0.5)]" />
        </div>
      ) : items.length === 0 ? (
        <GlassSurface glow="purple" className="p-16 text-center flex flex-col items-center justify-center">
          <Scroll className="w-16 h-16 text-slate-600 mb-3" />
          <p className="text-base font-serif font-bold text-white">No Chronicles Logged</p>
          <p className="text-xs text-slate-400 mt-1">Complete tasks, train in the Brain Lab, or battle bosses to record your first chronicle entries.</p>
        </GlassSurface>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-slate-400 font-mono px-1 flex justify-between">
            <span>Showing {items.length} of {totalItems} total events</span>
            <span>Page {page} of {totalPages || 1}</span>
          </div>

          {items.map((item: any) => {
            const meta = getChronicleMeta(item.type);
            return (
              <SpotlightCard key={item.id} className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                  {meta.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold font-serif text-white">{item.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${meta.color}`}>
                        {meta.badge}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{item.content}</p>
                </div>
              </SpotlightCard>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 bg-slate-900 border border-white/10 text-xs font-bold uppercase rounded-xl disabled:opacity-40 hover:bg-slate-800 transition-all text-white"
              >
                Previous
              </button>
              <span className="text-xs font-mono text-slate-400">Page {page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-slate-900 border border-white/10 text-xs font-bold uppercase rounded-xl disabled:opacity-40 hover:bg-slate-800 transition-all text-white"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
