import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { LevelUpOverlay } from "@/components/game/level-up-overlay";
import { LootReveal } from "@/components/game/loot-reveal";
import { AchievementPopup } from "@/components/game/achievement-popup";
import { BossDefeatCinematic } from "@/components/game/boss-defeat-cinematic";

export const unstable_instant = false;

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="relative flex h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans select-none transition-colors duration-250">
      <CustomCursor />
      <CinematicBackground />
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col rpg-scrollbar pb-20 md:pb-0">
        <Header />
        <div className="max-w-7xl mx-auto p-4 md:p-8 flex-1 w-full animate-in fade-in duration-300">
          {children}
        </div>
      </main>
      <MobileNav />
      
      {/* Dynamic Popups and Overlays */}
      <LevelUpOverlay />
      <LootReveal />
      <AchievementPopup />
      <BossDefeatCinematic />
    </div>
  );
}
