"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, CheckSquare, Trash2, ShieldAlert, Sparkles, Swords, Award, Inbox } from "lucide-react";
import { 
  getNotificationsAction, 
  markNotificationReadAction, 
  markAllNotificationsReadAction, 
  deleteNotificationAction, 
  clearAllNotificationsAction 
} from "@/actions/game-actions";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!userId) return [];
      return await getNotificationsAction(userId);
    },
    enabled: !!userId,
    refetchInterval: 5000, // Poll every 5s for real-time updates
  });

  const notifsList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notifsList.filter((n: any) => !n.read).length;

  // 2. Mutations
  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationReadAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("No user session");
      return markAllNotificationsReadAction(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotificationAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("No user session");
      return clearAllNotificationsAction(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  // 3. Close on ESC and Click Outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest(".notification-trigger")) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden"; // Disable background scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filteredNotifs = notifsList.filter((n: any) => {
    if (filter === "UNREAD") return !n.read;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "LEVEL_UP":
        return <Award className="w-4 h-4 text-[#F4C542]" />;
      case "XP_GAIN":
        return <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />;
      case "BATTLE":
        return <Swords className="w-4 h-4 text-rose-500" />;
      case "SYSTEM":
        return <ShieldAlert className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <>
      {/* Bell Button Trigger */}
      <motion.button 
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="notification-trigger w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-white/10 hover:border-white/20 flex items-center justify-center transition-all relative z-40 shadow-md"
      >
        <Bell className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-gradient-to-r from-red-500 to-rose-600 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-slate-900 flex items-center justify-center text-[9px] font-black text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      {mounted && typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isOpen && (
                <>
                  {/* Dark opaque overlay backdrop */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 bg-black z-[999998]"
                  />

                  {/* Notification Center Panel */}
                  <motion.div 
                    ref={panelRef}
                    initial={{ x: "100%", opacity: 0.5 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0.5 }}
                    transition={{ type: "spring", damping: 26, stiffness: 220 }}
                    className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-slate-950 text-slate-100 border-l border-slate-800 z-[999999] flex flex-col shadow-2xl overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/85">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-sm font-bold uppercase tracking-widest font-serif text-white flex items-center gap-2">
                          Notifications <span className="text-xs font-mono text-slate-400 font-normal">({unreadCount} new)</span>
                        </h2>
                      </div>
                      <button 
                        onClick={() => setIsOpen(false)} 
                        className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Toolbar Controls */}
                    <div className="p-4 bg-slate-900/95 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      {/* Filters */}
                      <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
                        <button 
                          onClick={() => setFilter("ALL")}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md font-medium tracking-wide transition-all ${
                            filter === "ALL" 
                              ? "bg-slate-800 text-white shadow-sm font-bold" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          All ({notifsList.length})
                        </button>
                        <button 
                          onClick={() => setFilter("UNREAD")}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md font-medium tracking-wide transition-all ${
                            filter === "UNREAD" 
                              ? "bg-slate-800 text-white shadow-sm font-bold" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Unread ({unreadCount})
                        </button>
                      </div>

                      {/* Bulk Actions */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={markAllReadMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-850 hover:border-slate-700 bg-slate-950 text-slate-300 hover:text-white font-bold transition-all disabled:opacity-40"
                            title="Mark all as read"
                          >
                            <CheckSquare size={13} />
                            <span>Read All</span>
                          </button>
                        )}
                        {notifsList.length > 0 && (
                          <button
                            onClick={() => {
                              if (confirm("Clear all notifications permanently?")) {
                                clearAllMutation.mutate();
                              }
                            }}
                            disabled={clearAllMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-950/50 hover:border-red-900 bg-red-950/20 text-red-400 hover:text-red-300 font-bold transition-all disabled:opacity-40"
                            title="Clear all notifications"
                          >
                            <Trash2 size={13} />
                            <span>Clear</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notifications Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                      {filteredNotifs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                          <Inbox className="w-12 h-12 mb-3 text-slate-700" />
                          <p className="font-serif font-bold text-sm text-slate-400">Clear Skies</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">No notifications matching your filter criteria.</p>
                        </div>
                      ) : (
                        filteredNotifs.map((notif: any) => (
                          <motion.div 
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`group relative p-4 rounded-xl border transition-all ${
                              notif.read 
                                ? "bg-slate-900/40 border-slate-900/60 text-slate-400" 
                                : "bg-slate-900 border-slate-800 text-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.15)] border-l-2 border-l-indigo-500"
                            }`}
                          >
                            {/* Read indicator & actions */}
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800">
                                  {getIcon(notif.type)}
                                </div>
                                <span className={`text-xs font-serif font-black tracking-wide ${notif.read ? "text-slate-400" : "text-white"}`}>
                                  {notif.title}
                                </span>
                              </div>

                              {/* Hover Actions */}
                              <div className="flex items-center gap-1.5">
                                {!notif.read && (
                                  <button 
                                    onClick={() => markReadMutation.mutate(notif.id)}
                                    className="text-slate-400 hover:text-emerald-400 p-1 rounded-md hover:bg-slate-950 transition-colors"
                                    title="Mark as Read"
                                  >
                                    <Check size={14} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteMutation.mutate(notif.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-slate-950 transition-colors"
                                  title="Delete notification"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Body Message */}
                            <p className={`text-xs leading-relaxed pl-9 ${notif.read ? "text-slate-500" : "text-slate-300"}`}>
                              {notif.body}
                            </p>

                            {/* Timestamp */}
                            <div className="text-[9px] text-slate-600 pl-9 mt-2 tracking-widest font-mono">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(notif.createdAt).toLocaleDateString()}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
