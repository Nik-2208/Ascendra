/**
 * Game Math Utilities — ASCENDRA AAA Long-Term RPG Progression Economy
 * Formula: Step XP(L -> L+1) = BASE_XP + (L - 1) * INCREMENT_PER_LEVEL
 * L1 -> L2: 1,000 XP
 * L2 -> L3: 1,350 XP
 * L3 -> L4: 1,700 XP
 * L4 -> L5: 2,050 XP
 * Scaling continuously to 35,000+ XP per level at late game.
 */

export const PROGRESSION_CONFIG = {
  BASE_XP_L2: 1000,
  INCREMENT_PER_LEVEL: 350,
  MAX_XP_PER_EVENT: 150,
  MAX_LEVEL: 500,
};

// Pre-compute 500-level cumulative XP table
const XP_TABLE: number[] = new Array(PROGRESSION_CONFIG.MAX_LEVEL);

(function buildXPTable() {
  XP_TABLE[0] = 0; // Level 1 -> 0 XP

  let cumulative = 0;
  for (let l = 1; l < PROGRESSION_CONFIG.MAX_LEVEL; l++) {
    const stepXP = PROGRESSION_CONFIG.BASE_XP_L2 + (l - 1) * PROGRESSION_CONFIG.INCREMENT_PER_LEVEL;
    cumulative += stepXP;
    XP_TABLE[l] = cumulative;
  }
})();

export const gameMath = {
  /**
   * Calculate total cumulative XP required to reach a specific level.
   * O(1) table lookup.
   */
  xpForLevel(level: number): number {
    if (level <= 1) return 0;
    const idx = Math.min(500, Math.max(1, Math.floor(level))) - 1;
    return XP_TABLE[idx];
  },

  /**
   * Calculate current level based on total cumulative XP using binary search.
   * O(log N) -> max 9 comparisons.
   */
  levelFromXP(totalXP: number): number {
    if (totalXP <= 0) return 1;
    if (totalXP >= XP_TABLE[XP_TABLE.length - 1]) return 500;

    let low = 0;
    let high = XP_TABLE.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (XP_TABLE[mid] === totalXP) {
        return mid + 1;
      } else if (XP_TABLE[mid] < totalXP) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return Math.max(1, high + 1);
  },

  /**
   * Get progress to next level as a percentage (0 to 100)
   */
  levelProgress(totalXP: number): {
    currentLevel: number;
    xpIntoLevel: number;
    xpRequiredForNextLevel: number;
    percentage: number;
  } {
    const currentLevel = this.levelFromXP(totalXP);
    const xpForCurrent = this.xpForLevel(currentLevel);
    const xpForNext = this.xpForLevel(currentLevel + 1);

    const xpIntoLevel = Math.max(0, totalXP - xpForCurrent);
    const xpRequiredForNextLevel = Math.max(1, xpForNext - xpForCurrent);
    const percentage = Math.min(100, Math.max(0, Number(((xpIntoLevel / xpRequiredForNextLevel) * 100).toFixed(1))));

    return {
      currentLevel,
      xpIntoLevel,
      xpRequiredForNextLevel,
      percentage
    };
  },

  /**
   * Calculate damage dealt against a target with defense
   */
  calculateDamage(attack: number, defense: number): number {
    const mitigation = defense / (defense + 50);
    const damage = attack * (1 - mitigation);
    return Math.max(1, Math.floor(damage));
  }
};
