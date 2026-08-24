"use server";

import type { StatName } from "@/types";

import { prisma } from "@/lib/prisma";
import { calculateLevel } from "@/lib/game-engine";
import { rollLoot, LOOT_TEMPLATES } from "@/lib/loot-engine";
import { SKILL_NODES, canUnlockNode } from "@/lib/skill-engine";
import { WORLD_REGIONS, isRegionUnlocked } from "@/lib/world-engine";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { WriteCoordinator } from "@/lib/services/write-coordinator";


async function requireAuth(userId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error("Unauthorized");
  }
}


export async function getActionLogsAction(userId: string) {
  await requireAuth(userId);
  try {
    const events = await prisma.analyticsEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    
    return events.map(e => ({
      id: e.id,
      type: e.eventType.toLowerCase(),
      message: (e.payload as Record<string, unknown>)?.message || `Event: ${e.eventType}`,
      createdAt: e.createdAt
    }));
  } catch (error) {
    console.error("Error in getActionLogsAction:", error);
    return [];
  }
}


export async function completeQuestAction(userId: string, progressId: string) {
  await requireAuth(userId);
  try {
    const result = (await WriteCoordinator.enqueue(async () => {
      const progress = await prisma.questProgress.findUnique({
        where: { id: progressId }
      });

      if (!progress || progress.status !== "ACTIVE") {
        throw new Error("Quest is not active");
      }

      const { QuestService } = await import("@/lib/services/quest-service");
      const serviceRes = await QuestService.completeQuest(userId, progress.questId);
      if (!serviceRes.success) {
        throw new Error(serviceRes.error);
      }
      return serviceRes.data;
    })) as { xpGained: number; coinsGained: number; levelUp: boolean; newLevel: number | null };

    return {
      success: true,
      xpGained: result.xpGained,
      coinsGained: result.coinsGained,
      levelUp: result.levelUp,
      newLevel: result.newLevel || undefined
    };
  } catch (error) {
    console.error("Error in completeQuestAction:", error);
    const msg = error instanceof Error ? (error as Error).message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

export async function getQuestsAction(userId: string) {
  await requireAuth(userId);
  try {
    const progress = await prisma.questProgress.findMany({
      where: { userId, status: "ACTIVE" },
      include: { quest: true },
      orderBy: { createdAt: "desc" }
    });

    return progress.map(p => ({
      id: p.id,
      questId: p.questId,
      title: p.quest.title,
      description: p.quest.description,
      type: p.quest.type,
      difficulty: "medium", // Default mock
      xpReward: p.quest.xpReward,
      coinReward: p.quest.coinReward,
      status: p.status.toLowerCase(),
      stat: "knowledge", // Mock
      createdAt: p.createdAt
    }));
  } catch (error) {
    console.error("Error in getQuestsAction:", error);
    return [];
  }
}

export async function dealBossDamageAction(userId: string, bossId: string, damage: number) {
  await requireAuth(userId);
  try {
    if (damage <= 0 || !Number.isInteger(damage)) {
      throw new Error("Invalid damage amount");
    }
    const result = await WriteCoordinator.enqueue(async () => {
      const { BossService } = await import("@/lib/services/boss-service");
      const combatRes = await BossService.attackBoss(userId, bossId, damage);
      
      return {
        success: combatRes.success,
        newHP: combatRes.bossHp,
        defeated: combatRes.isDefeated,
        drop: null,
        levelUp: !!combatRes.rewards,
        newLevel: null,
        xpReward: combatRes.rewards?.xp || 0,
        coinReward: combatRes.rewards?.coins || 0
      };
    }, { resource: `user_${userId}` });

    return result;
  } catch (error) {
    console.error("Error in dealBossDamageAction:", error);
    const msg = error instanceof Error ? (error as Error).message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

export async function getBossesAction(userId: string) {
  await requireAuth(userId);
  try {
    const { ensureBossesSeeded } = await import("./boss-actions");
    await ensureBossesSeeded();

    const { BossService } = await import("@/lib/services/boss-service");
    return await BossService.getBosses(userId);
  } catch (error) {
    console.error("Error in getBossesAction:", error);
    return [];
  }
}


export async function depositMoneyAction(userId: string, amount: number, reason: string) {
  await requireAuth(userId);
  try {
    const result = await WriteCoordinator.enqueue(async () => {
      return prisma.$transaction(async (tx) => {
        let moneyJar = await tx.moneyJar.findUnique({
          where: { userId }
        });
        
        if (!moneyJar) {
          moneyJar = await tx.moneyJar.create({
            data: { userId }
          });
        }

        const newSaved = moneyJar.realMoneySaved + amount;
        
        await tx.moneyJar.update({
          where: { userId },
          data: { realMoneySaved: newSaved }
        });
        
        await tx.transaction.create({
          data: {
            userId,
            amount,
            currency: moneyJar.currency,
            type: 'EARN',
            source: reason
          }
        });
        
        return { success: true, newSaved };
      });
    }, { resource: `user_${userId}` });
    
    return result;
  } catch (error) {
    console.error("Error in depositMoneyAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getMoneyJarDataAction(userId: string) {
  await requireAuth(userId);
  try {
    const moneyJar = await prisma.moneyJar.findUnique({
      where: { userId }
    });
    
    // Legacy IRL Transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId, currency: { not: 'VAULT' } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Vault Transactions
    const vaultTransactions = await prisma.transaction.findMany({
      where: { userId, currency: 'VAULT' },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    return {
      moneyJar: moneyJar || { id: "new", userId, coins: 0, gems: 0, vaultCoins: 0, vaultHighest: 0, realMoneySaved: 0, realMoneyGoal: 10000, currency: "USD", createdAt: new Date(), updatedAt: new Date() },
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        reason: t.source,
        createdAt: t.createdAt
      })),
      vaultTransactions: vaultTransactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        reason: t.source,
        createdAt: t.createdAt
      }))
    };
  } catch (error) {
    console.error("Error in getMoneyJarDataAction:", error);
    return { moneyJar: null, transactions: [], vaultTransactions: [] };
  }
}

export async function getScheduleBlocksAction(userId: string) {
  await requireAuth(userId);
  try {
    const schedule = await prisma.schedule.findFirst({
      where: { userId },
      include: { events: true }
    });
    
    if (!schedule) return [];

    return schedule.events.map(event => {
      const durationMins = Math.round((event.endTime.getTime() - event.startTime.getTime()) / 60000);
      const hours = event.startTime.getHours().toString().padStart(2, '0');
      const minutes = event.startTime.getMinutes().toString().padStart(2, '0');
      const startTimeStr = `${hours}:${minutes}`;
      
      return {
        id: event.id,
        title: event.title,
        startTime: startTimeStr,
        durationMins,
        statCategory: (event.description || "general") as StatName | "general",
        isActive: false,
        createdAt: event.createdAt
      };
    });
  } catch (error) {
    console.error("Error in getScheduleBlocksAction:", error);
    return [];
  }
}

export async function getCharacterAction(userId: string) {
  await requireAuth(userId);
  try {
    let character = await prisma.character.findUnique({
      where: { userId },
      include: { stats: true, skills: true }
    });
    
    if (!character) return null;

    // Check for level/points mismatch to trigger self-healing repair
    const { gameMath } = await import("@/lib/game-math");
    const computedLevel = gameMath.levelFromXP(character.xp);
    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }
    const currentTotalPoints = (buildingsObj?.skillsProgression?.general?.points || 0) + (buildingsObj?.skillsProgression?.general?.spent || 0);
    const expectedMinimumPoints = (computedLevel - 1) * 10;

    if (character.level !== computedLevel || (character.villageLevel || 1) < computedLevel || currentTotalPoints < expectedMinimumPoints) {
      const { ProgressionService } = await import("@/lib/services/progression-service");
      await prisma.$transaction(async (tx) => {
        await ProgressionService.validateAndRepairProgressionInternal(userId, tx);
      });
      // Re-read character
      character = await prisma.character.findUnique({
        where: { userId },
        include: { stats: true, skills: true }
      });
      if (!character) return null;
      buildingsObj = character.buildings || {};
      if (typeof buildingsObj === "string") {
        try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
      }
    }

    // Fetch MoneyJar for coins/gems
    const moneyJar = await prisma.moneyJar.findUnique({ where: { userId } });
    const prog = buildingsObj.skillsProgression || {};
    let totalPoints = prog.general?.points || 0;
    const categories = ["knowledge", "discipline", "strength", "productivity", "creativity", "social", "health", "finance"];
    for (const cat of categories) {
      if (prog[cat]) {
        totalPoints += prog[cat].points || 0;
      }
    }

    // Map to CharacterProfile for backwards compatibility in UI
    const canonicalPrestige = Math.max(character.prestige || 0, character.rebirths || 0);
    return {
      userId,
      level: character.level,
      prestige: canonicalPrestige,
      rebirths: canonicalPrestige,
      totalXP: character.xp,
      coins: moneyJar?.coins || 0,
      gems: moneyJar?.gems || 0,
      className: character.class,
      skillPoints: totalPoints,
      unlockedSkills: character.skills.map(s => s.skillNodeId),
      stats: {
        knowledge: { level: character.stats?.intelligence || 1, xp: 0 },
        strength: { level: character.stats?.strength || 1, xp: 0 },
        health: { level: character.stats?.defense || 1, xp: 0 },
        discipline: { level: character.stats?.agility || 1, xp: 0 },
        finance: { level: character.stats?.luck || 1, xp: 0 },
        focus: { level: 1, xp: 0 },
        creativity: { level: 1, xp: 0 },
        charisma: { level: 1, xp: 0 },
        wisdom: { level: 1, xp: 0 },
        relationships: { level: 1, xp: 0 },
      }
    };
  } catch (error) {
    console.error("Error in getCharacterAction:", error);
    return null;
  }
}

export async function getInventoryAction(userId: string) {
  await requireAuth(userId);
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { inventory: { userId } },
      include: { item: true }
    });
    return items.map(i => ({
      id: i.id,
      name: i.item.name,
      description: i.item.description,
      type: i.item.type.toLowerCase(),
      rarity: i.item.rarity,
      equipped: i.isEquipped,
      stats: { value: i.item.value },
      slot: "main_hand" // mock
    }));
  } catch (error) {
    console.error("Error in getInventoryAction:", error);
    return [];
  }
}

