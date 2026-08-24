import "server-only";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievement-engine";
import { UnifiedRewardEngine, CanonicalRewardDTO, RewardModifier } from "@/lib/reward-engine/unified-reward-engine";

export const CANONICAL_REWARDS = {
  DAILY_RATION: {
    xp: 10,
    coins: 20,
  },
  TASK: {
    LOW: { xp: 30, coins: 5 },
    MEDIUM: { xp: 50, coins: 10 },
    HIGH: { xp: 80, coins: 20 },
  },
  STREAK_DAILY: {
    xp: 20,
    coins: 10,
  },
  BRAIN_GAME: {
    baseXp: 40,
    baseCoins: 15,
  },
  BOSS_VICTORY: {
    baseXp: 100,
    baseCoins: 50,
  }
};

export type { CanonicalRewardDTO, RewardModifier };

export interface RewardBreakdown extends CanonicalRewardDTO {}

export class RewardEngine {
  /**
   * Returns canonical Daily Ration rewards (Single Source of Truth)
   */
  static getDailyRationRewards() {
    return CANONICAL_REWARDS.DAILY_RATION;
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
    return UnifiedRewardEngine.calculateRewardBreakdown(params);
  }
  /**
   * Safe transaction-wrapper to award XP to a user.
   * Recalculates level, handles level ups, triggers achievement checks.
   */
  static async awardXP(userId: string, xpGained: number): Promise<{
    newXP: number;
    newLevel: number;
    didLevelUp: boolean;
    xpGained: number;
  }> {
    const res = await prisma.$transaction(async (tx) => {
      const { LevelService } = await import("./level-service");
      return await LevelService.awardXP(userId, xpGained, tx);
    }, {
      timeout: 30000,
      maxWait: 10000
    });

    // Run achievements outside of active parent transaction
    await RewardEngine.checkAndUnlockAchievements(userId);

    return {
      newXP: res.newXP,
      newLevel: res.newLevel,
      didLevelUp: res.levelUp,
      xpGained
    };
  }

  /**
   * Safe transaction-wrapper to award Gold/Coins to a user.
   */
  static async awardGold(userId: string, goldGained: number): Promise<{
    newBalance: number;
  }> {
    const updated = await prisma.$transaction(async (tx) => {
      const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
      if (!moneyJar) throw new Error("Money jar not initialized");

      const updatedJar = await tx.moneyJar.update({
        where: { id: moneyJar.id },
        data: { coins: { increment: goldGained } }
      });

      const { NotificationService } = await import("./notification-service");
      await NotificationService.send(
        userId,
        "🪙 Coins Earned",
        `You gained +${goldGained} Coins.`,
        "COINS_GAIN",
        tx
      );

      // Log transaction
      await tx.transaction.create({
        data: {
          userId,
          amount: goldGained,
          type: "EARN",
          source: "REWARD_ENGINE_AWARD"
        }
      });

      return updatedJar;
    }, {
      timeout: 30000,
      maxWait: 10000
    });

    // Run achievements outside of active parent transaction
    await RewardEngine.checkAndUnlockAchievements(userId);

    return { newBalance: updated.coins };
  }

  /**
   * Main evaluator for all user achievements.
   * Compiles user statistics, calculates snapshots, and inserts unlocks safely.
   */
  static async checkAndUnlockAchievementsInternal(userId: string, tx?: any): Promise<number> {
    await RewardEngine.checkAndUnlockAchievements(userId);
    return 0;
  }

