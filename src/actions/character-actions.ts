"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cache } from "react";

// cache() deduplicates identical DB calls within the same server request
async function resolveCharacterAndStats(userId: string) {
  let character = await prisma.character.findUnique({
    where: { userId },
    include: { stats: true, skills: { include: { skillNode: true } } }
  });

  if (!character) {
    character = await prisma.character.create({
      data: {
        userId,
        name: "Hero",
        class: "Novice",
        level: 1,
        xp: 0,
        stats: {
          create: {
            hp: 100,
            maxHp: 100,
            strength: 10,
            defense: 10,
            intelligence: 10,
            agility: 10,
            luck: 10
          }
        }
      },
      include: { stats: true, skills: { include: { skillNode: true } } }
    });
  } else if (!character.stats) {
    await prisma.characterStats.create({
      data: {
        characterId: character.id,
        hp: 100,
        maxHp: 100,
        strength: 10,
        defense: 10,
        intelligence: 10,
        agility: 10,
        luck: 10
      }
    });
    character = await prisma.character.findUnique({
      where: { userId },
      include: { stats: true, skills: { include: { skillNode: true } } }
    }) as any;
  }

  const moneyJar = await prisma.moneyJar.findUnique({ where: { userId } });
  if (!moneyJar) {
    await prisma.moneyJar.create({ data: { userId, coins: 100 } });
  }

  const inventory = await prisma.inventory.findUnique({ where: { userId } });
  if (!inventory) {
    await prisma.inventory.create({ data: { userId } });
  }

  return character;
}

export const getCharacterProfile = cache(async function getCharacterProfile() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const character = await resolveCharacterAndStats(session.user.id);
  if (!character) throw new Error("Character not found");

  const txs = await prisma.transaction.findMany({
    where: { userId: session.user.id, source: { startsWith: "BOSS_REWARD:" } }
  });
  const defeatedBossIds = new Set<string>(txs.map((t: any) => t.source.split(":")[1]));

  const { HeroAttributeEngine } = await import("@/lib/services/hero-attribute-engine");
  const heroAttributes = await HeroAttributeEngine.getHeroAttributes(session.user.id);

  const { WORLD_REGIONS, isRegionUnlocked } = await import("@/lib/world-engine");
  const playerStats = {
    knowledge: { level: heroAttributes.intelligence?.level || 1, xp: heroAttributes.intelligence?.xp || 0 },
    strength: { level: heroAttributes.strength?.level || 1, xp: heroAttributes.strength?.xp || 0 },
    health: { level: heroAttributes.health?.level || 1, xp: heroAttributes.health?.xp || 0 },
    discipline: { level: heroAttributes.discipline?.level || 1, xp: heroAttributes.discipline?.xp || 0 },
    finance: { level: heroAttributes.productivity?.level || 1, xp: heroAttributes.productivity?.xp || 0 },
    focus: { level: heroAttributes.focus?.level || 1, xp: heroAttributes.focus?.xp || 0 },
    creativity: { level: heroAttributes.creativity?.level || 1, xp: heroAttributes.creativity?.xp || 0 },
    charisma: { level: heroAttributes.charisma?.level || 1, xp: heroAttributes.charisma?.xp || 0 },
    wisdom: { level: heroAttributes.wisdom?.level || 1, xp: heroAttributes.wisdom?.xp || 0 },
    relationships: { level: 1, xp: 0 },
  };

  const unlockedRegions = WORLD_REGIONS.filter(region =>
    isRegionUnlocked(region, character.level, playerStats, defeatedBossIds)
  ).map(region => region.id);

  return {
    ...character,
    heroAttributes,
    unlockedRegions
  };
});

import { Prisma } from "@prisma/client";

export async function updateCharacterStats(stats: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const character = await prisma.character.findUnique({
    where: { userId: session.user.id },
    include: { stats: true }
  });

  if (!character?.stats) throw new Error("Character not found");

  await prisma.characterStats.update({
    where: { id: character.stats.id },
    data: stats as Prisma.CharacterStatsUpdateInput,
  });

  revalidatePath("/character");
  return { success: true };
}

export async function resetCharacterProgressAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  await prisma.$transaction([
    prisma.character.deleteMany({ where: { userId } }),
    prisma.inventory.deleteMany({ where: { userId } }),
    prisma.moneyJar.deleteMany({ where: { userId } }),
    prisma.streak.deleteMany({ where: { userId } }),
    prisma.pet.deleteMany({ where: { userId } }),
    prisma.achievementProgress.deleteMany({ where: { userId } }),
    prisma.questProgress.deleteMany({ where: { userId } }),
    prisma.bossProgress.deleteMany({ where: { userId } }),
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.aIInsight.deleteMany({ where: { userId } }),
  ]);

  revalidatePath("/");
  return { success: true };
}

