"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getAchievementsAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const { RewardEngine } = await import("@/lib/services/reward-engine");
  await RewardEngine.checkAndUnlockAchievements(userId);

  const { ACHIEVEMENT_DEFINITIONS } = await import("@/lib/achievement-engine");

  const userProgress = await prisma.achievementProgress.findMany({ where: { userId } });
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { stats: true }
  });
  const completedQuestsCount = await prisma.questProgress.count({
    where: { userId, status: "COMPLETED" }
  });
  const defeatedBossesCount = await prisma.chronicle.count({
    where: { userId, type: "BATTLE", title: { startsWith: "Defeated" } }
  });
  const streaks = await prisma.streak.findMany({
    where: { userId }
  });
  const petCount = await prisma.pet.count({
    where: { userId }
  });
  const itemCount = await prisma.inventoryItem.count({
    where: { inventory: { userId } }
  });
  const skillsCount = await prisma.skill.count({
    where: { character: { userId } }
  });

  const progressMap = new Map(userProgress.map((p: any) => [p.achievementId, p]));
  const maxStreak = streaks.reduce((max: number, s: any) => Math.max(max, s.best || 0), 0);
  const totalCoins = await prisma.moneyJar.findUnique({ where: { userId } }).then((m: any) => m?.coins || 0);

  const getLiveProgress = (def: any) => {
    const cond = def.condition;
    switch (cond.type) {
      case "quests_completed": return completedQuestsCount;
      case "bosses_defeated": return defeatedBossesCount;
      case "streak_count": return maxStreak;
      case "level_reached": return character?.level || 1;
      case "coins_accumulated": return totalCoins;
      case "pets_owned": return petCount;
      case "items_owned": return itemCount;
      case "total_xp": return character?.xp || 0;
      case "skills_unlocked": return skillsCount;
      case "stat_level": {
        const stats = character?.stats as any;
        if (!stats) return 1;
        const statKey = cond.stat;
        return stats[statKey]?.level ?? 1;
      }
      default: return 0;
    }
  };

  return ACHIEVEMENT_DEFINITIONS.map(def => {
    const progressRecord = progressMap.get(def.id);
    const liveProg = progressRecord?.isUnlocked ? (def.condition.threshold) : getLiveProgress(def);

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      iconUrl: def.icon,
      category: def.category,
      requirement: def.condition.threshold,
      rewards: def.rewards,
      isUnlocked: progressRecord?.isUnlocked || false,
      progress: liveProg,
      unlockedAt: progressRecord?.unlockedAt || null,
    };
  });
}