  static async checkAndUnlockAchievements(userId: string): Promise<void> {
    const startTime = Date.now();

    // 1. Fetch current unlocks & metrics using concurrent queries OUTSIDE transaction for speed (< 20ms total)
    const [
      existingProgress,
      character,
      completedQuestsCount,
      defeatedBossesCount,
      streaks,
      petCount,
      itemCount,
      skillsCount,
      moneyJar
    ] = await Promise.all([
      prisma.achievementProgress.findMany({
        where: { userId, isUnlocked: true },
        select: { achievementId: true }
      }),
      prisma.character.findUnique({
        where: { userId },
        include: { stats: true }
      }),
      prisma.questProgress.count({
        where: { userId, status: "COMPLETED" }
      }),
      prisma.transaction.count({
        where: { userId, type: "EARN", source: { startsWith: "BOSS_REWARD:" } }
      }),
      prisma.streak.findMany({
        where: { userId }
      }),
      prisma.pet.count({
        where: { userId }
      }),
      prisma.inventoryItem.count({
        where: { inventory: { userId } }
      }),
      prisma.skill.count({
        where: { character: { userId } }
      }),
      prisma.moneyJar.findUnique({
        where: { userId }
      })
    ]);

    if (!character) return;

    const unlockedIds = new Set<string>(existingProgress.map((p: any) => p.achievementId));
    const candidates = ACHIEVEMENT_DEFINITIONS.filter(def => !unlockedIds.has(def.id));

    // Fast-path 1: If all achievements are already unlocked, return immediately! (< 15ms)
    if (candidates.length === 0) {
      return;
    }

    const maxStreak = streaks.reduce((max: number, s: any) => Math.max(max, s.best || 0), 0);
    const totalCoins = moneyJar?.coins || 0;

    // 2. Evaluate candidates in pure JS memory (0ms)
    const newlySatisfied = candidates.filter(def => {
      const cond = def.condition;
      if (cond.type === "quests_completed" && completedQuestsCount >= cond.threshold) return true;
      if (cond.type === "bosses_defeated" && defeatedBossesCount >= cond.threshold) return true;
      if (cond.type === "streak_count" && maxStreak >= cond.threshold) return true;
      if (cond.type === "level_reached" && character.level >= cond.threshold) return true;
      if (cond.type === "coins_accumulated" && totalCoins >= cond.threshold) return true;
      if (cond.type === "pets_owned" && petCount >= cond.threshold) return true;
      if (cond.type === "items_owned" && itemCount >= cond.threshold) return true;
      if (cond.type === "total_xp" && character.xp >= cond.threshold) return true;
      if (cond.type === "skills_unlocked" && skillsCount >= cond.threshold) return true;
      return false;
    });

    // Fast-path 2: If no new achievements met, return immediately! (< 20ms)
    if (newlySatisfied.length === 0) {
      return;
    }

    // 3. Execute writes inside transaction ONLY when achievements are actually unlocked
    let totalXpToAward = 0;
    await prisma.$transaction(async (tx) => {
      for (const def of newlySatisfied) {
        const cond = def.condition;
        await tx.achievement.upsert({
          where: { id: def.id },
          create: {
            id: def.id,
            name: def.name,
            description: def.description,
            requirement: cond.threshold,
            metric: cond.type.toUpperCase(),
            iconUrl: def.icon
          },
          update: {
            name: def.name,
            description: def.description,
            requirement: cond.threshold,
            metric: cond.type.toUpperCase(),
            iconUrl: def.icon
          }
        });

        await tx.achievementProgress.upsert({
          where: { userId_achievementId: { userId, achievementId: def.id } },
          create: {
            userId,
            achievementId: def.id,
            progress: cond.threshold,
            isUnlocked: true,
            unlockedAt: new Date()
          },
          update: {
            progress: cond.threshold,
            isUnlocked: true,
            unlockedAt: new Date()
          }
        });

        if (def.rewards.xp > 0) totalXpToAward += def.rewards.xp;
        if (def.rewards.coins > 0) {
          await tx.moneyJar.update({
            where: { userId },
            data: { coins: { increment: def.rewards.coins } }
          });
          await tx.transaction.create({
            data: {
              userId,
              amount: def.rewards.coins,
              type: "EARN",
              source: `ACHIEVEMENT_UNLOCK:${def.id}`
            }
          });
        }
      }
    }, {
      timeout: 10000,
      maxWait: 5000
    });

    if (totalXpToAward > 0) {
      await prisma.$transaction(async (tx) => {
        const { ProgressionService } = await import("./progression-service");
        await ProgressionService.awardXPRaw(userId, totalXpToAward, tx);
      }, {
        timeout: 10000,
        maxWait: 5000
      });
    }
  }

  /**
   * Centralized helper to award general skill points on character level-up.
   */
  static async handleCharacterLevelUp(userId: string, oldLevel: number, newLevel: number, tx: any) {
    if (newLevel <= oldLevel) return;
    const pointsToAward = (newLevel - oldLevel) * 10;

    const character = await tx.character.findUnique({ where: { userId } });
    if (!character) return;

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }

