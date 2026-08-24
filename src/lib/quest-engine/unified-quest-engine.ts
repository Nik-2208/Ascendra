import { prisma } from "@/lib/prisma";
import { 
  CanonicalQuestItem, 
  QuestCategory, 
  QuestDifficulty, 
  QUEST_ENGINE_CONSTANTS 
} from "./quest-taxonomy";
import { UnifiedRewardEngine } from "@/lib/reward-engine/unified-reward-engine";
import { SelfHealFramework } from "@/lib/self-heal/self-heal-framework";

export type QuestEventType =
  | "TASK_COMPLETED"
  | "POMODORO_FINISHED"
  | "MEDITATION_COMPLETED"
  | "BOSS_VICTORY"
  | "BOSS_DAMAGE"
  | "BRAIN_GAME_PLAYED"
  | "RESILIENCE_COMPLETED"
  | "MERCHANT_PURCHASE"
  | "VILLAGE_UPGRADED"
  | "SKILL_UNLOCKED"
  | "DAILY_STREAK_INCREASED"
  | "COINS_EARNED"
  | "XP_EARNED"
  | "LEVEL_UP"
  | "ASCENSION_COMPLETED"
  | "CAMPAIGN_COMPLETED"
  | "ITEM_USED";

export interface QuestEvent {
  userId: string;
  type: QuestEventType;
  value?: number;
  category?: string;
}

export class UnifiedQuestEngine {
  /**
   * Fetch all user quests with taxonomy, difficulty, normalized rewards, and live breakdown
   */
  static async getAllQuests(userId: string): Promise<{
    active: CanonicalQuestItem[];
    completed: CanonicalQuestItem[];
  }> {
    // Pre-flight check
    await SelfHealFramework.runPreFlightCheck(userId);

    // Ensure procedural/default quests
    await this.ensureQuests(userId);

    const userChar = await prisma.character.findUnique({
      where: { userId },
      select: { buildings: true, prestige: true, rebirths: true }
    });

    let bObj: any = userChar?.buildings || {};
    if (typeof bObj === "string") {
      try { bObj = JSON.parse(bObj); } catch (e) { bObj = {}; }
    }
    const activeSkillIds = bObj.activeSkillIds || [];
    const ascensionCount = Math.max(userChar?.prestige || 0, userChar?.rebirths || 0);

    const progresses = await prisma.questProgress.findMany({
      where: { userId },
      include: { quest: true },
      orderBy: { createdAt: "desc" }
    });

    // Deduplicate active records
    const seenActiveQuestIds = new Set<string>();
    const active: CanonicalQuestItem[] = [];
    const completed: CanonicalQuestItem[] = [];

    for (const p of progresses) {
      if (!p.quest) continue;

      const difficulty = UnifiedRewardEngine.inferDifficulty({
        difficulty: (p.quest as any).difficulty,
        priority: (p.quest as any).priority
      });
      const category = UnifiedRewardEngine.inferCategory({
        type: p.quest.type,
        title: p.quest.title
      });

      const normalized = UnifiedRewardEngine.normalizeRewards(p.quest.xpReward, p.quest.coinReward, difficulty);
      const breakdown = UnifiedRewardEngine.calculateRewardBreakdown({
        baseXp: normalized.xp,
        baseCoins: normalized.coins,
        activeSkillIds,
        ascensionCount,
        source: `QUEST:${p.quest.id}`
      });

      const item: CanonicalQuestItem = {
        id: p.id,
        progressId: p.id,
        questId: p.questId,
        title: p.quest.title,
        description: p.quest.description,
        category,
        difficulty,
        trackingMode: category === "CUSTOM" || category === "HABIT" || category === "MINDFULNESS" ? "MANUAL" : "AUTOMATIC",
        baseXpReward: normalized.xp,
        baseCoinReward: normalized.coins,
        xpReward: breakdown.finalXp,
        coinReward: breakdown.finalCoins,
        progress: p.progress,
        target: p.target,
        status: p.status as any,
        completedAt: p.completedAt ? p.completedAt.toISOString() : null,
        isGlobal: p.quest.isGlobal,
        taskId: p.quest.taskId,
        userId: p.userId,
        createdAt: p.createdAt ? p.createdAt.toISOString() : undefined
      };

      if (p.status === "ACTIVE") {
        if (!seenActiveQuestIds.has(p.questId)) {
          seenActiveQuestIds.add(p.questId);
          active.push(item);
        }
      } else {
        completed.push(item);
      }
    }

    return { active, completed };
  }