export async function claimDailyRationAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const claimedLast24h = await prisma.analyticsEvent.findFirst({
    where: {
      userId,
      eventType: "DAILY_RATION_CLAIM",
      createdAt: { gte: twentyFourHoursAgo }
    }
  });

  if (claimedLast24h) {
    const nextClaimTime = new Date(claimedLast24h.createdAt.getTime() + 24 * 60 * 60 * 1000);
    const msDiff = nextClaimTime.getTime() - Date.now();
    const hoursRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60)));
    return { success: false, error: `Daily ration already claimed. Available in ${hoursRemaining}h.` };
  }

  const { FailsafeGuard } = await import("@/lib/failsafe/failsafe-guard");
  return await FailsafeGuard.runIdempotent(`daily_ration:${userId}`, 5000, async () => {
    const { UnifiedRewardEngine } = await import("@/lib/reward-engine/unified-reward-engine");
    const ration = UnifiedRewardEngine.getDailyRation();
    const xpReward = ration.xp;
    const goldReward = ration.coins;

    const result = await prisma.$transaction(async (tx) => {
      const breakdown = {
        transactionId: `tx_ration_${Date.now()}`,
        source: "DAILY_RATION_CLAIM",
        baseXp: xpReward,
        baseCoins: goldReward,
        skillXpBonus: 0,
        skillCoinBonus: 0,
        ascensionXpBonus: 0,
        ascensionCoinBonus: 0,
        finalXp: xpReward,
        finalCoins: goldReward,
        xpCapApplied: false,
        appliedModifiers: [],
        timestamp: Date.now()
      };

      const awardRes = await UnifiedRewardEngine.processAward(userId, breakdown, tx);

      // Grant Item (Consumable Energy Potion)
      let itemTemplate = await tx.item.findUnique({ where: { id: "consumable_energy_potion" } });
      if (!itemTemplate) {
        itemTemplate = await tx.item.create({
          data: {
            id: "consumable_energy_potion",
            name: "Consumable Energy Potion",
            description: "Restores energy instantly. Perfect for late-night questing.",
            type: "CONSUMABLE",
            rarity: "Common",
            value: 15
          }
        });
      }

      let inventory = await tx.inventory.findUnique({ where: { userId } });
      if (!inventory) {
        inventory = await tx.inventory.create({ data: { userId } });
      }

      const existingInvItem = await tx.inventoryItem.findFirst({
        where: { inventoryId: inventory.id, itemId: "consumable_energy_potion" }
      });

      if (existingInvItem) {
        await tx.inventoryItem.update({
          where: { id: existingInvItem.id },
          data: { quantity: { increment: 1 } }
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            inventoryId: inventory.id,
            itemId: "consumable_energy_potion",
            quantity: 1
          }
        });
      }

      // Log analytics
      await tx.analyticsEvent.create({
        data: {
          userId,
          eventType: "DAILY_RATION_CLAIM",
          payload: { xpReward, goldReward, awardRes }
        }
      });

      return { success: true, xpReward, goldReward, awardRes };
    });

    // 5. Evaluate achievements outside transaction to avoid P2028 timeouts
    try {
      const { RewardEngine } = await import("@/lib/services/reward-engine");
      await RewardEngine.checkAndUnlockAchievements(userId);
    } catch (achError) {
      console.error("Non-fatal achievement check failure:", achError);
    }

    return result;
  });
}

export async function ascendVillageAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const character = await prisma.character.findUnique({
    where: { userId }
  });

  if (!character) throw new Error("Character not found");
  if (character.level < 50) {
    return { success: false, error: "Must be at least level 50 to Ascend." };
  }

  const result = await prisma.$transaction(async (tx) => {
    return await tx.character.update({
      where: { userId },
      data: {
        rebirths: { increment: 1 },
        level: 1,
        xp: 0,
        villageLevel: { increment: 1 }
      }
    });
  });

  revalidatePath("/village");
  revalidatePath("/character");
  
  try {
    const { ChroniclesService } = await import("@/lib/services/chronicles-service");
    await ChroniclesService.createEntry(userId, "LEVEL_UP", "Level Up!", "Reached Level 1!");
    await ChroniclesService.createEntry(userId, "VILLAGE", "Village Upgraded", `Upgraded village building/level: Sanctuary to level ${result.villageLevel}.`);
  } catch (err) {
    console.error("Failed to log village chronicles:", err);
  }

  return { success: true, data: result };
}

export async function awardPlayerXpAction(userId: string, xpAmount: number, coinAmount: number = 0) {
  try {
    const character = await prisma.character.findUnique({ where: { userId } });
    if (!character) return { success: false };

    const newXp = character.xp + xpAmount;
    let newLevel = character.level;
    let nextLevelXp = newLevel * 100;
    let xpRemaining = newXp;

    while (xpRemaining >= nextLevelXp) {
      xpRemaining -= nextLevelXp;
      newLevel += 1;
      nextLevelXp = newLevel * 100;
    }

    await prisma.character.update({
      where: { userId },
      data: {
        level: newLevel,
        xp: xpRemaining,
      },
    });

    if (coinAmount > 0) {
      await prisma.moneyJar.upsert({
        where: { userId },
        create: { userId, coins: coinAmount },
        update: { coins: { increment: coinAmount } },
      });
    }

    revalidatePath("/character");
    return { success: true, newLevel, xpRemaining };
  } catch (err) {
    console.error("Error in awardPlayerXpAction:", err);
    return { success: false };
  }
}
