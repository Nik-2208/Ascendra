"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { subscribeToRecentEvents } from "@/lib/analytics-engine";
import type { ActionLogEntry } from "@/types";
import { formatRelative } from "date-fns";
import { Trophy, Swords, Shield, Coins, Sparkles, Scroll } from "lucide-react";

export function ActionLogWidget() {
  const { data: session } = useSession();
  const user = session?.user;
  const [logs, setLogs] = useState<ActionLogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToRecentEvents(user.id!, (newLogs: unknown[]) => {
      setLogs(newLogs as ActionLogEntry[]);
    });
    return () => unsub();
  }, [user]);

  // Auto-scroll to bottom when new logs arrive (since we display them chronologically, wait, firestore gives them desc)
  // We fetch orderBy('createdAt', 'desc') so logs[0] is the newest. We should reverse it for display.
  const displayLogs = [...logs].reverse();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 h-64 rpg-panel rounded-lg border border-white/10 shadow-2xl flex flex-col overflow-hidden z-50 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
      <div className="bg-black/60 px-3 py-1 border-b border-border/30 flex items-center justify-between pointer-events-auto">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action Log</span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 pointer-events-auto custom-scrollbar"
      >
        {displayLogs.map(log => {
          let Icon = Scroll;
          let colorClass = "text-muted-foreground";

          switch (log.type) {
            case "quest_completed":
              Icon = Swords;
              colorClass = "text-success";
              break;
            case "boss_attack":
              Icon = Sparkles;
              colorClass = "text-danger";
              break;
            case "item_bought":
              Icon = Coins;
              colorClass = "text-xp-gold";
              break;
            case "level_up":
              Icon = Trophy;
              colorClass = "text-primary";
              break;
            case "streak_checked":
              Icon = Shield;
              colorClass = "text-info";
              break;
          }

          return (
            <div key={log.id} className="text-xs flex gap-2 animate-in fade-in slide-in-from-left-2">
              <span className="text-muted-foreground/50 shrink-0">
                [{log.createdAt ? new Date(log.createdAt as string | number | Date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}]
              </span>
              <span className={colorClass}>
                <Icon size={12} className="inline mr-1 -mt-0.5" />
                {log.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
