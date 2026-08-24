import { prisma } from "@/lib/prisma";
import { EngineRulebook } from "@/lib/rule-registry/engine-rulebook";
import { gameMath } from "@/lib/game-math";

export interface SelfHealReport {
  userId: string;
  success: boolean;
  repairsApplied: string[];
  durationMs: number;
  timestamp: number;
}

export class SelfHealFramework {
  private static activeHeals: Set<string> = new Set();

  /**
   * Fast pre-flight check executed before critical mutations or page loads
   */
  static async runPreFlightCheck(userId: string): Promise<boolean> {
    if (!userId) return true;
    try {
      // Check essential user entities existence
      const [char, moneyJar, settings] = await Promise.all([
        prisma.character.findUnique({ where: { userId }, select: { id: true, level: true, xp: true } }),
        prisma.moneyJar.findUnique({ where: { userId }, select: { id: true } }),
        prisma.userSettings.findUnique({ where: { userId }, select: { id: true } })
      ]);

      if (!char || !moneyJar || !settings) {
        await this.healUserCore(userId);
        return true;
      }

      // Check level alignment
      const expectedLevel = gameMath.levelFromXP(char.xp);
      if (char.level !== expectedLevel) {
        await prisma.character.update({
          where: { id: char.id },
          data: { level: Math.max(1, expectedLevel) }
        });
      }

      // Audit and heal duplicate active quest progress records
      const activeProgresses = await prisma.questProgress.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" }
      });
      const seenQuestIds = new Set<string>();
      const duplicateIds: string[] = [];
      for (const p of activeProgresses) {
        if (seenQuestIds.has(p.questId)) {
          duplicateIds.push(p.id);
        } else {
          seenQuestIds.add(p.questId);
        }
      }
      if (duplicateIds.length > 0) {
        await prisma.questProgress.deleteMany({
          where: { id: { in: duplicateIds } }
        });
      }

      // Audit and heal quest templates in database to enforce RewardPolicy
      const quests = await prisma.quest.findMany();
      const { RewardPolicy } = await import("@/lib/services/reward-policy");
      for (const q of quests) {
        const difficulty = RewardPolicy.inferDifficulty({
          difficulty: (q as any).difficulty,
          priority: (q as any).priority
        });
        const policy = RewardPolicy.normalizeRewards(q.xpReward, q.coinReward, difficulty);
        if (q.xpReward !== policy.xp || q.coinReward !== policy.coins) {
          await prisma.quest.update({
            where: { id: q.id },
            data: { xpReward: policy.xp, coinReward: policy.coins }
          });
        }
      }

      return true;
    } catch (e) {
      console.warn(`[SelfHeal] Pre-flight check warning for user ${userId}:`, e);
      return false;
    }
  }

  /**
   * Guarantees all essential core entities exist for a user
   */
  static async healUserCore(userId: string): Promise<string[]> {
    const repairs: string[] = [];

    await prisma.$transaction(async (tx) => {
      // 1. Character & Stats
      const char = await tx.character.findUnique({ where: { userId } });
      if (!char) {
        const newChar = await tx.character.create({
          data: {
            userId,
            name: "Hero",
            class: "Novice",
            level: 1,
            xp: 0,
            prestige: 0,
            rebirths: 0,
            villageLevel: 1,
            villageHealth: 100
          }
        });
        await tx.characterStats.create({
          data: {
            characterId: newChar.id,
            hp: 100,
            maxHp: 100,
            strength: 10,
            defense: 10,
            intelligence: 10,
            agility: 10,
            luck: 10
          }
        });
        repairs.push("Created missing Character and CharacterStats.");
      }

      // 2. Money Jar
      const jar = await tx.moneyJar.findUnique({ where: { userId } });
      if (!jar) {
        await tx.moneyJar.create({
          data: {
            userId,
            coins: 50,
            gems: 5,
            vaultCoins: 0,
            vaultHighest: 0,
            realMoneySaved: 0,
            realMoneyGoal: 10000,
            currency: "USD"
          }
        });
        repairs.push("Created missing MoneyJar.");
      }

      // 3. Inventory
      const inv = await tx.inventory.findUnique({ where: { userId } });
      if (!inv) {
        await tx.inventory.create({
          data: {
            userId,
            capacity: 50
          }
        });
        repairs.push("Created missing Inventory.");
      }

      // 4. UserSettings
      const settings = await tx.userSettings.findUnique({ where: { userId } });
      if (!settings) {
        await tx.userSettings.create({
          data: {
            userId,
            theme: "dark",
            soundEnabled: true,
            pushEnabled: true
          }
        });
        repairs.push("Created missing UserSettings.");
      }
    });

    return repairs;
  }

  /**
   * Complete Self-Healing Audit & Repair across all engines
   */
  static async healAll(userId: string): Promise<SelfHealReport> {
    const startTime = Date.now();
    if (this.activeHeals.has(userId)) {
      return {
        userId,
        success: true,
        repairsApplied: ["Heal already in progress"],
        durationMs: 0,
        timestamp: Date.now()
      };
    }

    this.activeHeals.add(userId);
    const repairsApplied: string[] = [];

    try {
      // 1. Core entity check & creation
      const coreRepairs = await this.healUserCore(userId);
      repairsApplied.push(...coreRepairs);

      // 2. Execute Rulebook Engine Audits
      const audits = await EngineRulebook.fullAudit(userId);
      for (const audit of audits) {
        for (const issue of audit.issues) {
          if (issue.repaired) {
            repairsApplied.push(`[${audit.engineName}] Repaired: ${issue.name} - ${issue.details || "Fixed"}`);
          }
        }
      }

      return {
        userId,
        success: true,
        repairsApplied,
        durationMs: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`[SelfHeal] Critical error healing user ${userId}:`, error);
      return {
        userId,
        success: false,
        repairsApplied: [...repairsApplied, `Error: ${(error as Error).message}`],
        durationMs: Date.now() - startTime,
        timestamp: Date.now()
      };
    } finally {
      this.activeHeals.delete(userId);
    }
  }
}
