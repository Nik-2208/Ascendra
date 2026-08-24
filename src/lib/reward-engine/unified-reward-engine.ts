import { prisma } from "@/lib/prisma";
import { QUEST_ENGINE_CONSTANTS, QuestDifficulty, QUEST_DIFFICULTY_POLICY } from "@/lib/quest-engine/quest-taxonomy";
import { gameMath, PROGRESSION_CONFIG } from "@/lib/game-math";

export interface RewardModifier {
  name: string;
  type: "XP" | "COINS";
  value: string;
}

export interface CanonicalRewardDTO {
  transactionId: string;
  source: string;
  baseXp: number;
  baseCoins: number;
  skillXpBonus: number;
  skillCoinBonus: number;
  ascensionXpBonus: number;
  ascensionCoinBonus: number;
  finalXp: number;
  finalCoins: number;
  xpCapApplied: boolean;
  appliedModifiers: RewardModifier[];
  timestamp: number;
}

export class UnifiedRewardEngine {
  /**
   * Fixed Daily Ration Rewards (Single Source of Truth)
   */
  static getDailyRation() {
    return { ...QUEST_ENGINE_CONSTANTS.DAILY_RATION };
  }

  /**
   * Derive difficulty from string or category
   */
  static inferDifficulty(input: { difficulty?: string | null; priority?: string | null; category?: string | null }): QuestDifficulty {
    const raw = (input.difficulty || input.priority || "").toUpperCase();
    if (raw === "HIGH" || raw === "HARD" || raw === "EPIC" || raw === "LEGENDARY") return "HARD";
    if (raw === "LOW" || raw === "EASY") return "EASY";
    return "MEDIUM";
  }

  /**
   * Derive category from string or type
   */
  static inferCategory(input: { category?: string | null; type?: string | null; title?: string | null }): any {
    const raw = (input.category || input.type || "").toUpperCase();
    const title = (input.title || "").toLowerCase();

    if (raw === "DAILY") return "DAILY";
    if (raw === "WEEKLY") return "WEEKLY";
    if (raw === "STORY" || raw === "CAMPAIGN") return "STORY";
    if (raw === "HABIT") return "HABIT";
    if (title.includes("pomodoro") || title.includes("focus")) return "FOCUS";
    if (title.includes("meditat") || title.includes("mindful")) return "MINDFULNESS";
    if (title.includes("brain") || title.includes("lab")) return "LEARNING";
    if (title.includes("exercise") || title.includes("workout") || title.includes("step")) return "FITNESS";
    if (title.includes("coin") || title.includes("budget") || title.includes("money")) return "FINANCE";
    if (title.includes("code") || title.includes("program")) return "CODING";
    if (title.includes("boss") || title.includes("arena")) return "BOSS";
    if (title.includes("resilience") || title.includes("urge")) return "CHALLENGE";

    return "CUSTOM";
  }

  /**
   * Normalize any base reward into difficulty policy bounds [25, 100]
   */
  static normalizeRewards(rawXp: number, rawCoins: number, difficulty: QuestDifficulty = "MEDIUM"): { xp: number; coins: number } {
    const policy = QUEST_DIFFICULTY_POLICY[difficulty] || QUEST_DIFFICULTY_POLICY.MEDIUM;
    let clampedXp = Math.min(100, Math.max(25, Math.round(rawXp || policy.xpMin)));
    if (clampedXp > policy.xpMax) clampedXp = policy.xpMax;
    if (clampedXp < policy.xpMin) clampedXp = policy.xpMin;

    let clampedCoins = Math.min(100, Math.max(5, Math.round(rawCoins || policy.coinsMin)));
    if (clampedCoins > policy.coinsMax) clampedCoins = policy.coinsMax;
    if (clampedCoins < policy.coinsMin) clampedCoins = policy.coinsMin;

    return { xp: clampedXp, coins: clampedCoins };
  }

