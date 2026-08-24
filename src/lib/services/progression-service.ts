import "server-only";
import { gameMath } from "@/lib/game-math";
import { prisma } from "@/lib/prisma";

const activeRepairs = new Set<string>();

export class ProgressionService {
  /**
   * Pure database updates for XP and level adjustments without triggering achievements recursion
   */
  static async awardXPRaw(userId: string, xpAmount: number, tx: any) {
    if (xpAmount === 0) {
      const character = await tx.character.findUnique({
        where: { userId },
        select: { level: true, xp: true }
      });
      return { levelUp: false, oldLevel: character?.level || 1, newLevel: character?.level || 1, newXP: character?.xp || 0 };
    }

    const character = await tx.character.findUnique({
      where: { userId },
      select: { id: true, xp: true, level: true, buildings: true, villageLevel: true }
    });

    if (!character) throw new Error("Character not found");

    const oldLevel = character.level;

    const { PROGRESSION_CONFIG } = await import("@/lib/game-math");

    if (xpAmount < 0) {
      const minXPForCurrentLevel = gameMath.xpForLevel(character.level);
      const newXP = Math.max(minXPForCurrentLevel, Math.max(0, character.xp + xpAmount));
      await tx.character.update({
        where: { id: character.id },
        data: { xp: newXP }
      });
      return { levelUp: false, oldLevel: character.level, newLevel: character.level, newXP };
    }

    // Hard cap: Maximum XP per event is clamped to 150 XP
    const effectiveXpAmount = Math.min(PROGRESSION_CONFIG.MAX_XP_PER_EVENT, Math.max(0, Math.round(xpAmount)));
    const newXP = Math.max(0, character.xp + effectiveXpAmount);
    
    // Recalculate level based on total XP
    const newLevel = gameMath.levelFromXP(newXP);
    const didLevelUp = newLevel > oldLevel;

    const updateData: any = {
      xp: newXP,
      level: newLevel
    };

    if (didLevelUp) {
      // Award +10 skill points per level gained
      let buildingsObj: any = character.buildings || {};
      if (typeof buildingsObj === "string") {
        try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
      }

      if (!buildingsObj.skillsProgression) {
        buildingsObj.skillsProgression = {
          general: { xp: 0, level: 1, points: 0, spent: 0 }
        };
      }
      if (!buildingsObj.skillsProgression.general) {
        buildingsObj.skillsProgression.general = { xp: 0, level: 1, points: 0, spent: 0 };
      }

      const oldEarnedPoints = Math.floor(oldLevel / 2);
      const newEarnedPoints = Math.floor(newLevel / 2);
      const pointsToAward = Math.max(0, newEarnedPoints - oldEarnedPoints);
      buildingsObj.skillsProgression.general.points += pointsToAward;
      updateData.buildings = buildingsObj;

      // Update village level to match character level progression if village level is lower
      const currentVillageLevel = character.villageLevel || 1;
      if (currentVillageLevel < newLevel) {
        updateData.villageLevel = newLevel;
      }

      const { ChroniclesService } = await import("./chronicles-service");
      await ChroniclesService.createEntry(userId, "LEVEL_UP", `Reached Level ${newLevel}`, `Promoted from Level ${oldLevel} to Level ${newLevel}.`);

      const { NotificationService } = await import("./notification-service");
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
      data: updateData
    });

    try {
      if (didLevelUp) {
        const { QuestEngine } = await import("./quest-engine");
        await QuestEngine.emit({ userId, type: "LEVEL_UP", value: newLevel }, tx);
      }
    } catch (qErr) {
      console.error("QuestEngine event emission error on awardXP:", qErr);
    }

    return {
      levelUp: didLevelUp,
      oldLevel,
      newLevel,
      newXP
    };
  }

  /**
   * Main entrypoint to award XP.
   */
  static async awardXP(userId: string, xpAmount: number, externalTx?: any) {
    if (externalTx) {
      return await ProgressionService.awardXPRaw(userId, xpAmount, externalTx);
    }

    // Phase 1: Pure XP updates inside fast transaction
    const result = await prisma.$transaction(async (tx) => {
      return await ProgressionService.awardXPRaw(userId, xpAmount, tx);
    }, { timeout: 5000, maxWait: 2000 });

    // Phase 2: Run achievements checks outside the parent transaction
    const { RewardEngine } = await import("./reward-engine");
    await RewardEngine.checkAndUnlockAchievements(userId);

    return result;
  }

  /**
   * Internal validator/repair function to align stats, levels, and unlocks safely without blocking transactions
   */
  static async validateAndRepairProgressionInternal(userId: string, tx?: any): Promise<number> {
    const db = tx || prisma;
    const character = await db.character.findUnique({
      where: { userId }
    });

    if (!character) return 0;

    const computedLevel = gameMath.levelFromXP(character.xp);
    const maxAscension = Math.max(character.prestige || 0, character.rebirths || 0);
    if (character.level !== computedLevel || character.prestige !== maxAscension || character.rebirths !== maxAscension) {
      await db.character.update({
        where: { id: character.id },
        data: {
          level: computedLevel,
          prestige: maxAscension,
          rebirths: maxAscension
        }
      });
    }

    // Auto-repair Skill Points & Unlocks
    const { SkillProgressionService } = await import("./skill-progression-service");
    await SkillProgressionService.repairSkillProgression(userId, db);

    // World Region Unlocks
    const regionUnlockReqs: Record<string, number> = {
      starting_village: 1,
      health_kingdom: 5,
      library_of_knowledge: 10,
      arena_of_strength: 15,
      creativity_forest: 20,
      finance_desert: 25,
      career_mountains: 30,
      relationship_isles: 35,
      citadel: 40
    };

    for (const [regionId, minLevel] of Object.entries(regionUnlockReqs)) {
      if (computedLevel >= minLevel) {
        await db.worldRegion.upsert({
          where: {
            userId_regionId: { userId, regionId }
          },
          create: {
            userId,
            regionId,
            unlocked: true,
            unlockedAt: new Date()
          },
          update: {
            unlocked: true
          }
        });
      }
    }

    return 0;
  }

  /**
   * Non-blocking, debounced background repair process.
   * Prevents transaction timeouts and duplicate repair tasks per user.
   */
  static async validateAndRepairProgression(userId: string) {
    if (activeRepairs.has(userId)) return;
    activeRepairs.add(userId);

    try {
      await ProgressionService.validateAndRepairProgressionInternal(userId);
      const { RewardEngine } = await import("./reward-engine");
      await RewardEngine.checkAndUnlockAchievements(userId);
    } catch (error) {
      console.error("[ProgressionRepair] Non-critical background repair error:", error);
    } finally {
      activeRepairs.delete(userId);
    }
  }
}
