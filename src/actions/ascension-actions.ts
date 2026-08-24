"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DifficultyEngine } from "@/lib/services/difficulty-engine";
import { ActionResponse, successResponse, errorResponse } from "@/lib/actions-utils";
import { revalidatePath } from "next/cache";

export async function getAscensionDetailsAction(): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const character = await prisma.character.findUnique({
      where: { userId },
      select: { level: true, xp: true, prestige: true, rebirths: true }
    });

    if (!character) return errorResponse("Character not found");

    const profile = await DifficultyEngine.getAscensionProfile(userId);
    const currentMultiplier = profile.multiplier;
    const nextMultiplier = Number((1 + (profile.count + 1) * 0.10).toFixed(2));

    const canonicalPrestige = Math.max(character.prestige || 0, character.rebirths || 0);
    const canAscend = character.level >= 20 || canonicalPrestige > 0 || (character.xp || 0) >= 15000;

    return successResponse({
      currentLevel: character.level,
      canAscend,
      minLevelRequired: 20,
      ascensionCount: profile.count,
      currentMultiplier,
      currentDifficultyPercent: `${Math.round(currentMultiplier * 100)}%`,
      nextMultiplier,
      nextDifficultyPercent: `${Math.round(nextMultiplier * 100)}%`,
      history: profile.history,
      lifetimeStats: {
        lifetimeXP: profile.lifetimeXP,
        lifetimeCoins: profile.lifetimeCoins,
        lifetimeTasks: profile.lifetimeTasks,
        lifetimeBossKills: profile.lifetimeBossKills,
        lifetimeFocusSecs: profile.lifetimeFocusSecs
      }
    });
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to fetch ascension details");
  }
}

export async function ascendUserAction(): Promise<ActionResponse<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const { WriteCoordinator } = await import("@/lib/services/write-coordinator");
    const result = await WriteCoordinator.enqueue(async () => {
      return await prisma.$transaction(async (tx) => {
        const character = await tx.character.findUnique({
          where: { userId },
          include: { skills: true }
        });
        if (!character) throw new Error("Character not found");

        const canonicalPrestige = Math.max(character.prestige || 0, character.rebirths || 0);
        const eligible = character.level >= 20 || canonicalPrestige > 0 || (character.xp || 0) >= 15000;
        if (!eligible) {
          throw new Error("Ascension requires minimum Level 20 or prior achievement.");
        }

        const oldPrestige = canonicalPrestige;
        const newPrestige = oldPrestige + 1;
        const newMultiplier = Number((1 + newPrestige * 0.10).toFixed(2));

        let buildingsObj: any = character.buildings || {};
        if (typeof buildingsObj === "string") {
          try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
        }

        const existingAsc = buildingsObj.ascension || {};
        const history = existingAsc.history || [];
        history.push({
          ascensionNumber: newPrestige,
          date: new Date().toISOString(),
          levelAtAscension: character.level,
          titleGranted: `Ascendant ${newPrestige}`
        });

        buildingsObj.ascension = {
          count: newPrestige,
          multiplier: newMultiplier,
          lifetimeXP: Math.max(character.xp, existingAsc.lifetimeXP || character.xp || 0),
          lifetimeCoins: existingAsc.lifetimeCoins || 0,
          lifetimeTasks: existingAsc.lifetimeTasks || 0,
          lifetimeBossKills: existingAsc.lifetimeBossKills || 0,
          lifetimeFocusSecs: existingAsc.lifetimeFocusSecs || 0,
          history
        };

        // Reset level, xp, villageLevel while keeping prestige & stats synchronized
        await tx.character.update({
          where: { id: character.id },
          data: {
            level: 1,
            xp: 0,
            prestige: newPrestige,
            rebirths: newPrestige,
            villageLevel: 1,
            buildings: buildingsObj
          }
        });

        // Grant +1 inventory capacity every 2 ascensions
        if (newPrestige % 2 === 0) {
          const inv = await tx.inventory.findUnique({ where: { userId } });
          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { capacity: { increment: 1 } }
            });
          }
        }

        // Reset Boss progress
        const bossProg = await tx.bossProgress.findUnique({ where: { userId } });
        if (bossProg) {
          await tx.bossProgress.update({
            where: { id: bossProg.id },
            data: { bossHP: 0, maxHP: 0, completedTaskIds: [] }
          });
        }

        // Log Chronicle Entry
        const { ChroniclesService } = await import("@/lib/services/chronicles-service");
        await ChroniclesService.createEntry(
          userId,
          "PRESTIGE",
          `Ascended to New Game+ (Ascension ${newPrestige})`,
          `Ascended to Ascension ${newPrestige}! Global world difficulty increased to ${Math.round(newMultiplier * 100)}%.`
        );

        // Emit Ascension Event to QuestEngine
        const { QuestEngine } = await import("@/lib/services/quest-engine");
        await QuestEngine.emit({ userId, type: "ASCENSION_COMPLETED", value: 1 }, tx);

        // Send Notification
        const { NotificationService } = await import("@/lib/services/notification-service");
        await NotificationService.send(
          userId,
          "🌟 Ascension Complete!",
          `You entered New Game+ Ascension ${newPrestige}! World difficulty is now ${Math.round(newMultiplier * 100)}%.`,
          "PRESTIGE",
          tx
        );

        return {
          newAscensionCount: newPrestige,
          newMultiplier,
          difficultyPercent: `${Math.round(newMultiplier * 100)}%`
        };
      });
    });

    revalidatePath("/character");
    revalidatePath("/seasons");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");
    revalidatePath("/shop");
    revalidatePath("/boss-arena");

    return successResponse(result);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to perform ascension");
  }
}
