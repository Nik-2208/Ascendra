import "server-only";

export type QuestDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface QuestRewardPolicyDefinition {
  xpMin: number;
  xpMax: number;
  coinsMin: number;
  coinsMax: number;
}

export const QUEST_REWARD_POLICY: Record<QuestDifficulty, QuestRewardPolicyDefinition> = {
  EASY: {
    xpMin: 25,
    xpMax: 30,
    coinsMin: 5,
    coinsMax: 10,
  },
  MEDIUM: {
    xpMin: 55,
    xpMax: 60,
    coinsMin: 15,
    coinsMax: 25,
  },
  HARD: {
    xpMin: 75,
    xpMax: 100,
    coinsMin: 30,
    coinsMax: 50,
  },
};

export class RewardPolicy {
  /**
   * Derive difficulty from priority, repeat, category, or difficulty string
   */
  static inferDifficulty(input: { priority?: string | null; category?: string | null; repeat?: string | null; difficulty?: string | null }): QuestDifficulty {
    const raw = (input.difficulty || input.priority || "").toUpperCase();
    if (raw === "HIGH" || raw === "HARD" || raw === "EPIC" || raw === "LEGENDARY") return "HARD";
    if (raw === "LOW" || raw === "EASY") return "EASY";
    return "MEDIUM";
  }

  /**
   * Generate canonical deterministic rewards based strictly on Global Quest Reward Policy
   */
  static getRewardsForDifficulty(difficulty: QuestDifficulty, input?: { category?: string | null; title?: string | null; repeat?: boolean | string | null }): { xp: number; coins: number } {
    const policy = QUEST_REWARD_POLICY[difficulty] || QUEST_REWARD_POLICY.MEDIUM;
    
    // Create a deterministic seed based on category, title, and repeatability
    const categoryStr = input?.category || "HEALTH";
    const titleStr = input?.title || "Routine Quest";
    const isRepeatable = !!input?.repeat && input.repeat !== "None";

    let charSum = 0;
    for (let i = 0; i < titleStr.length; i++) {
      charSum += titleStr.charCodeAt(i);
    }
    for (let i = 0; i < categoryStr.length; i++) {
      charSum += categoryStr.charCodeAt(i) * 2;
    }
    if (isRepeatable) charSum += 17;

    const xpRange = policy.xpMax - policy.xpMin + 1;
    const xp = policy.xpMin + (charSum % xpRange);

    const coinsRange = policy.coinsMax - policy.coinsMin + 1;
    const coins = policy.coinsMin + ((charSum * 3) % coinsRange);

    return { xp, coins };
  }

  /**
   * Normalize any quest reward strictly into [25, 100] bounds according to difficulty
   */
  static normalizeRewards(rawXp: number, rawCoins: number, difficulty: QuestDifficulty = "MEDIUM"): { xp: number; coins: number } {
    const policy = QUEST_REWARD_POLICY[difficulty] || QUEST_REWARD_POLICY.MEDIUM;
    let clampedXp = Math.min(100, Math.max(25, Math.round(rawXp || policy.xpMin)));
    
    if (clampedXp > policy.xpMax) clampedXp = policy.xpMax;
    if (clampedXp < policy.xpMin) clampedXp = policy.xpMin;

    let clampedCoins = Math.min(100, Math.max(5, Math.round(rawCoins || policy.coinsMin)));
    if (clampedCoins > policy.coinsMax) clampedCoins = policy.coinsMax;
    if (clampedCoins < policy.coinsMin) clampedCoins = policy.coinsMin;

    return { xp: clampedXp, coins: clampedCoins };
  }
}