export async function getPetsAction(userId: string) {
  await requireAuth(userId);
  try {
    const pets = await prisma.pet.findMany({
      where: { userId }
    });
    return pets.map(p => ({
      id: p.id,
      name: p.name,
      species: p.species,
      level: p.level,
      xp: p.xp,
      active: p.isEquipped
    }));
  } catch (error) {
    console.error("Error in getPetsAction:", error);
    return [];
  }
}

export async function getStreaksAction(userId: string) {
  await requireAuth(userId);
  try {
    const streaks = await prisma.streak.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return streaks.map(s => ({
      id: s.id,
      name: s.name,
      currentCount: s.current,
      bestCount: s.best,
      stat: s.name as StatName,
      lastCheckin: s.lastCheckin,
      createdAt: s.createdAt
    }));
  } catch (error) {
    console.error("Error in getStreaksAction:", error);
    return [];
  }
}

export async function getAchievementsAction(userId: string) {
  await requireAuth(userId);
  try {
    const progress = await prisma.achievementProgress.findMany({
      where: { userId },
      include: { achievement: true }
    });
    return progress.map(p => ({
      id: p.id,
      templateId: p.achievementId,
      name: p.achievement.name,
      description: p.achievement.description,
      progress: p.progress,
      isUnlocked: p.isUnlocked,
      unlockedAt: p.unlockedAt
    }));
  } catch (error) {
    console.error("Error in getAchievementsAction:", error);
    return [];
  }
}