  /**
   * Automatic Quest Progress Event Listener
   */
  static async emitEvent(event: QuestEvent, externalTx?: any): Promise<number> {
    const db = externalTx || prisma;
    const { userId, type, value = 1 } = event;

    const activeList = await db.questProgress.findMany({
      where: { userId, status: "ACTIVE" },
      include: { quest: true }
    });

    if (!activeList.length) return 0;
    let updatedCount = 0;

    for (const qp of activeList) {
      const title = (qp.quest?.title || "").toLowerCase();
      const desc = (qp.quest?.description || "").toLowerCase();
      let isMatch = false;

      switch (type) {
        case "MEDITATION_COMPLETED":
          if (title.includes("meditat") || title.includes("mindful") || title.includes("quiet") || title.includes("focus") || desc.includes("meditat") || desc.includes("mindful")) isMatch = true;
          break;
        case "POMODORO_FINISHED":
          if (title.includes("pomodoro") || title.includes("focus") || title.includes("timer") || desc.includes("pomodoro") || desc.includes("focus")) isMatch = true;
          break;
        case "TASK_COMPLETED":
          if (title.includes("task") || title.includes("quest") || title.includes("todo") || desc.includes("task") || desc.includes("objective")) isMatch = true;
          break;
        case "BOSS_VICTORY":
        case "BOSS_DAMAGE":
          if (title.includes("boss") || title.includes("titan") || title.includes("enemy") || desc.includes("boss") || desc.includes("arena")) isMatch = true;
          break;
        case "BRAIN_GAME_PLAYED":
          if (title.includes("brain") || title.includes("lab") || title.includes("n-back") || desc.includes("brain") || desc.includes("lab")) isMatch = true;
          break;
        case "RESILIENCE_COMPLETED":
          if (title.includes("resilience") || title.includes("urge") || desc.includes("distraction") || desc.includes("habit")) isMatch = true;
          break;
        case "MERCHANT_PURCHASE":
        case "COINS_EARNED":
          if (title.includes("coin") || title.includes("merchant") || title.includes("shop") || desc.includes("shop") || desc.includes("buy")) isMatch = true;
          break;
        case "VILLAGE_UPGRADED":
          if (title.includes("village") || title.includes("building") || desc.includes("village") || desc.includes("building")) isMatch = true;
          break;
        case "SKILL_UNLOCKED":
          if (title.includes("skill") || title.includes("tree") || desc.includes("skill")) isMatch = true;
          break;
        case "DAILY_STREAK_INCREASED":
          if (title.includes("streak") || title.includes("daily") || desc.includes("streak")) isMatch = true;
          break;
        case "CAMPAIGN_COMPLETED":
          if (title.includes("campaign") || title.includes("stage") || desc.includes("campaign")) isMatch = true;
          break;
        case "ASCENSION_COMPLETED":
          if (title.includes("ascend") || title.includes("prestige") || desc.includes("ascend")) isMatch = true;
          break;
      }

      if (isMatch) {
        const newProgress = Math.min(qp.target, qp.progress + value);
        const isCompletedNow = newProgress >= qp.target;

        await db.questProgress.update({
          where: { id: qp.id },
          data: {
            progress: newProgress,
            status: isCompletedNow ? "COMPLETED" : "ACTIVE",
            completedAt: isCompletedNow ? new Date() : qp.completedAt
          }
        });

        updatedCount++;

        if (isCompletedNow) {
          const { NotificationService } = await import("@/lib/services/notification-service");
          await NotificationService.send(
            userId,
            "🎉 Quest Complete!",
            `You completed: ${qp.quest.title}! Claim your rewards on the Quest Board.`,
            "QUEST",
            db
          );

          const { ChroniclesService } = await import("@/lib/services/chronicles-service");
          await ChroniclesService.createEntry(
            userId,
            "QUEST",
            `Completed Quest: ${qp.quest.title}`,
            `Earned rewards: +${qp.quest.xpReward} XP, +${qp.quest.coinReward} Coins.`
          );
        }
      }
    }

    return updatedCount;
  }

