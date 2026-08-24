"use client";

import { useEffect, useState } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useQuestStore } from "@/stores/quest-store";
import { useSession } from "next-auth/react";
import { subscribeToRecentEvents, getEventCountByType } from "@/lib/analytics-engine";
import { BarChart, Target, Swords, Trophy, Flame, TrendingUp, Sparkles } from "lucide-react";
import type { ActionLogEntry } from "@/types";
import { getAnalyticsExplanationAction } from "@/actions/ai-actions";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const user = session?.user as { uid: string; id?: string; email?: string };
  const { profile } = useCharacterStore();
  const { quests } = useQuestStore();
  
  const [recentEvents, setRecentEvents] = useState<ActionLogEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    questsCompleted: 0,
    bossHits: 0,
    streakCheckins: 0,
    levelsGained: 0,
  });

  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToRecentEvents(user.uid, setRecentEvents, 30);
    
    // Load weekly stats
    Promise.all([
      getEventCountByType(user.uid, "quest_completed", 7),
      getEventCountByType(user.uid, "boss_damage", 7),
      getEventCountByType(user.uid, "streak_checkin", 7),
      getEventCountByType(user.uid, "level_up", 7),
    ]).then(([qc, bh, sc, lg]) => {
      setWeeklyStats({
        questsCompleted: qc,
        bossHits: bh,
        streakCheckins: sc,
        levelsGained: lg,
      });
    });

    return () => unsub();
  }, [user]);

  const completedQuests = quests.filter(q => q.status === "completed").length;
  const activeQuests = quests.filter(q => q.status === "active").length;
  const completionRate = quests.length > 0 ? Math.round((completedQuests / quests.length) * 100) : 0;

  useEffect(() => {
    if (!user) return;
    
    const fetchExplanation = async () => {
      setAiLoading(true);
      try {
        const res = await getAnalyticsExplanationAction(weeklyStats, profile, completionRate);
        if (res.success) {
          setAiExplanation(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAiLoading(false);
      }
    };

    fetchExplanation();
  }, [weeklyStats, profile, completionRate, user]);

  const cards = [
    { label: "Quests Completed (7d)", value: weeklyStats.questsCompleted, icon: Target, color: "var(--primary)" },
    { label: "Boss Hits (7d)", value: weeklyStats.bossHits, icon: Swords, color: "var(--danger)" },
    { label: "Streak Check-ins (7d)", value: weeklyStats.streakCheckins, icon: Flame, color: "var(--xp-gold)" },
    { label: "Levels Gained (7d)", value: weeklyStats.levelsGained, icon: TrendingUp, color: "var(--success)" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-3">
          <BarChart className="text-cyan-400" size={32} /> Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Track your progression metrics and weekly performance.</p>
      </header>

      {/* Weekly Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rpg-panel rpg-panel-interactive rounded-2xl p-6 text-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundColor: card.color }} />
              <Icon size={28} className="mx-auto mb-3" style={{ color: card.color }} />
              <div className="text-3xl font-bold font-serif" style={{ color: card.color }}>
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground mt-2 uppercase tracking-widest font-bold">
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Strategic Analytics Card */}
      {(aiLoading || aiExplanation) && (
        <div className="rpg-panel rounded-2xl p-6 border border-cyan-500/25 bg-cyan-950/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-lg font-serif font-bold text-cyan-400 mb-3 flex items-center gap-2">
            <Sparkles className="text-cyan-400 animate-pulse" size={20} /> AI Strategic Review
          </h3>
          {aiLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-5/6" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-foreground/90 font-medium font-sans">
              {aiExplanation}
            </p>
          )}
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rpg-panel rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Character</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Level</span>
              <span className="font-bold">{profile?.level || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total XP</span>
              <span className="font-bold text-xp-gold">{(profile?.totalXP || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coins</span>
              <span className="font-bold text-coins">{(profile?.coins || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ascension</span>
              <span className="font-bold">{Math.max(profile?.prestige || 0, profile?.rebirths || 0)}</span>
            </div>
          </div>
        </div>

        <div className="rpg-panel rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Quests</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active</span>
              <span className="font-bold">{activeQuests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed (All Time)</span>
              <span className="font-bold text-success">{completedQuests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-bold">
                {quests.length > 0 ? Math.round((completedQuests / quests.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="rpg-panel rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Recent Activity</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto hide-scrollbar">
            {recentEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent events tracked yet.</p>
            ) : (
              recentEvents.slice(0, 10).map((ev, idx) => (
                <div key={idx} className="text-xs flex items-center gap-2 text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="truncate">{ev.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
