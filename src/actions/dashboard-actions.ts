"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { gameMath } from "@/lib/game-math";

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // Process daily activity streak deterministically
  const { StreakService } = await import("@/lib/services/streak-service");
  await StreakService.processDailyActivity(userId).catch((e) => console.error("Streak processing error:", e));
  StreakService.reconcileUserStreaks(userId).catch((e) => console.error("Streak reconcile error:", e));

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [profile, quests, streaks, moneyJar, unlockedRegions, claimedLast24h] = await Promise.all([
      (async () => {
        const { ProgressionService } = await import("@/lib/services/progression-service");
        ProgressionService.validateAndRepairProgression(userId).catch((e) => console.error("Repair error:", e));

        const char = await prisma.character.findUnique({
          where: { userId },
          include: { stats: true, skills: true },
        });

        const globalQuests = await prisma.quest.findMany({ where: { isGlobal: true }, select: { id: true } });
        const existingProgresses = await prisma.questProgress.findMany({
          where: { userId, questId: { in: globalQuests.map(q => q.id) } },
          select: { questId: true }
        });
        const existingQuestIds = new Set(existingProgresses.map(p => p.questId));
        const questsToCreate = globalQuests.filter(q => !existingQuestIds.has(q.id));
        if (questsToCreate.length > 0) {
          await prisma.questProgress.createMany({
            data: questsToCreate.map(q => ({ userId, questId: q.id, status: "ACTIVE" })),
            skipDuplicates: true,
          });
        }
        return char;
      })(),
      (async () => {
        const char = await prisma.character.findUnique({ where: { userId }, select: { buildings: true, prestige: true, rebirths: true } });
        let bObj: any = char?.buildings || {};
        if (typeof bObj === "string") {
          try { bObj = JSON.parse(bObj); } catch (e) { bObj = {}; }
        }
        const activeSkillIds = bObj.activeSkillIds || [];
        const ascensionCount = Math.max(char?.prestige || 0, char?.rebirths || 0);

        const { UnifiedRewardEngine } = await import("@/lib/reward-engine/unified-reward-engine");

        const progresses = await prisma.questProgress.findMany({
          where: { userId, status: "ACTIVE" },
          include: { quest: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });

        return progresses.map(p => {
          const { RewardPolicy } = require("@/lib/services/reward-policy");
          const difficulty = UnifiedRewardEngine.inferDifficulty({
            difficulty: (p.quest as any).difficulty,
            priority: (p.quest as any).priority
          });
          const norm = RewardPolicy.normalizeRewards(p.quest.xpReward, p.quest.coinReward, difficulty);
          const breakdown = UnifiedRewardEngine.calculateRewardBreakdown({
            baseXp: norm.xp,
            baseCoins: norm.coins,
            activeSkillIds,
            ascensionCount,
            source: `QUEST:${p.quest.id}`
          });

          return {
            id: p.id,
            progressId: p.id,
            questId: p.questId,
            title: p.quest.title,
            description: p.quest.description,
            baseXpReward: norm.xp,
            baseCoinReward: norm.coins,
            xpReward: breakdown.finalXp,
            coinReward: breakdown.finalCoins,
            breakdown,
            type: p.quest.type,
            target: p.target,
            progress: p.progress,
            userId: p.userId,
            createdAt: p.createdAt.toISOString()
          };
        });
      })(),
      prisma.streak.findMany({
        where: { userId, isArchived: false },
      }),
      prisma.moneyJar.findUnique({
        where: { userId },
      }),
      prisma.worldRegion.findMany({
        where: { userId, unlocked: true },
        select: { regionId: true }
      }).then(list => list.map(r => r.regionId)),
      prisma.analyticsEvent.findFirst({
        where: {
          userId,
          eventType: "DAILY_RATION_CLAIM",
          createdAt: { gte: twentyFourHoursAgo }
        }
      })
    ]);

    const nextDailyRationClaimAt = claimedLast24h 
      ? new Date(claimedLast24h.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    const levelProgress = gameMath.levelProgress(profile?.xp || 0);
    const strokeDashoffset = Number((251.2 - (251.2 * levelProgress.percentage) / 100).toFixed(2));
    const dayIndex = new Date().getUTCDay();

    const { CANONICAL_REWARDS } = await import("@/lib/services/reward-engine");

    return {
      profile: {
        ...profile,
        unlockedRegions: unlockedRegions || ["starting_village"]
      },
      quests: quests || [],
      streaks: streaks || [],
      moneyJar: moneyJar || { coins: 0 },
      dailyRewardClaimed: !!claimedLast24h,
      dailyRationReward: CANONICAL_REWARDS.DAILY_RATION,
      nextDailyRationClaimAt,
      levelProgress,
      strokeDashoffset,
      dayIndex
    };
  } catch (error) {
    console.error("[DashboardDataError] Non-fatal fallback triggered:", error);
    const levelProgress = gameMath.levelProgress(0);
    return {
      profile: {
        id: "",
        userId: "",
        level: 1,
        xp: 0,
        coins: 0,
        class: "Adventurer",
        stats: null,
        unlockedRegions: ["starting_village"]
      },
      quests: [],
      streaks: [],
      moneyJar: { coins: 0 },
      dailyRewardClaimed: false,
      nextDailyRationClaimAt: null,
      levelProgress,
      strokeDashoffset: 251.2,
      dayIndex: 0
    };
  }
}
