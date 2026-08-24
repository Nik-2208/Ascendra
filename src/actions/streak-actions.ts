"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { gameMath } from "@/lib/game-math";
import { ActionResponse, successResponse, errorResponse } from "@/lib/actions-utils";

export interface HabitData {
  name: string;
  description?: string | null;
  icon?: string;
  color?: string;
  frequency: string; // Daily, Weekly, Monthly
  reminder?: string | null;
  xpReward?: number;
  coinReward?: number;
}

// Centralized utility to check if streaks were missed and reconcile them
export async function resetExpiredStreaks(userId: string) {
  const { StreakService } = await import("@/lib/services/streak-service");
  await StreakService.reconcileUserStreaks(userId);
}

// Helper to determine if checked in during the current period
function isCheckedInForPeriod(lastCheckinDate: Date, frequency: string): boolean {
  const now = new Date();
  const lastCheckin = new Date(lastCheckinDate);

  if (frequency === "Daily") {
    return (
      lastCheckin.getDate() === now.getDate() &&
      lastCheckin.getMonth() === now.getMonth() &&
      lastCheckin.getFullYear() === now.getFullYear()
    );
  } else if (frequency === "Weekly") {
    // Check if in same calendar week (Sunday to Saturday or startOfWeek diff)
    const startOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
    };
    return startOfWeek(now) === startOfWeek(lastCheckin);
  } else if (frequency === "Monthly") {
    return (
      lastCheckin.getMonth() === now.getMonth() &&
      lastCheckin.getFullYear() === now.getFullYear()
    );
  }
  return false;
}

export async function getStreaksAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    await resetExpiredStreaks(userId);

    const streaks = await prisma.streak.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(streaks);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to fetch habits");
  }
}

export async function createStreakAction(data: HabitData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    if (!data.name.trim()) return errorResponse("Habit name is required");

    // Check unique constraint
    const existing = await prisma.streak.findUnique({
      where: {
        userId_name: {
          userId,
          name: data.name.trim()
        }
      }
    });

    if (existing) {
      return errorResponse("A habit with this name already exists");
    }

    const streak = await prisma.streak.create({
      data: {
        userId,
        name: data.name.trim(),
        description: data.description || null,
        icon: data.icon || "🔥",
        color: data.color || "red",
        frequency: data.frequency,
        reminder: data.reminder || null,
        xpReward: data.xpReward ?? 20,
        coinReward: data.coinReward ?? 5,
        current: 0,
        best: 0,
        totalCompletions: 0,
        // Set lastCheckin to 2 periods ago so they can check in immediately
        lastCheckin: new Date(Date.now() - 86400000 * 30),
        isArchived: false,
        isPaused: false
      }
    });

    return successResponse(streak);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to create streak");
  }
}

export async function updateStreakAction(id: string, data: HabitData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const streak = await prisma.streak.findUnique({ where: { id } });
    if (!streak || streak.userId !== userId) {
      return errorResponse("Habit not found or unauthorized");
    }

    // Check unique name if changed
    if (data.name.trim() !== streak.name) {
      const existing = await prisma.streak.findUnique({
        where: {
          userId_name: {
            userId,
            name: data.name.trim()
          }
        }
      });
      if (existing) return errorResponse("A habit with this name already exists");
    }

    const updated = await prisma.streak.update({
      where: { id },
      data: {
        name: data.name.trim(),
        description: data.description || null,
        icon: data.icon || "🔥",
        color: data.color || "red",
        frequency: data.frequency,
        reminder: data.reminder || null,
        xpReward: data.xpReward ?? 20,
        coinReward: data.coinReward ?? 5
      }
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to update habit");
  }
}

export async function deleteStreakAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const streak = await prisma.streak.findUnique({ where: { id } });
    if (!streak || streak.userId !== userId) {
      return errorResponse("Habit not found or unauthorized");
    }

    await prisma.streak.delete({ where: { id } });
    return successResponse(true);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to delete habit");
  }
}

export async function toggleArchiveStreakAction(id: string, archive: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const streak = await prisma.streak.findUnique({ where: { id } });
    if (!streak || streak.userId !== userId) {
      return errorResponse("Habit not found or unauthorized");
    }

    const updated = await prisma.streak.update({
      where: { id },
      data: { isArchived: archive }
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to archive habit");
  }
}

export async function togglePauseStreakAction(id: string, pause: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const streak = await prisma.streak.findUnique({ where: { id } });
    if (!streak || streak.userId !== userId) {
      return errorResponse("Habit not found or unauthorized");
    }

    const updated = await prisma.streak.update({
      where: { id },
      data: { isPaused: pause }
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to pause habit");
  }
}

export async function checkInStreakAction(streakId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const { StreakService } = await import("@/lib/services/streak-service");
    const res = await StreakService.checkIn(userId, streakId);
    if (!res.success) {
      return errorResponse(res.error || "Failed to check in");
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/streaks");

    return successResponse(res.streak);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to check in");
  }
}

export async function undoStreakCheckInAction(streakId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const streak = await tx.streak.findUnique({ where: { id: streakId } });
      if (!streak || streak.userId !== userId) throw new Error("Habit not found or unauthorized");

      // Can only undo if checked in today/current period
      const isCheckedIn = isCheckedInForPeriod(streak.lastCheckin, streak.frequency);
      if (!isCheckedIn || streak.totalCompletions === 0) {
        throw new Error("No check-in found to undo for this period");
      }

      const newCount = Math.max(0, streak.current - 1);
      const newTotal = Math.max(0, streak.totalCompletions - 1);

      // Set lastCheckin back to 2 days ago so they can check in again
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      const updatedStreak = await tx.streak.update({
        where: { id: streakId },
        data: {
          current: newCount,
          totalCompletions: newTotal,
          lastCheckin: yesterday
        }
      });

      // Deduct rewards (XP and Coins)
      const xpToDeduct = streak.xpReward;
      const coinsToDeduct = streak.coinReward;

      const character = await tx.character.findUnique({ where: { userId } });
      const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });

      if (character) {
        const { LevelService } = await import("@/lib/services/level-service");
        await LevelService.awardXP(userId, -xpToDeduct, tx);
      }

      if (moneyJar && coinsToDeduct > 0) {
        await tx.moneyJar.update({
          where: { id: moneyJar.id },
          data: { coins: { decrement: coinsToDeduct } }
        });

        // Add a SPEND/DEDUCT transaction log
        await tx.transaction.create({
          data: {
            userId,
            amount: coinsToDeduct,
            type: "SPEND",
            source: `HABIT_UNDO_CHECKIN:${streakId}`
          }
        });
      }

      return {
        streak: updatedStreak,
        xpDeducted: xpToDeduct,
        coinsDeducted: coinsToDeduct
      };
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to undo check in");
  }
}
