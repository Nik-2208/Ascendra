import type { Season } from "@/types";

// Hardcoded Season data (in a production app, this would come from Firestore)
export function getCurrentSeason(): Omit<Season, "startDate" | "endDate"> & { startDate: Date; endDate: Date; daysRemaining: number; progress: number } {
  const now = new Date();
  
  // Seasons rotate quarterly
  const month = now.getMonth();
  let seasonName: string;
  let theme: string;

  if (month >= 0 && month <= 2) {
    seasonName = "Frost Awakening";
    theme = "winter";
  } else if (month >= 3 && month <= 5) {
    seasonName = "Bloom of Power";
    theme = "spring";
  } else if (month >= 6 && month <= 8) {
    seasonName = "Solar Forge";
    theme = "summer";
  } else {
    seasonName = "Harvest of Legends";
    theme = "autumn";
  }

  // Calculate start/end of current quarter
  const quarterStart = new Date(now.getFullYear(), Math.floor(month / 3) * 3, 1);
  const quarterEnd = new Date(now.getFullYear(), Math.floor(month / 3) * 3 + 3, 0, 23, 59, 59);

  const totalDays = Math.ceil((quarterEnd.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((now.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = totalDays - elapsedDays;
  const progress = Math.round((elapsedDays / totalDays) * 100);

  return {
    id: `season_${now.getFullYear()}_q${Math.floor(month / 3) + 1}`,
    name: seasonName,
    theme,
    startDate: quarterStart,
    endDate: quarterEnd,
    daysRemaining,
    progress,
    rewards: [
      { tier: 1, xpRequired: 500, reward: "Season Badge", icon: "🏅" },
      { tier: 2, xpRequired: 1500, reward: "Rare Loot Crate", icon: "📦" },
      { tier: 3, xpRequired: 3000, reward: "Season Pet Egg", icon: "🥚" },
      { tier: 4, xpRequired: 5000, reward: "Legendary Title", icon: "👑" },
      { tier: 5, xpRequired: 10000, reward: "Mythic Gear", icon: "⚔️" },
    ],
  };
}
