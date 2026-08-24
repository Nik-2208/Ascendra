"use client";

import { useCharacterStore } from "@/stores/character-store";
import { ShieldAlert, Users, Database, Activity, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboardPage() {
  const { profile } = useCharacterStore();
  const router = useRouter();

  useEffect(() => {
    // If not admin, kick them out
    if (profile && !profile.isAdmin) {
      router.push("/");
    }
  }, [profile, router]);

  if (!profile?.isAdmin) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="mb-8 border-b border-danger/30 pb-4">
        <h1 className="text-3xl font-cinzel font-bold text-danger flex items-center gap-3">
          <ShieldAlert size={32} /> System Admin Console
        </h1>
        <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest">
          Restricted Access Area. With great power comes great responsibility.
        </p>
      </header>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rpg-panel rounded-xl p-4 border-l-4 border-emerald-500 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-widest font-bold mb-2">
            <Activity size={16} className="text-emerald-500" /> Server Status
          </div>
          <div className="text-2xl font-bold text-emerald-500">Online</div>
        </div>
        
        <div className="rpg-panel rounded-xl p-4 border-l-4 border-purple-500 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-widest font-bold mb-2">
            <Users size={16} className="text-purple-500" /> Active Users (24h)
          </div>
          <div className="text-2xl font-bold">1</div>
        </div>

        <div className="rpg-panel rounded-xl p-4 border-l-4 border-yellow-500 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-widest font-bold mb-2">
            <Database size={16} className="text-yellow-500" /> Firestore Reads
          </div>
          <div className="text-2xl font-bold">~1.2k</div>
        </div>

        <div className="rpg-panel rounded-xl p-4 border-l-4 border-red-500 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-widest font-bold mb-2">
            <AlertTriangle size={16} className="text-red-500" /> Error Rate
          </div>
          <div className="text-2xl font-bold">0.00%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Global Controls */}
        <div className="rpg-panel rounded-2xl p-6">
          <h2 className="text-xl font-serif font-bold mb-6 text-red-400 border-b border-white/10 pb-2">Global Overrides</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-border">
              <div>
                <p className="font-bold">Double XP Weekend</p>
                <p className="text-xs text-muted-foreground">Applies 2x multiplier globally</p>
              </div>
              <button className="px-4 py-1 text-sm rounded bg-border text-muted-foreground cursor-not-allowed">Disabled</button>
            </div>

            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-border">
              <div>
                <p className="font-bold">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Locks out non-admin users</p>
              </div>
              <button className="px-4 py-1 text-sm rounded bg-border text-muted-foreground cursor-not-allowed">Disabled</button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-border">
              <div>
                <p className="font-bold">Force Season Refresh</p>
                <p className="text-xs text-muted-foreground">Recalculates active season</p>
              </div>
              <button className="px-4 py-1 text-sm rounded border border-primary/50 text-primary hover:bg-primary/10">Execute</button>
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="rpg-panel rounded-2xl p-6">
          <h2 className="text-xl font-serif font-bold mb-6 border-b border-white/10 pb-2">System Audit Log</h2>
          
          <div className="space-y-3 font-mono text-xs">
            <div className="flex gap-4 opacity-50">
              <span>11:24:03</span>
              <span className="text-primary">[AUTH]</span>
              <span>Admin login authenticated</span>
            </div>
            <div className="flex gap-4 opacity-50">
              <span>10:15:00</span>
              <span className="text-success">[SYSTEM]</span>
              <span>Daily backup completed successfully</span>
            </div>
            <div className="flex gap-4 opacity-50">
              <span>09:00:00</span>
              <span className="text-warning">[CRON]</span>
              <span>Daily quests regenerated for all users</span>
            </div>
            <div className="flex gap-4 opacity-50">
              <span>00:00:01</span>
              <span className="text-info">[CRON]</span>
              <span>Streak check-in window closed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