export async function equipItemAction(userId: string, itemId: string, slot: string) {
  await requireAuth(userId);
  try {
    const result = await WriteCoordinator.enqueue(async () => {
      return prisma.$transaction(async (tx) => {
        // Find all equipped items in this slot
        const equipped = await tx.inventoryItem.findMany({
          where: { inventory: { userId }, isEquipped: true },
          include: { item: true }
        });

        // Unequip items in the same slot (simplified mock logic)
        for (const item of equipped) {
          if (item.item.description.includes(slot)) { // Mock check
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: { isEquipped: false }
            });
          }
        }

        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { isEquipped: true }
        });

        return { success: true };
      });
    }, { resource: `user_${userId}` });
    return result;
  } catch (error) {
    console.error("Error in equipItemAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function setPetActiveAction(userId: string, petId: string) {
  await requireAuth(userId);
  try {
    const result = await WriteCoordinator.enqueue(async () => {
      return prisma.$transaction(async (tx) => {
        await tx.pet.updateMany({
          where: { userId },
          data: { isEquipped: false }
        });

        await tx.pet.update({
          where: { id: petId },
          data: { isEquipped: true }
        });

        return { success: true };
      });
    }, { resource: `user_${userId}` });
    return result;
  } catch (error) {
    console.error("Error in setPetActiveAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function unlockAchievementAction(userId: string, achievementId: string) {
  await requireAuth(userId);
  try {
    await prisma.achievementProgress.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      create: { userId, achievementId, isUnlocked: true, unlockedAt: new Date() },
      update: { isUnlocked: true, unlockedAt: new Date() }
    });
    return { success: true };
  } catch (error) { return { success: false }; }
}

export async function flushAnalyticsEventsAction(userId: string, events: unknown[]) {
  await requireAuth(userId);
  try {
    if (!events.length) return { success: true };
    await prisma.analyticsEvent.createMany({
      data: events.map(e => {
        const evt = e as { event: string; metadata?: Record<string, unknown> };
        return { userId, eventType: evt.event, payload: (evt.metadata || {}) as Prisma.InputJsonValue };
      })
    });
    return { success: true };
  } catch (error) { return { success: false }; }
}

export async function getEventCountAction(userId: string, eventType: string, daysAgo: number) {
  await requireAuth(userId);
  try {
    const date = new Date(); date.setDate(date.getDate() - daysAgo);
    return await prisma.analyticsEvent.count({ where: { userId, eventType, createdAt: { gte: date } } });
  } catch (error) { return 0; }
}

export async function completeOnboardingAction(userId: string, data: unknown) {
  await requireAuth(userId);
  try {
    const onboardingData = data as { displayName?: string; className?: string };
    const result = await WriteCoordinator.enqueue(async () => {
      return prisma.$transaction(async (tx) => {
        let character = await tx.character.findUnique({ where: { userId } });
        if (!character) {
          character = await tx.character.create({
            data: {
              userId,
              name: onboardingData.displayName || "Adventurer",
              class: onboardingData.className || "Novice",
              xp: 0,
              level: 1
            }
          });
        } else {
          character = await tx.character.update({
            where: { userId },
            data: { class: onboardingData.className || "Novice", name: onboardingData.displayName || character.name }
          });
        }

        // Initialize MoneyJar
        await tx.moneyJar.upsert({
          where: { userId },
          create: { userId, coins: 100 },
          update: {}
        });
        
        return { success: true };
      });
    }, { resource: `user_${userId}` });
    return result;
  } catch (error) {
    return { success: false };
  }
}

export async function generateCoachInsightsAction(userId: string) {
  await requireAuth(userId);
  try {
    const profile = await getCharacterAction(userId);
    
    // Fetch user details for context-aware AI coaching
    const streaks = await prisma.streak.findMany({
      where: { userId, isArchived: false }
    });
    
    const moneyJar = await prisma.moneyJar.findUnique({
      where: { userId }
    });

    const completedQuests = await prisma.questProgress.findMany({
      where: { userId, status: "COMPLETED" },
      include: { quest: true },
      orderBy: { completedAt: "desc" },
      take: 10
    });

    const { generateInsights } = await import("@/lib/services/openrouter-service");
    const insightsJson = await generateInsights(
      profile,
      completedQuests.map(cq => cq.quest),
      streaks,
      moneyJar
    );

    let insights: unknown[] = [];
    try {
      // Strip markdown codeblock if present
      const cleanJson = insightsJson.replace(/```json/g, "").replace(/```/g, "").trim();
      insights = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("Failed to parse AI insights JSON, trying regex fallback...", parseErr);
      // Fallback fallback if model failed to output strict JSON
      insights = [
        {
          title: "New Horizons",
          type: "suggestion",
          content: "Keep pushing forward! Check your quests page to see what adventures await."
        }
      ];
    }

    await prisma.aIInsight.deleteMany({
      where: { userId }
    });

    if (insights.length > 0) {
      await prisma.aIInsight.createMany({
        data: insights.map(insight => {
          const ins = insight as { title?: string; content?: string; type?: string };
          return {
            userId,
            title: ins.title || "Adventure Note",
            content: ins.content || "Keep progressing!",
            type: ins.type || "suggestion",
            createdAt: new Date()
          };
        })
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error in generateCoachInsightsAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getCoachInsightsAction(userId: string) {
  await requireAuth(userId);
  try {
    const dbInsights = await prisma.aIInsight.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return dbInsights.map(insight => ({
      id: insight.id,
      type: insight.type as "positive" | "warning" | "suggestion" | "pattern",
      title: insight.title,
      content: insight.content,
      createdAt: insight.createdAt
    }));
  } catch (error) {
    console.error("Error in getCoachInsightsAction:", error);
    return [];
  }
}

export async function getSkillProgressionAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const { SkillProgressionService } = await import("@/lib/services/skill-progression-service");
    const data = await SkillProgressionService.getSkillProgression(userId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function unlockSkillNodeAction(nodeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const result = await WriteCoordinator.enqueue(async () => {
      const { SkillProgressionService } = await import("@/lib/services/skill-progression-service");
      return await SkillProgressionService.unlockSkillNode(userId, nodeId);
    }, { resource: `user_${userId}` });
    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function toggleSkillAction(nodeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const { SkillProgressionService } = await import("@/lib/services/skill-progression-service");
    const result = await SkillProgressionService.toggleSkill(userId, nodeId);
    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function addScheduleBlockAction(userId: string, title: string, startTime: string, durationMins: number, statCategory: string) {
  await requireAuth(userId);
  return { success: true };
}

export async function buyShopItemAction(userId: string, itemId: string) {
  await requireAuth(userId);
  try {
    const { SHOP_ITEMS } = await import("@/lib/economy-engine");
    const shopItem = SHOP_ITEMS.find((i) => i.id === itemId);

    if (shopItem) {
      const result = await prisma.$transaction(async (tx) => {
        const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
        if (!moneyJar) throw new Error("Money jar not found");

        if (shopItem.currency === "coins" && moneyJar.coins < shopItem.cost) {
          throw new Error("Insufficient coins");
        }
        if (shopItem.currency === "gems" && moneyJar.gems < shopItem.cost) {
          throw new Error("Insufficient gems");
        }

        if (shopItem.currency === "coins") {
          await tx.moneyJar.update({
            where: { id: moneyJar.id },
            data: { coins: { decrement: shopItem.cost } }
          });
        } else {
          await tx.moneyJar.update({
            where: { id: moneyJar.id },
            data: { gems: { decrement: shopItem.cost } }
          });
        }

        await tx.transaction.create({
          data: {
            userId,
            amount: shopItem.cost,
            currency: shopItem.currency === "coins" ? "COIN" : "GEM",
            type: "SPEND",
            source: `SHOP_PURCHASE:${itemId}`
          }
        });

        const { ChroniclesService } = await import("@/lib/services/chronicles-service");
        await ChroniclesService.createEntry(
          userId,
          "PURCHASE",
          "Item Purchased",
          `Purchased ${shopItem.name} for ${shopItem.cost} ${shopItem.currency}`
        );

        return { success: true, cost: shopItem.cost, item: shopItem.name };
      });
      return result;
    }

    const { EconomyService } = await import("@/lib/services/economy-service");
    return await EconomyService.purchaseItem(userId, itemId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function claimRegionUnlockAction(userId: string, regionId: string) {
  await requireAuth(userId);
  try {
    const updated = await prisma.worldRegion.upsert({
      where: { userId_regionId: { userId, regionId } },
      create: {
        userId,
        regionId,
        unlocked: true,
        unlockedAt: new Date()
      },
      update: {
        unlocked: true,
        unlockedAt: new Date()
      }
    });
    revalidatePath("/life-map");
    return { success: true, data: updated };
  } catch (e) {
    console.error("Error in claimRegionUnlockAction:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function streakCheckinAction(_userId: string, streakId: string) {
  // Delegate to the real implementation in streak-actions.ts
  // The real checkInStreakAction reads userId from the session internally
  const { checkInStreakAction } = await import("@/actions/streak-actions");
  return checkInStreakAction(streakId);
}

export async function urgeVictoryAction(userId: string, sessionId?: string): Promise<{
  success: boolean;
  error?: string;
  alreadyProcessed?: boolean;
  xpReward?: number;
  goldReward?: number;
  currentXP?: number;
  currentCoins?: number;
  levelUp?: boolean;
  notificationMessage?: string;
}> {
  await requireAuth(userId);
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Abuse prevention: ensure reward applied only once per session if sessionId provided
      if (sessionId) {
        const existing = await tx.analyticsEvent.findFirst({
          where: {
            userId,
            eventType: "DISTRACTION_RESISTED"
          }
        });
        if (existing && existing.payload && (existing.payload as any).sessionId === sessionId) {
          const character = await tx.character.findUnique({ where: { userId }, select: { xp: true } });
          const moneyJar = await tx.moneyJar.findUnique({ where: { userId }, select: { coins: true } });
          return {
            success: true,
            alreadyProcessed: true,
            xpReward: 5,
            goldReward: 10,
            currentXP: character?.xp || 0,
            currentCoins: moneyJar?.coins || 0,
            notificationMessage: "Distraction Resisted! +5 XP • +10 Gold"
          };
        }
      }

      // Award exactly +5 XP
      const { ProgressionService } = await import("@/lib/services/progression-service");
      const xpRes = await ProgressionService.awardXPRaw(userId, 5, tx);

      // Award exactly +10 Gold Coins
      const moneyJar = await tx.moneyJar.upsert({
        where: { userId },
        create: { userId, coins: 10 },
        update: { coins: { increment: 10 } }
      });

      await tx.transaction.create({
        data: {
          userId,
          amount: 10,
          type: "EARN",
          source: "DISTRACTION_RESISTED"
        }
      });

      // Log event in Kingdom Chronicles
      const { ChroniclesService } = await import("@/lib/services/chronicles-service");
      await ChroniclesService.createEntry(
        userId,
        "RESILIENCE",
        "Distraction Overcome",
        "Successfully resisted a distraction (+5 XP, +10 Gold)"
      );

      // Create notification
      const { NotificationService } = await import("@/lib/services/notification-service");
      await NotificationService.send(
        userId,
        "Resilience Victory",
        "Distraction Resisted! +5 XP • +10 Gold",
        "RESILIENCE",
        tx
      );

      // Track analytics event for session deduplication
      await tx.analyticsEvent.create({
        data: {
          userId,
          eventType: "DISTRACTION_RESISTED",
          payload: { sessionId: sessionId || `resilience_${Date.now()}` }
        }
      });

      return {
        success: true,
        alreadyProcessed: false,
        xpReward: 5,
        goldReward: 10,
        currentXP: xpRes.newXP,
        currentCoins: moneyJar.coins,
        levelUp: xpRes.levelUp,
        notificationMessage: "Distraction Resisted! +5 XP • +10 Gold"
      };
    });
    return result;
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function urgeDefeatAction(userId: string, sessionId?: string): Promise<{
  success: boolean;
  error?: string;
  alreadyProcessed?: boolean;
  xpDeducted?: number;
  currentXP?: number;
  notificationMessage?: string;
}> {
  await requireAuth(userId);
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Abuse prevention
      if (sessionId) {
        const existing = await tx.analyticsEvent.findFirst({
          where: {
            userId,
            eventType: "DISTRACTION_SETBACK"
          }
        });
        if (existing && existing.payload && (existing.payload as any).sessionId === sessionId) {
          const character = await tx.character.findUnique({ where: { userId }, select: { xp: true } });
          return {
            success: true,
            alreadyProcessed: true,
            xpDeducted: 5,
            currentXP: character?.xp || 0,
            notificationMessage: "Distraction Won. -5 XP"
          };
        }
      }

      // Deduct exactly 5 XP (prevent level down and negative total XP)
      const { ProgressionService } = await import("@/lib/services/progression-service");
      const xpRes = await ProgressionService.awardXPRaw(userId, -5, tx);

      // Log event in Kingdom Chronicles
      const { ChroniclesService } = await import("@/lib/services/chronicles-service");
      await ChroniclesService.createEntry(
        userId,
        "RESILIENCE",
        "Distraction Setback",
        "Failed to resist a distraction (-5 XP)"
      );

      // Create notification
      const { NotificationService } = await import("@/lib/services/notification-service");
      await NotificationService.send(
        userId,
        "Resilience Setback",
        "Distraction Won. -5 XP",
        "RESILIENCE",
        tx
      );

      // Track analytics event for session deduplication
      await tx.analyticsEvent.create({
        data: {
          userId,
          eventType: "DISTRACTION_SETBACK",
          payload: { sessionId: sessionId || `resilience_${Date.now()}` }
        }
      });

      return {
        success: true,
        alreadyProcessed: false,
        xpDeducted: 5,
        currentXP: xpRes.newXP,
        notificationMessage: "Distraction Won. -5 XP"
      };
    });
    return result;
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function feedPetXpAction(userId: string, xp: number) {
  await requireAuth(userId);
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Stub for feeding pet
      return { success: true, petLeveled: false, petEvolved: false, petName: "Pet", newLevel: 2, newStage: "Adult" };
    });
    return result;
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function getNotificationsAction(userId: string) {
  await requireAuth(userId);
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return notifs.map(n => ({
      id: n.id,
      title: n.title,
      body: n.message,
      type: n.type,
      read: n.isRead,
      createdAt: n.createdAt
    }));
  } catch (error) {
    console.error("Error in getNotificationsAction:", error);
    return [];
  }
}

export async function createNotificationAction(userId: string, notification: any) {
  await requireAuth(userId);
  try {
    const newNotif = await prisma.notification.create({
      data: {
        userId,
        title: notification.title,
        message: notification.body || notification.message || "",
        type: notification.type || "SYSTEM",
        isRead: false
      }
    });
    return { success: true, data: newNotif };
  } catch (error) {
    console.error("Error in createNotificationAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    console.error("Error in markNotificationReadAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function markAllNotificationsReadAction(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    console.error("Error in markAllNotificationsReadAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteNotificationAction(notificationId: string) {
  try {
    await prisma.notification.delete({
      where: { id: notificationId }
    });
    return { success: true };
  } catch (error) {
    console.error("Error in deleteNotificationAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function clearAllNotificationsAction(userId: string) {
  try {
    await prisma.notification.deleteMany({
      where: { userId }
    });
    return { success: true };
  } catch (error) {
    console.error("Error in clearAllNotificationsAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function depositVaultAction(userId: string, amount: number) {
  await requireAuth(userId);
  try {
    if (amount <= 0 || !Number.isInteger(amount)) {
      return { success: false, error: "Invalid amount. Must be a positive integer." };
    }

    const result = await prisma.$transaction(async (tx) => {
      let moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
      if (!moneyJar) {
        moneyJar = await tx.moneyJar.create({ data: { userId } });
      }

      if (moneyJar.coins < amount) {
        throw new Error("Insufficient wallet gold.");
      }

      const newVaultBalance = moneyJar.vaultCoins + amount;
      const newHighest = Math.max(moneyJar.vaultHighest, newVaultBalance);

      await tx.moneyJar.update({
        where: { userId },
        data: {
          coins: { decrement: amount },
          vaultCoins: newVaultBalance,
          vaultHighest: newHighest
        }
      });

      await tx.transaction.create({
        data: {
          userId,
          amount,
          currency: 'VAULT',
          type: 'EARN',
          source: 'DEPOSIT'
        }
      });



      return { success: true, newBalance: newVaultBalance };
    });
    
    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function withdrawVaultAction(userId: string, amount: number) {
  await requireAuth(userId);
  try {
    if (amount <= 0 || !Number.isInteger(amount)) {
      return { success: false, error: "Invalid amount. Must be a positive integer." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
      if (!moneyJar) {
        throw new Error("Vault not found.");
      }

      if (moneyJar.vaultCoins < amount) {
        throw new Error("Insufficient vault balance.");
      }

      const newVaultBalance = moneyJar.vaultCoins - amount;

      await tx.moneyJar.update({
        where: { userId },
        data: {
          coins: { increment: amount },
          vaultCoins: newVaultBalance
        }
      });

      await tx.transaction.create({
        data: {
          userId,
          amount,
          currency: 'VAULT',
          type: 'SPEND',
          source: 'WITHDRAWAL'
        }
      });



      return { success: true, newBalance: newVaultBalance };
    });
    
    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function exportBackupAction(userId: string) {
  await requireAuth(userId);
  try {
    const { BackupService } = await import("@/lib/services/backup-service");
    const data = await BackupService.exportBackup(userId);

    const { ChroniclesService } = await import("@/lib/services/chronicles-service");
    await ChroniclesService.createEntry(userId, "REWARD", "Backup Exported", "Successfully exported full database backup.");

    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function importBackupAction(userId: string, backupStr: string) {
  await requireAuth(userId);
  try {
    const { BackupService } = await import("@/lib/services/backup-service");
    const ok = await BackupService.importBackup(userId, backupStr);

    if (ok) {
      const { ChroniclesService } = await import("@/lib/services/chronicles-service");
      await ChroniclesService.createEntry(userId, "REWARD", "Backup Imported", "Successfully restored database state from backup file.");
    }

    return { success: ok };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}


export async function updateUserSettingsAction(userId: string, data: { theme?: string; soundEnabled?: boolean; pushEnabled?: boolean }) {
  await requireAuth(userId);
  try {
    const { SettingsEngine } = await import("@/lib/settings-engine/settings-engine");
    const settings = await SettingsEngine.updateSettings(userId, data as any);
    return { success: true, settings };
  } catch (error) {
    console.error("Error in updateUserSettingsAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserSettingsAction(userId: string) {
  await requireAuth(userId);
  try {
    const { SettingsEngine } = await import("@/lib/settings-engine/settings-engine");
    const settings = await SettingsEngine.getSettings(userId);
    return { success: true, settings };
  } catch (error) {
    console.error("Error in getUserSettingsAction:", error);
    return { success: false, error: (error as Error).message };
  }
}
