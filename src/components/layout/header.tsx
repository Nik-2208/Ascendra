"use client";

import { Settings, Sparkles, Coins, Crown, Scroll } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "@/actions/dashboard-actions";
import { motion } from "framer-motion";
import { NotificationPanel } from "@/components/ui/notification-panel";
import { gameMath } from "@/lib/game-math";
import { AscendraLogo } from "@/components/ui/ascendra-logo";

export function Header() {
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const xp = dashboard?.profile?.xp || 0;
  const levelProgress = gameMath.levelProgress(xp);
  const level = (levelProgress as any).currentLevel || (levelProgress as any).level || 1;
  const coins = dashboard?.moneyJar?.coins || 0;

  return (
    <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 bg-[var(--surface)]/90 backdrop-blur-2xl border-b border-[var(--border)] text-[var(--foreground)] shadow-lg transition-colors duration-250">
      
      {/* Mobile/Tablet branding area */}
      <div className="flex items-center gap-3 md:hidden">
        <Link href="/">
          <AscendraLogo size="sm" />
        </Link>
      </div>

      <div className="flex-1 flex justify-between items-center max-w-7xl mx-auto w-full">
        {/* Left Side: Game Stats HUD */}
        <div className="hidden md:flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-inner"
          >
            <Crown className="w-4 h-4 text-[#F4C542] drop-shadow-[0_0_8px_#F4C542]" />
            <span className="text-xs font-bold font-serif text-white uppercase tracking-wider">
              Lvl {level}
            </span>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-inner"
          >
            <Coins className="w-4 h-4 text-[#F4C542] drop-shadow-[0_0_8px_#F4C542]" />
            <span className="text-xs font-bold font-mono text-white tracking-wider">
              {coins.toLocaleString()} <span className="text-[10px] text-[#F4C542]/70 font-serif">GP</span>
            </span>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-inner min-w-[140px]"
          >
            <Sparkles className="w-4 h-4 text-[#38BDF8] drop-shadow-[0_0_8px_#38BDF8]" />
            <div className="flex-1">
              <div className="flex justify-between text-[9px] font-mono text-[#38BDF8] mb-0.5">
                <span>XP</span>
                <span>{levelProgress.xpIntoLevel || 0} / {levelProgress.xpRequiredForNextLevel || 100}</span>
              </div>
              <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-[#38BDF8] shadow-[0_0_10px_#38BDF8]" style={{ width: `${levelProgress.percentage || 0}%` }} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Quick Actions & Profile */}
        <div className="flex items-center gap-3 ml-auto">
          <Link href="/quests" className="hidden lg:flex">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-[#6D5EF8] to-[#5546E0] border border-[#897DFF] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold font-serif flex items-center gap-2 shadow-[0_0_15px_rgba(109,94,248,0.3)]"
            >
              <Scroll className="w-3.5 h-3.5" /> View Bounties
            </motion.div>
          </Link>

          <NotificationPanel />
          
          <motion.div whileHover={{ scale: 1.05, rotate: 30 }} whileTap={{ scale: 0.95 }}>
            <Link href="/settings" className="w-9 h-9 rounded-xl bg-slate-950/80 border border-white/10 hover:border-white/30 flex items-center justify-center transition-all">
              <Settings className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
