import "server-only";
import { prisma } from "@/lib/prisma";
import { ActionResponse, successResponse, errorResponse } from "@/lib/actions-utils";
import { UnifiedRewardEngine } from "@/lib/reward-engine/unified-reward-engine";
import { FailsafeGuard } from "@/lib/failsafe/failsafe-guard";

export class QuestService {
  /**
   * Completes a quest for a user atomically with Failsafe protection.
   */
  static async completeQuest(userId: string, questIdOrProgressId: string): Promise<ActionResponse<unknown>> {
    const lockKey = `quest_complete:${userId}:${questIdOrProgressId}`;
    return await FailsafeGuard.runIdempotent(lockKey, 5000, async () => {
      try {
        return await prisma.$transaction(async (tx) => {
          // Resolve QuestProgress robustly
          let progress = await tx.questProgress.findUnique({
            where: { id: questIdOrProgressId },
            include: { quest: true }
          });

          if (!progress) {
            progress = await tx.questProgress.findFirst({
              where: { userId, questId: questIdOrProgressId },
              include: { quest: true }
            });
          }

          if (!progress) {
            // Find by quest template directly if no progress exists yet
            const questTemplate = await tx.quest.findUnique({
              where: { id: questIdOrProgressId }
            });
            if (!questTemplate) {
              throw new Error("Quest not found");
            }
            progress = await tx.questProgress.create({
              data: {
                userId,
                questId: questTemplate.id,
                status: "ACTIVE",
                progress: 0,
                target: 1
              },
              include: { quest: true }
            });
          }

          const quest = progress.quest;
          if (!quest) throw new Error("Quest template not found");

          const user = await tx.user.findUnique({
            where: { id: userId },
            include: { character: true, moneyJar: true }
          });

          if (!user || !user.character || !user.moneyJar) {
            throw new Error("User character or money jar not initialized");
          }

          if (progress.status === "COMPLETED") {
            throw new Error("Quest already completed");
          }

          // Update Progress
          await tx.questProgress.update({
            where: { id: progress.id },
            data: { status: "COMPLETED", completedAt: new Date(), progress: progress.target }
          });

          let bObj: any = user.character?.buildings || {};
          if (typeof bObj === "string") {
            try { bObj = JSON.parse(bObj); } catch (e) { bObj = {}; }
          }
          const activeSkillIds = bObj.activeSkillIds || [];
          const ascensionCount = Math.max(user.character?.prestige || 0, user.character?.rebirths || 0);

          const difficulty = UnifiedRewardEngine.inferDifficulty({
            difficulty: (quest as any).difficulty,
            priority: (quest as any).priority
          });
          const norm = UnifiedRewardEngine.normalizeRewards(quest.xpReward, quest.coinReward, difficulty);

          const breakdown = UnifiedRewardEngine.calculateRewardBreakdown({
            baseXp: norm.xp,
            baseCoins: norm.coins,
            activeSkillIds,
            ascensionCount,
            source: `QUEST_REWARD:${quest.id}`
          });

          // 4. Atomically Award via UnifiedRewardEngine
          const awardRes = await UnifiedRewardEngine.processAward(userId, breakdown, tx);

          // 5. Log Analytics & Chronicles
          await tx.analyticsEvent.create({
            data: {
              userId,
              eventType: "QUEST_COMPLETED",
              payload: JSON.parse(JSON.stringify({ questId: quest.id, xpGained: breakdown.finalXp, coinsGained: breakdown.finalCoins, breakdown }))
            }
          });

          const { ChroniclesService } = await import("./chronicles-service");
          const modSummary = breakdown.appliedModifiers.map(m => `${m.name}: ${m.value}`).join(", ");
          await ChroniclesService.createEntry(
            userId,
            "QUEST",
            `Completed Quest: ${quest.title}`,
            `Earned +${breakdown.finalXp} XP (Base: ${breakdown.baseXp}) and +${breakdown.finalCoins} Coins (Base: ${breakdown.baseCoins}). Modifiers: ${modSummary || 'Standard'}`
          );

          const { NotificationService } = await import("./notification-service");
          await NotificationService.send(
            userId,
            "🎉 Quest Completed",
            `You completed "${quest.title}" and earned +${breakdown.finalXp} XP and +${breakdown.finalCoins} Coins.`,
            "QUEST_COMPLETED",
            tx
          );

          return successResponse({
            xpGained: breakdown.finalXp,
            coinsGained: breakdown.finalCoins,
            breakdown,
            newTotalXp: awardRes.newXP,
            levelUp: awardRes.didLevelUp,
            newLevel: awardRes.didLevelUp ? awardRes.newLevel : null,
            bossHpLeft: 0,
            bossDamageDealt: 0,
            bossDefeated: false
          });
        });
      } catch (error) {
        return errorResponse((error as Error).message || "Failed to complete quest");
      }
    });
  }
}