  /**
   * Honest Manual Quest Completion
   */
  static async completeManualQuest(userId: string, progressId: string, honestPledgeConfirmed: boolean) {
    if (!honestPledgeConfirmed) {
      throw new Error(`Integrity pledge required: "${QUEST_ENGINE_CONSTANTS.MANUAL_HONESTY_PLEDGE}"`);
    }

    return await prisma.$transaction(async (tx) => {
      const qp = await tx.questProgress.findUnique({
        where: { id: progressId },
        include: { quest: true }
      });

      if (!qp || qp.userId !== userId) throw new Error("Quest progress not found or unauthorized.");
      if (qp.status === "COMPLETED") throw new Error("Quest is already completed.");

      await tx.questProgress.update({
        where: { id: progressId },
        data: {
          status: "COMPLETED",
          progress: qp.target,
          completedAt: new Date()
        }
      });

      // Award rewards immediately
      return await this.claimReward(userId, progressId, tx);
    });
  }

  /**
   * Complete and Claim Rewards atomically
   */
  static async claimReward(userId: string, questProgressId: string, externalTx?: any) {
    const execute = async (tx: any) => {
      const qp = await tx.questProgress.findUnique({
        where: { id: questProgressId },
        include: { quest: true }
      });

      if (!qp || qp.userId !== userId) throw new Error("Quest not found or unauthorized.");
      if (qp.status !== "COMPLETED") throw new Error("Quest is not completed yet.");

      // Check if already claimed
      const existingClaim = await tx.analyticsEvent.findFirst({
        where: {
          userId,
          eventType: "QUEST_REWARD_CLAIMED",
          payload: { path: ["questProgressId"], equals: questProgressId }
        }
      });

      if (existingClaim) {
        throw new Error("Reward already claimed for this quest.");
      }

      const userChar = await tx.character.findUnique({
        where: { userId },
        select: { buildings: true, prestige: true, rebirths: true }
      });

      let bObj: any = userChar?.buildings || {};
      if (typeof bObj === "string") {
        try { bObj = JSON.parse(bObj); } catch (e) { bObj = {}; }
      }
      const activeSkillIds = bObj.activeSkillIds || [];
      const ascensionCount = Math.max(userChar?.prestige || 0, userChar?.rebirths || 0);

      const difficulty = UnifiedRewardEngine.inferDifficulty({
        difficulty: (qp.quest as any).difficulty,
        priority: (qp.quest as any).priority
      });
      const norm = UnifiedRewardEngine.normalizeRewards(qp.quest.xpReward, qp.quest.coinReward, difficulty);

      const breakdown = UnifiedRewardEngine.calculateRewardBreakdown({
        baseXp: norm.xp,
        baseCoins: norm.coins,
        activeSkillIds,
        ascensionCount,
        source: `QUEST_REWARD:${qp.questId}`
      });

      // Award via UnifiedRewardEngine
      const awardRes = await UnifiedRewardEngine.processAward(userId, breakdown, tx);

      // Log claim in analytics
      await tx.analyticsEvent.create({
        data: {
          userId,
          eventType: "QUEST_REWARD_CLAIMED",
          payload: {
            questProgressId,
            questId: qp.questId,
            breakdown,
            awardRes
          }
        }
      });

      const { ChroniclesService } = await import("@/lib/services/chronicles-service");
      await ChroniclesService.createEntry(
        userId,
        "QUEST",
        `Claimed Quest Reward: ${qp.quest.title}`,
        `Received +${breakdown.finalXp} XP and +${breakdown.finalCoins} Coins.`
      );

      const { NotificationService } = await import("@/lib/services/notification-service");
      await NotificationService.send(
        userId,
        "🎉 Quest Reward Claimed",
        `You claimed +${breakdown.finalXp} XP and +${breakdown.finalCoins} Coins for "${qp.quest.title}".`,
        "QUEST_CLAIMED",
        tx
      );

      return {
        success: true,
        breakdown,
        awardRes
      };
    };

    if (externalTx) return await execute(externalTx);
    return await prisma.$transaction(async (tx) => execute(tx), { timeout: 15000, maxWait: 5000 });
  }

  /**
   * Ensure Default Global & Procedural Quests
   */
  static async ensureQuests(userId: string) {
    const { QuestGenerator } = await import("@/lib/services/quest-generator");
    await QuestGenerator.replenishQuests(userId);
  }
}
