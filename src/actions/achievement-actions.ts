"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { AchievementProgress, Streak } from "@prisma/client";
import { ACHIEVEMENT_DEFINITIONS, type AchievementDefinition } from "@/lib/achievement-engine";
import { RewardEngine } from "@/lib/services/reward-engine";

export interface AchievementItemDTO {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  requirement: number;
  rewards: { xp: number; coins: number };
  isUnlocked: boolean;
  progress: number;
  unlockedAt: Date | null;
}

export async function getAchievementsAction(): Promise<AchievementItemDTO[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  await RewardEngine.checkAndUnlockAchievements(userId);

  const [
    userProgress,
    character,
    completedQuestsCount,
    defeatedBossesCount,
    streaks,
    petCount,
    itemCount,
    skillsCount,
    moneyJar
  ] = await Promise.all([
    prisma.achievementProgress.findMany({ where: { userId } }),
    prisma.character.findUnique({
      where: { userId },
      include: { stats: true }
    }),
    prisma.questProgress.count({
      where: { userId, status: "COMPLETED" }
    }),
    prisma.chronicle.count({
      where: { userId, type: "BATTLE", title: { startsWith: "Defeated" } }
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

  const progressMap = new Map<string, AchievementProgress>(
    userProgress.map((p) => [p.achievementId, p])
  );
  const maxStreak = streaks.reduce((max: number, s: Streak) => Math.max(max, s.best || 0), 0);
  const totalCoins = moneyJar?.coins ?? 0;

  const getLiveProgress = (def: AchievementDefinition): number => {
    const cond = def.condition;
    switch (cond.type) {
      case "quests_completed": return completedQuestsCount;
      case "bosses_defeated": return defeatedBossesCount;
      case "streak_count": return maxStreak;
      case "level_reached": return character?.level ?? 1;
      case "coins_accumulated": return totalCoins;
      case "pets_owned": return petCount;
      case "items_owned": return itemCount;
      case "total_xp": return character?.xp ?? 0;
      case "skills_unlocked": return skillsCount;
      case "stat_level": {
        const stats = character?.stats;
        if (!stats) return 1;
        if (cond.stat === "strength") return stats.strength;
        if (cond.stat === "discipline") return stats.defense;
        if (cond.stat === "knowledge") return stats.intelligence;
        if (cond.stat === "health") return stats.hp;
        return 1;
      }
      default: return 0;
    }
  };

  return ACHIEVEMENT_DEFINITIONS.map((def): AchievementItemDTO => {
    const progressRecord = progressMap.get(def.id);
    const isUnlocked = progressRecord?.isUnlocked ?? false;
    const liveProg = isUnlocked ? def.condition.threshold : getLiveProgress(def);

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      iconUrl: def.icon,
      category: def.category,
      requirement: def.condition.threshold,
      rewards: def.rewards,
      isUnlocked,
      progress: liveProg,
      unlockedAt: progressRecord?.unlockedAt ?? null,
    };
  });
}
