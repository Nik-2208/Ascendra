export const RANKS = [
  "Novice Mind",         // Level 1-4
  "Synapse Initiate",    // Level 5-9
  "Cognitive Scholar",   // Level 10-19
  "Vector Strategist",   // Level 20-34
  "Mental Architect",    // Level 35-49
  "Quantum Thinker",     // Level 50-74
  "Apex Paragon"         // Level 75+
];

export function getRankForLevel(level: number): string {
  if (level < 5) return RANKS[0];
  if (level < 10) return RANKS[1];
  if (level < 20) return RANKS[2];
  if (level < 35) return RANKS[3];
  if (level < 50) return RANKS[4];
  if (level < 75) return RANKS[5];
  return RANKS[6];
}

/**
 * Cumulative XP required to reach a given Brain Level L:
 * XP(L) = 60 * (L - 1) + 2.5 * (L - 1)^2
 */
export function getBrainLevelFromXp(totalXp: number): number {
  if (!totalXp || totalXp <= 0) return 1;
  // Solve quadratic: 2.5*x^2 + 60*x - totalXp = 0
  const x = (-60 + Math.sqrt(3600 + 10 * totalXp)) / 5;
  const level = Math.floor(x) + 1;
  return Math.max(1, level);
}

/**
 * Total cumulative XP required to reach Level L
 */
export function getXpRequiredForBrainLevel(level: number): number {
  if (level <= 1) return 0;
  const l = level - 1;
  return Math.round(60 * l + 2.5 * l * l);
}

/**
 * Calculates current level progress stats
 */
export function getBrainLevelProgress(totalXp: number) {
  const currentLevel = getBrainLevelFromXp(totalXp);
  const xpCurrentLevelStart = getXpRequiredForBrainLevel(currentLevel);
  const xpNextLevelStart = getXpRequiredForBrainLevel(currentLevel + 1);

  const xpIntoCurrentLevel = Math.max(0, totalXp - xpCurrentLevelStart);
  const xpRequiredForNext = Math.max(1, xpNextLevelStart - xpCurrentLevelStart);
  const percentage = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpRequiredForNext) * 100));

  return {
    currentLevel,
    totalXp,
    xpIntoCurrentLevel,
    xpRequiredForNext,
    percentage,
    rank: getRankForLevel(currentLevel)
  };
}

/**
 * Standardized Brain XP reward & penalty system
 */
export function calculateGameBrainXp(
  score: number,
  difficulty: "easy" | "medium" | "hard" = "medium",
  isNewPb: boolean = false
): number {
  const scoreRatio = Math.min(1, Math.max(0, score / 100));

  // Failed game (< 40% score) -> Negative XP Penalty
  if (scoreRatio < 0.4) {
    const penaltyMap = {
      easy: -3,
      medium: -5,
      hard: -8,
    };
    return penaltyMap[difficulty];
  }

  // Base XP Ranges per difficulty
  const baseRanges = {
    easy: { min: 4, max: 8 },
    medium: { min: 8, max: 14 },
    hard: { min: 14, max: 22 },
  }[difficulty];

  // Performance Scaling
  let performanceFactor = 0.20; // 40-59% -> 20%
  if (scoreRatio >= 0.9) performanceFactor = 1.0;
  else if (scoreRatio >= 0.75) performanceFactor = 0.75;
  else if (scoreRatio >= 0.6) performanceFactor = 0.50;

  let earnedXp = Math.round(baseRanges.min + (baseRanges.max - baseRanges.min) * performanceFactor);

  // Modest bonus for high performance / new PB
  if (scoreRatio >= 0.9) {
    earnedXp += isNewPb ? 4 : 2;
  }

  return earnedXp;
}