    if (!buildingsObj.skillsProgression) {
      buildingsObj.skillsProgression = {
        general: { xp: 0, level: 1, points: 0, spent: 0 },
        knowledge: { xp: 0, level: 1, points: 0, spent: 0 },
        discipline: { xp: 0, level: 1, points: 0, spent: 0 },
        strength: { xp: 0, level: 1, points: 0, spent: 0 },
        productivity: { xp: 0, level: 1, points: 0, spent: 0 },
        creativity: { xp: 0, level: 1, points: 0, spent: 0 },
        social: { xp: 0, level: 1, points: 0, spent: 0 },
        health: { xp: 0, level: 1, points: 0, spent: 0 },
        finance: { xp: 0, level: 1, points: 0, spent: 0 }
      };
    }

    if (!buildingsObj.skillsProgression.general) {
      buildingsObj.skillsProgression.general = { xp: 0, level: 1, points: 0, spent: 0 };
    }

    buildingsObj.skillsProgression.general.points += pointsToAward;

    await tx.character.update({
      where: { id: character.id },
      data: { buildings: buildingsObj }
    });
  }

  /**
   * Add category-specific Skill XP based on task category.
   * Levels up the category when XP threshold is met, granting Skill Points.
   */
  static async awardSkillXP(userId: string, taskCategory: string, xpGained: number, tx: any) {
    const character = await tx.character.findUnique({ where: { userId } });
    if (!character) return;

    // Normalize category
    let cat = taskCategory.toLowerCase().trim();
    if (cat.includes("study") || cat.includes("learn") || cat.includes("read") || cat.includes("course") || cat.includes("knowledge")) cat = "knowledge";
    else if (cat.includes("gym") || cat.includes("workout") || cat.includes("run") || cat.includes("sport") || cat.includes("strength")) cat = "strength";
    else if (cat.includes("habit") || cat.includes("routine") || cat.includes("consist") || cat.includes("discipline")) cat = "discipline";
    else if (cat.includes("work") || cat.includes("code") || cat.includes("project") || cat.includes("assign") || cat.includes("product")) cat = "productivity";
    else if (cat.includes("writ") || cat.includes("draw") || cat.includes("music") || cat.includes("design") || cat.includes("creat")) cat = "creativity";
    else if (cat.includes("network") || cat.includes("commun") || cat.includes("meet") || cat.includes("social")) cat = "social";
    else if (cat.includes("meditat") || cat.includes("sleep") || cat.includes("nutrit") || cat.includes("hydrat") || cat.includes("health")) cat = "health";
    else if (cat.includes("budget") || cat.includes("invest") || cat.includes("sav") || cat.includes("financ")) cat = "finance";
    else cat = "discipline"; // default

    // Parse progression JSON
    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }

    if (!buildingsObj.skillsProgression) {
      buildingsObj.skillsProgression = {
        general: { xp: 0, level: 1, points: 0, spent: 0 },
        knowledge: { xp: 0, level: 1, points: 0, spent: 0 },
        discipline: { xp: 0, level: 1, points: 0, spent: 0 },
        strength: { xp: 0, level: 1, points: 0, spent: 0 },
        productivity: { xp: 0, level: 1, points: 0, spent: 0 },
        creativity: { xp: 0, level: 1, points: 0, spent: 0 },
        social: { xp: 0, level: 1, points: 0, spent: 0 },
        health: { xp: 0, level: 1, points: 0, spent: 0 },
        finance: { xp: 0, level: 1, points: 0, spent: 0 }
      };
    }

    const prog = buildingsObj.skillsProgression[cat] || { xp: 0, level: 1, points: 0, spent: 0 };
    prog.xp += xpGained;

    // Check level up
    let reqXp = prog.level * 100;
    while (prog.xp >= reqXp) {
      prog.xp -= reqXp;
      prog.level += 1;
      prog.points += 1; // Milestone: award 1 skill point in this category
      reqXp = prog.level * 100;
    }

    buildingsObj.skillsProgression[cat] = prog;

    // Save JSON back
    await tx.character.update({
      where: { id: character.id },
      data: {
        buildings: buildingsObj
      }
    });
  }
}
