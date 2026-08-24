"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Scroll, Swords, Crown, Backpack } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Hall", icon: Home },
    { href: "/schedule", label: "Quests", icon: Scroll },
    { href: "/boss-arena", label: "Colosseum", icon: Crown },
    { href: "/inventory", label: "Backpack", icon: Backpack },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-slate-900/90 border border-white/15 backdrop-blur-2xl rounded-full px-6 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center justify-between relative">
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? "text-[#6D5EF8] font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={18} className={isActive ? "drop-shadow-[0_0_8px_#6D5EF8]" : ""} />
              <span className="text-[10px] font-serif">{item.label}</span>
            </Link>
          );
        })}

        {/* Floating Central Action Button */}
        <div className="relative -top-6">
          <Link
            href="/quests"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#6D5EF8] to-[#2ECC71] text-white shadow-[0_0_25px_rgba(109,94,248,0.6)] border-4 border-[#0F172A] hover:scale-110 active:scale-95 transition-all"
          >
            <Swords size={24} className="drop-shadow-md" />
          </Link>
        </div>

        {navItems.slice(2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? "text-[#6D5EF8] font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={18} className={isActive ? "drop-shadow-[0_0_8px_#6D5EF8]" : ""} />
              <span className="text-[10px] font-serif">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
