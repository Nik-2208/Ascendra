"use client";

import { useState, useRef } from "react";
import {
  Settings as SettingsIcon,
  LogOut,
  Volume2,
  VolumeX,
  Music,
  Sparkles,
  Download,
  Upload,
  Check,
  Sun,
  Moon,
  Laptop
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useUIStore } from "@/stores/ui-store";
import { soundEngine } from "@/lib/sound-engine";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, type ThemeMode } from "@/components/providers/theme-provider";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { AscendraLogo } from "@/components/ui/ascendra-logo";
import { CreatorCredits } from "@/components/ui/creator-credits";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ui = useUIStore();
  const { theme, setTheme } = useTheme();

  const handleToggleSound = () => {
    ui.toggleSound();
    soundEngine.toggleSound();
  };

  const handleExportData = async () => {
    try {
      if (!session?.user?.id) return;
      const { exportBackupAction } = await import("@/actions/game-actions");
      const res = await exportBackupAction(session.user.id);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Export failed");
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const filename = `ASCENDRA_Backup_${year}-${month}-${day}_${hours}-${minutes}.json`;

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(res.data);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      soundEngine.playQuestComplete();
    } catch (e) {
      alert("Failed to export data: " + (e as Error).message);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = async (e) => {
      try {
        const target = e.target?.result;
        if (typeof target !== "string") return;
        const parsed = JSON.parse(target);

        let backupString = "";
        if (parsed.schemaVersion) {
          backupString = target;
        } else if (parsed.backupString) {
          backupString = parsed.backupString;
        } else {
          alert("Invalid backup file structure.");
          return;
        }

        if (session?.user?.id) {
          const { importBackupAction } = await import("@/actions/game-actions");
          const res = await importBackupAction(session.user.id, backupString);
          if (res.success) {
            alert("Import successful! State fully restored.");
            soundEngine.playLevelUp();
            queryClient.invalidateQueries();
            window.location.reload();
          } else {
            alert("Failed to import backup data: " + (res.error || "Internal error"));
          }
        }
      } catch (err) {
        alert("Failed to parse backup file: " + (err as Error).message);
      }
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[#6D5EF8] drop-shadow-md flex items-center gap-3">
            <SettingsIcon className="text-[#6D5EF8]" size={28} /> System Settings
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">
            Configure realm appearance, audio controls, system parameters, and data backups.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-2">
          <SpotlightCard className="p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-full bg-[#6D5EF8]/20 border border-[#6D5EF8]/40 flex items-center justify-center">
                <span className="text-xs font-bold font-serif text-[#6D5EF8]">HERO</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.email || "Hero Adventurer"}</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 mt-0.5 font-mono">Rank: Adventurer</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E74C3C]/30 hover:bg-[#E74C3C]/10 text-[#E74C3C] text-xs font-bold uppercase tracking-widest transition-all"
            >
              <LogOut size={14} /> Log Out Realm
            </button>
          </SpotlightCard>
        </div>

        {/* Configurations Area */}
        <div className="md:col-span-2 space-y-6">

          {/* Appearance & Theme Section */}
          <SpotlightCard className="p-6 rounded-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-serif border-b border-white/10 pb-2 flex items-center gap-2">
              <Sun size={16} className="text-[#F4C542]" /> Realm Appearance
            </h2>

            <p className="text-xs text-slate-400">
              Customize the visual palette of ASCENDRA across all locations and components.
            </p>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#6D5EF8]/10 border border-[#6D5EF8]/30">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-[#6D5EF8]" />
                <div>
                  <p className="text-sm font-bold text-white">Obsidian Dark Theme</p>
                  <p className="text-xs text-slate-400">Locked to premium fantasy dark mode</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#6D5EF8] uppercase tracking-wider bg-[#6D5EF8]/20 px-3 py-1 rounded-full border border-[#6D5EF8]/40">Active</span>
            </div>

            {/* Custom Fantasy Arrow Cursor Toggle */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <div>
                <p className="text-sm font-bold text-white">Custom Fantasy Cursor</p>
                <p className="text-xs text-slate-400">Illustrated silver arrowhead with location-aware aura glow</p>
              </div>
              <button
                onClick={ui.toggleCustomCursor}
                className={`w-12 h-6 rounded-full flex items-center transition-colors px-0.5 ${ui.customCursorEnabled ? 'bg-[#6D5EF8]' : 'bg-slate-800'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white flex items-center justify-center transition-transform ${ui.customCursorEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                  <Check size={10} className={ui.customCursorEnabled ? "text-[#6D5EF8]" : "text-slate-400"} />
                </div>
              </button>
            </div>
          </SpotlightCard>

          {/* Preferences */}
          <SpotlightCard className="p-6 rounded-xl space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-serif border-b border-white/10 pb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-[#6D5EF8]" /> Audio & Visual Controls
            </h2>

            <div className="space-y-6">
              {/* Sound Toggle */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-white">Chimes & Sound FX</p>
                  <p className="text-xs text-slate-400">Action completion notes and notifications</p>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors px-0.5 ${ui.soundEnabled ? 'bg-[#6D5EF8]' : 'bg-slate-800'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white flex items-center justify-center transition-transform ${ui.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                    {ui.soundEnabled ? <Volume2 size={10} className="text-[#6D5EF8]" /> : <VolumeX size={10} className="text-slate-400" />}
                  </div>
                </button>
              </div>

              {/* Music Toggle */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-white">Atmospheric Ambient Music</p>
                  <p className="text-xs text-slate-400">Serene focus room tracks and zone backgrounds</p>
                </div>
                <button
                  onClick={ui.toggleMusic}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors px-0.5 ${ui.musicEnabled ? 'bg-[#6D5EF8]' : 'bg-slate-800'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white flex items-center justify-center transition-transform ${ui.musicEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                    <Music size={10} className={ui.musicEnabled ? "text-[#6D5EF8]" : "text-slate-400"} />
                  </div>
                </button>
              </div>

              {/* Animations Toggle */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-white">Interface Transitions</p>
                  <p className="text-xs text-slate-400">Smooth floating dialogs and particle systems</p>
                </div>
                <button
                  onClick={ui.toggleAnimations}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors px-0.5 ${ui.animationsEnabled ? 'bg-[#6D5EF8]' : 'bg-slate-800'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white flex items-center justify-center transition-transform ${ui.animationsEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                    <Check size={10} className={ui.animationsEnabled ? "text-[#6D5EF8]" : "text-slate-400"} />
                  </div>
                </button>
              </div>
            </div>
          </SpotlightCard>

          {/* Backup & Restore Data */}
          <SpotlightCard className="p-6 rounded-xl space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-serif border-b border-white/10 pb-2 flex items-center gap-2">
              <Download size={16} className="text-[#2ECC71]" /> Data Backup & Vault Restore
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">Export Full Character State</p>
                  <p className="text-xs text-slate-400">Download complete profile, quests, pets, and inventory as JSON</p>
                </div>
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2ECC71]/20 border border-[#2ECC71]/40 text-[#2ECC71] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#2ECC71]/30 transition-all shrink-0"
                >
                  <Download size={14} /> Export Backup
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-sm font-bold text-white">Import Character State</p>
                  <p className="text-xs text-slate-400">Restore character progress from a saved backup JSON file</p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportData}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#6D5EF8]/20 border border-[#6D5EF8]/40 text-[#6D5EF8] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#6D5EF8]/30 transition-all shrink-0"
                  >
                    <Upload size={14} /> Import Backup
                  </button>
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* About ASCENDRA */}
          <SpotlightCard className="p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
            <AscendraLogo size="lg" />
            <p className="text-xs text-slate-400 max-w-md">
              ASCENDRA v1.0 &bull; A self-improvement RPG turning real-life tasks, focus, and habits into legendary hero progression.
            </p>

            <CreatorCredits className="w-full max-w-md mt-2" />
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