  /**
   * Transparent calculation of final XP & Coins including active skills & ascension.
   * Single Source of Truth for both Preview UI and Execution Awarding.
   */
  static calculateRewardBreakdown(params: {
    baseXp: number;
    baseCoins: number;
    activeSkillIds?: string[];
    ascensionCount?: number;
    source?: string;
  }): CanonicalRewardDTO {
    const { baseXp, baseCoins, activeSkillIds = [], ascensionCount = 0, source = "GAMEPLAY" } = params;

    let skillXpMultiplier = 0;
    let skillCoinMultiplier = 0;
    const appliedModifiers: RewardModifier[] = [];

    if (activeSkillIds.length > 0) {
      try {
        const { calculateActiveSkillMultipliers } = require("@/lib/skill-engine");
        const skillMods = calculateActiveSkillMultipliers(activeSkillIds);
        skillXpMultiplier = skillMods.xpBonus || 0;
        skillCoinMultiplier = skillMods.coinBonus || 0;

        if (skillXpMultiplier > 0) {
          appliedModifiers.push({ name: "Skill Tree Mastery", type: "XP", value: `+${Math.round(skillXpMultiplier * 100)}%` });
        }
        if (skillCoinMultiplier > 0) {
          appliedModifiers.push({ name: "Skill Tree Economy", type: "COINS", value: `+${Math.round(skillCoinMultiplier * 100)}%` });
        }
      } catch (e) {}
    }

    const ascensionMultiplier = (ascensionCount || 0) * 0.10;
    if (ascensionMultiplier > 0) {
      appliedModifiers.push({ name: `Ascension Cycle ${ascensionCount}`, type: "XP", value: `+${Math.round(ascensionMultiplier * 100)}%` });
      appliedModifiers.push({ name: `Ascension Cycle ${ascensionCount}`, type: "COINS", value: `+${Math.round(ascensionMultiplier * 100)}%` });
    }

    const rawSkillXp = Math.round(baseXp * skillXpMultiplier);
    const rawSkillCoins = Math.round(baseCoins * skillCoinMultiplier);

    const rawAscensionXp = Math.round(baseXp * ascensionMultiplier);
    const rawAscensionCoins = Math.round(baseCoins * ascensionMultiplier);

    const unconstrainedXp = baseXp + rawSkillXp + rawAscensionXp;
    const finalCoins = baseCoins + rawSkillCoins + rawAscensionCoins;

    const maxCap = QUEST_ENGINE_CONSTANTS.MAX_AWARDED_XP; // 150
    const clampedAwardXp = Math.min(maxCap, Math.max(0, Math.round(unconstrainedXp)));
    const displayXp = Math.min(QUEST_ENGINE_CONSTANTS.MAX_DISPLAYED_XP, clampedAwardXp);

    const xpCapApplied = unconstrainedXp > maxCap;
    if (xpCapApplied) {
      appliedModifiers.push({ name: "Max Event XP Cap", type: "XP", value: `Clamped to ${maxCap} XP` });
    }

    return {
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source,
      baseXp,
      baseCoins,
      skillXpBonus: rawSkillXp,
      skillCoinBonus: rawSkillCoins,
      ascensionXpBonus: rawAscensionXp,
      ascensionCoinBonus: rawAscensionCoins,
      finalXp: displayXp,
      finalCoins,
      xpCapApplied,
      appliedModifiers,
      timestamp: Date.now()
    };
  }

  /**
   * Sole Authoritative Award Processor: Mutates Database XP, Level, and Coins Atomically
   */
  static async processAward(userId: string, breakdown: CanonicalRewardDTO, externalTx?: any): Promise<{
    newXP: number;
    newLevel: number;
    didLevelUp: boolean;
    xpGained: number;
    coinsGained: number;
    newCoins: number;
  }> {
    const execute = async (tx: any) => {
      // 1. Fetch character and moneyJar
      const character = await tx.character.findUnique({
        where: { userId },
        select: { id: true, xp: true, level: true, villageLevel: true, buildings: true }
      });
      const moneyJar = await tx.moneyJar.findUnique({
        where: { userId },
        select: { id: true, coins: true }
      });

      if (!character || !moneyJar) {
        throw new Error("Character or MoneyJar not initialized.");
      }

      // 2. Award XP with hard server cap (150 XP max)
      const effectiveXp = Math.min(QUEST_ENGINE_CONSTANTS.MAX_AWARDED_XP, Math.max(0, breakdown.finalXp));
      const oldLevel = character.level;
      const newXP = character.xp + effectiveXp;
      const newLevel = gameMath.levelFromXP(newXP);
      const didLevelUp = newLevel > oldLevel;

      const charUpdateData: any = {
        xp: newXP,
        level: newLevel
      };

      if (didLevelUp) {
        let buildingsObj: any = character.buildings || {};
        if (typeof buildingsObj === "string") {
          try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
        }
        if (!buildingsObj.skillsProgression) {
          buildingsObj.skillsProgression = { general: { xp: 0, level: 1, points: 0, spent: 0 } };
        }
        const oldEarned = Math.floor(oldLevel / 2);
        const newEarned = Math.floor(newLevel / 2);
        const points = Math.max(0, newEarned - oldEarned);
        if (buildingsObj.skillsProgression.general) {
          buildingsObj.skillsProgression.general.points += points;
        }
        charUpdateData.buildings = buildingsObj;

        if ((character.villageLevel || 1) < newLevel) {
          charUpdateData.villageLevel = newLevel;
        }

        const { ChroniclesService } = await import("@/lib/services/chronicles-service");
        await ChroniclesService.createEntry(
          userId,
          "LEVEL_UP",
          `Reached Level ${newLevel}`,
          `Promoted from Level ${oldLevel} to Level ${newLevel}.`
        );

        const { NotificationService } = await import("@/lib/services/notification-service");
        await NotificationService.send(
          userId,
          "🎉 Level Up!",
          `Congratulations! You have reached Level ${newLevel}!`,
          "LEVEL_UP",
          tx
        );
      }

      await tx.character.update({
        where: { id: character.id },
        data: charUpdateData
      });

      // 3. Award Coins
      const effectiveCoins = Math.max(0, breakdown.finalCoins);
      const updatedJar = await tx.moneyJar.update({
        where: { id: moneyJar.id },
        data: { coins: { increment: effectiveCoins } }
      });

      // 4. Log Transaction
      await tx.transaction.create({
        data: {
          userId,
          amount: effectiveCoins,
          type: "EARN",
          source: breakdown.source || "REWARD_ENGINE"
        }
      });

      return {
        newXP,
        newLevel,
        didLevelUp,
        xpGained: effectiveXp,
        coinsGained: effectiveCoins,
        newCoins: updatedJar.coins
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    }

    return await prisma.$transaction(async (tx) => {
      return await execute(tx);
    }, { timeout: 15000, maxWait: 5000 });
  }
}
