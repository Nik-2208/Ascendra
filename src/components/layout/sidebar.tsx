"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "@/actions/dashboard-actions";
import { AscendraLogo } from "@/components/ui/ascendra-logo";
import { CreatorCredits } from "@/components/ui/creator-credits";
import { 
  Home,
  Swords,
  Map,
  Shield, 
  Backpack,
  Scroll,
  Trophy,
  Crown,
  User,
  MessageSquare,
  Sparkles,
  Castle,
  Store,
  PiggyBank,
  Brain,
  Settings,
  Compass,
  Target
} from "lucide-react";

const REALM_LOCATIONS = [
  {
    label: "Kingdom Hubs",
    items: [
      { href: "/", label: "Adventurer's Hall", subtitle: "Tavern & Daily Hub", icon: Home },
      { href: "/schedule", label: "Guild Hall", subtitle: "Quest Board", icon: Scroll },
      { href: "/quests", label: "Active Quests", subtitle: "Bounties", icon: Swords },
      { href: "/village", label: "Kingdom Village", subtitle: "Settlement", icon: Castle },
      { href: "/life-map", label: "Kingdom Atlas", subtitle: "World Map", icon: Map },
    ]
  },
  {
    label: "Combat & Training",
    items: [
      { href: "/brain-lab", label: "Arcane Library", subtitle: "Brain Evolution Lab", icon: Brain },
      { href: "/boss-arena", label: "The Colosseum", subtitle: "Boss Encounters", icon: Crown },
      { href: "/campaigns", label: "Royal Council", subtitle: "Long-term Campaigns", icon: Target },
      { href: "/urge-battle", label: "Resilience Shrine", subtitle: "Distraction Battle", icon: Shield },
      { href: "/skill-tree", label: "Shrine of Mastery", subtitle: "Skill Tree", icon: Compass },
    ]
  },
  {
    label: "Treasury & Inventory",
    items: [
      { href: "/inventory", label: "Hero's Backpack", subtitle: "Gear & Items", icon: Backpack },
      { href: "/shop", label: "Grand Marketplace", subtitle: "Merchant", icon: Store },
      { href: "/money-jar", label: "Royal Vault", subtitle: "Money Jar", icon: PiggyBank },
      { href: "/achievements", label: "Hall of Trophies", subtitle: "Achievements", icon: Trophy },
      { href: "/chronicles", label: "Book of Legends", subtitle: "Chronicles Ledger", icon: Scroll },
    ]
  },
  {
    label: "Sanctuary",
    items: [
      { href: "/chat", label: "Tavern Gossip", subtitle: "AI Chat", icon: MessageSquare },
      { href: "/coach", label: "Grandmaster AI", subtitle: "Coach", icon: Sparkles },
      { href: "/settings", label: "Wizard's Workshop", subtitle: "Settings", icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const level = dashboard?.profile?.level || 1;
  const charClass = dashboard?.profile?.class || "Adventurer";

  return (
    <aside className="w-72 h-screen bg-[var(--surface)]/90 backdrop-blur-2xl border-r border-[var(--border)] text-[var(--foreground)] flex flex-col py-6 px-4 hidden md:flex sticky top-0 z-40 shadow-2xl transition-colors duration-250">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 mb-6">
        <Link href="/" className="flex items-center gap-3">
          <AscendraLogo size="md" />
        </Link>
      </div>

      {/* Navigation Group Items */}
      <nav className="flex-1 overflow-y-auto rpg-scrollbar space-y-6 pr-2">
        {REALM_LOCATIONS.map((group, groupIdx) => (
          <div key={group.label}>
            <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-serif mb-2 flex items-center gap-2">
              <span className="w-2 h-[1px] bg-[#F4C542]/50" /> {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item, idx) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (groupIdx * 0.08) + (idx * 0.04), ease: "easeOut" }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative border ${
                        isActive 
                          ? "bg-[#F4C542]/15 border-[#F4C542]/50 text-white shadow-[0_0_15px_rgba(244,197,66,0.25)]" 
                          : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:border-white/10"
                      }`}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="active-line-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#F4C542] rounded-r-full shadow-[0_0_10px_#F4C542]"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-[#F4C542] drop-shadow-[0_0_8px_#F4C542]" : "group-hover:text-slate-100"}`} />
                      <div className="overflow-hidden">
                        <span className="text-sm font-semibold tracking-wide block truncate">{item.label}</span>
                        <span className="text-[10px] text-slate-500 block truncate group-hover:text-slate-400">{item.subtitle}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Hero Profile Footer */}
      <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
        <Link href="/character" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-white/10 hover:border-[#6D5EF8]/40 transition-all group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6D5EF8] to-[#F4C542] p-[1px] shrink-0">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
              <User className="w-4 h-4 text-white group-hover:text-[#F4C542] transition-colors" />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold font-serif text-white truncate">Hero Profile</p>
            <p className="text-[10px] uppercase tracking-widest text-[#38BDF8] font-mono truncate">Lvl {level} {charClass}</p>
          </div>
        </Link>

        {/* AAA Studio Creator Credits */}
        <CreatorCredits compact />
      </div>
    </aside>
  );
}
