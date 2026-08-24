import { prisma } from "@/lib/prisma";
import { CAMPAIGN_DEFINITIONS, CampaignDefinition } from "@/lib/campaign-definitions";

export class CampaignService {
  /**
   * Calculates progress and completion state dynamically from live player data.
   */
  static async getCampaignStatuses(userId: string) {
    const character = await prisma.character.findUnique({
      where: { userId }
    });
    if (!character) throw new Error("Character not found");

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }
    const completedIds = new Set<string>(buildingsObj.completedCampaigns || []);

    // 1. Fetch all live player metrics in parallel
    const [
      questsCompletedCount,
      bossesDefeatedCount,
      focusDurationSum,
      moneyJar,
      skillsCount,
      streaks
    ] = await Promise.all([
      prisma.questProgress.count({
        where: { userId, status: "COMPLETED" }
      }),
      prisma.chronicle.count({
        where: { userId, type: "BATTLE", title: { startsWith: "Defeated" } }
      }),
      prisma.focusSession.aggregate({
        where: { userId },
        _sum: { duration: true }
      }),
      prisma.moneyJar.findUnique({
        where: { userId }
      }),
      prisma.skill.count({
        where: { character: { userId } }
      }),
      prisma.streak.findMany({
        where: { userId }
      })
    ]);

    const maxStreak = streaks.reduce((max: number, s: any) => Math.max(max, s.best || 0), 0);
    const totalCoins = moneyJar?.coins || 0;
    const focusMinutes = focusDurationSum._sum.duration || 0;
    const playerLevel = character.level;

    // Helper to extract live progress per metric
    const getMetricValue = (metric: string) => {
      switch (metric) {
        case "quests_completed": return questsCompletedCount;
        case "bosses_defeated": return bossesDefeatedCount;
        case "focus_minutes": return focusMinutes;
        case "coins_saved": return totalCoins;
        case "skills_unlocked": return skillsCount;
        case "level_reached": return playerLevel;
        case "streak_days": return maxStreak;
        default: return 0;
      }
    };

    const campaignResults = [];

    for (const def of CAMPAIGN_DEFINITIONS) {
      const currentVal = getMetricValue(def.targetMetric);
      const isCompleted = completedIds.has(def.id);
      const isUnlocked = playerLevel >= def.requiredLevel;

      // Progress percentage
      const progressPercent = Math.min(100, Math.floor((currentVal / def.targetValue) * 100));

      campaignResults.push({
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        difficulty: def.difficulty,
        requiredLevel: def.requiredLevel,
        icon: def.icon,
        targetMetric: def.targetMetric,
        targetValue: def.targetValue,
        currentValue: currentVal,
        progressPercent,
        isUnlocked,
        isCompleted,
        weeklyMilestones: def.weeklyMilestones,
        rewards: def.finalReward
      });
    }

    return campaignResults;
  }

  /**
   * Idempotent progression check to auto-claim and complete campaigns if conditions are met.
   */
  static async evaluateAndClaimCampaigns(userId: string) {
    const character = await prisma.character.findUnique({
      where: { userId }
    });
    if (!character) return;

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }
    const completedCampaigns: string[] = buildingsObj.completedCampaigns || [];

    const statuses = await CampaignService.getCampaignStatuses(userId);
    let updated = false;

    for (const stat of statuses) {
      if (stat.progressPercent >= 100 && !completedCampaigns.includes(stat.id)) {
        // Complete campaign inside an atomic transaction
        await prisma.$transaction(async (tx) => {
          // Re-lock and read character row
          const char = await tx.character.findUnique({ where: { userId } });
          if (!char) return;

          let bObj: any = char.buildings || {};
          if (typeof bObj === "string") {
            try { bObj = JSON.parse(bObj); } catch (e) { bObj = {}; }
          }
          const completedList: string[] = bObj.completedCampaigns || [];

          if (completedList.includes(stat.id)) return; // Double check

          completedList.push(stat.id);
          bObj.completedCampaigns = completedList;

          // Award Title if provided
          if (stat.rewards.title) {
            const currentTitles = bObj.titles || [];
            if (!currentTitles.includes(stat.rewards.title)) {
              currentTitles.push(stat.rewards.title);
            }
            bObj.titles = currentTitles;
          }

          await tx.character.update({
            where: { id: char.id },
            data: { buildings: bObj }
          });

          // Award XP
          const { ProgressionService } = await import("./progression-service");
          await ProgressionService.awardXPRaw(userId, stat.rewards.xp, tx);

          // Award Coins
          if (stat.rewards.coins > 0) {
            const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
            if (moneyJar) {
              await tx.moneyJar.update({
                where: { id: moneyJar.id },
                data: { coins: { increment: stat.rewards.coins } }
              });
              await tx.transaction.create({
                data: {
                  userId,
                  amount: stat.rewards.coins,
                  type: "EARN",
                  source: `CAMPAIGN_COMPLETED:${stat.id}`
                }
              });
            }

            const { QuestEngine } = await import("./quest-engine");
            await QuestEngine.emit({ userId, type: "CAMPAIGN_COMPLETED", value: 1 }, tx);
          }

          // Chronicles Log
          const { ChroniclesService } = await import("./chronicles-service");
          await ChroniclesService.createEntry(
            userId,
            "QUEST",
            `Campaign Completed: ${stat.name}`,
            `Mastered the campaign "${stat.name}"! (+${stat.rewards.xp} XP, +${stat.rewards.coins} Coins)`
          );

          // Central Notification
          const { NotificationService } = await import("./notification-service");
          await NotificationService.send(
            userId,
            "🏆 Campaign Completed!",
            `Successfully completed "${stat.name}" campaign!`,
            "CAMPAIGN_COMPLETE",
            tx
          );
        }, {
          timeout: 15000,
          maxWait: 5000
        });

        completedCampaigns.push(stat.id);
        updated = true;
      }
    }
  }
}
