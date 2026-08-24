import { gameMath } from "./game-math";

// XP & Leveling Configuration

export const LEVEL_EXPONENT = 1.5;
export const LEVEL_BASE_MULTIPLIER = 100;

/**
 * Calculates the level based on total XP using an RPG curve.
 */
export function calculateLevel(totalXP: number): number {
  return gameMath.levelFromXP(totalXP);
}

export function xpForNextLevel(currentLevel: number): number {
  return gameMath.xpForLevel(currentLevel + 1);
}

export function xpForCurrentLevel(currentLevel: number): number {
  return gameMath.xpForLevel(currentLevel);
}

export function calculateXpProgress(totalXP: number, currentLevel: number): number {
  return gameMath.levelProgress(totalXP).percentage;
}

// Prestige & Titles System
const TITLES = [
  { level: 1, title: "Novice" },
  { level: 5, title: "Apprentice" },
  { level: 10, title: "Journeyman" },
  { level: 20, title: "Adept" },
  { level: 30, title: "Expert" },
  { level: 40, title: "Master" },
  { level: 50, title: "Grandmaster" },
  { level: 60, title: "Legend" },
  { level: 75, title: "Mythic" },
  { level: 100, title: "Ascendant" },
];

export function calculateTitle(level: number, prestige: number = 0): string {
  let baseTitle = "Novice";
  for (let i = TITLES.length - 1; i >= 0; i--) {
    if (level >= TITLES[i].level) {
      baseTitle = TITLES[i].title;
      break;
    }
  }

  if (prestige > 0) {
    const prestigeNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    const numeral = prestigeNumerals[Math.min(prestige - 1, 9)];
    return `${baseTitle} ${numeral}`;
  }

  return baseTitle;
}

export function getNextTitleRequirements(level: number): { nextLevel: number, nextTitle: string } | null {
  for (const t of TITLES) {
    if (t.level > level) {
      return { nextLevel: t.level, nextTitle: t.title };
    }
  }
  return null;
}

// Rewards Calculation
export interface RewardWeights {
  baseXP: number;
  baseCoins: number;
}

export function calculateStreakMultiplier(streakCount: number): number {
  const MAX_MULTIPLIER = 2.5;
  const multiplier = 1.0 + (streakCount * 0.05);
  return Math.min(multiplier, MAX_MULTIPLIER);
}

export function calculateQuestRewards(
  baseXP: number,
  baseCoins: number,
  streakCount: number = 0
): { xp: number; coins: number } {
  const multiplier = calculateStreakMultiplier(streakCount);
  
  return {
    xp: Math.floor(baseXP * multiplier),
    coins: Math.floor(baseCoins * multiplier),
  };
}

export function calculateBossDamage(
  questDifficulty: "easy" | "medium" | "hard" | "epic" | "legendary",
  characterLevel: number
): number {
  const baseDamageMap = {
    easy: 10,
    medium: 25,
    hard: 50,
    epic: 100,
    legendary: 250,
  };
  
  const levelMultiplier = 1 + (characterLevel * 0.02);
  
  return Math.floor(baseDamageMap[questDifficulty] * levelMultiplier);
}
