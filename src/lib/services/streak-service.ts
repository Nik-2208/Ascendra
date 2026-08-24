import { prisma } from "@/lib/prisma";

export class StreakService {
  /**
   * Formats a Date as YYYY-MM-DD in UTC for deterministic date comparison.
   */
  public static getCalendarDateString(date: Date): string {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculates calendar days difference between two dates.
   */
  public static getDaysDifference(d1: Date, d2: Date): number {
    const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
    const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((utc2 - utc1) / msPerDay);
  }

  /**
   * Gets or creates the primary Daily Activity streak for a user.
   */
  public static async getOrCreatePrimaryStreak(userId: string, txClient?: any): Promise<any> {
    const db = txClient || prisma;
    let streak = await db.streak.findUnique({
      where: { userId_name: { userId, name: "Daily Activity" } }
    });

    if (!streak) {
      streak = await db.streak.create({
        data: {
          userId,
          name: "Daily Activity",
          description: "Your continuous daily activity streak in Ascendra",
          icon: "🔥",
          color: "orange",
          frequency: "Daily",
          current: 0,
          best: 0,
          lastCheckin: new Date(0), // 1970 Jan 1
          totalCompletions: 0
        }
      });
    }

    return streak;
  }

  /**
   * Processes daily activity check-in for the primary daily streak.
   * Deterministic, idempotent, and timezone-safe.
   */
  public static async processDailyActivity(
    userId: string,
    txClient?: any
  ): Promise<{ success: boolean; updated: boolean; action: "NO-OP" | "INCREMENT" | "RESET" | "INITIALIZE"; streak: any }> {
    const runner = async (tx: any): Promise<{ success: boolean; updated: boolean; action: "NO-OP" | "INCREMENT" | "RESET" | "INITIALIZE"; streak: any }> => {
      const streak = await this.getOrCreatePrimaryStreak(userId, tx);
      const now = new Date();
      const todayStr = this.getCalendarDateString(now);
      const lastStr = this.getCalendarDateString(new Date(streak.lastCheckin));

      // Same-day check: already processed today
      if (todayStr === lastStr && streak.totalCompletions > 0) {
        // Silent: same-day no-op
        return { success: true, updated: false, action: "NO-OP", streak };
      }

      let newCount = 1;
      let action: "INITIALIZE" | "INCREMENT" | "RESET" = "INITIALIZE";

      if (streak.totalCompletions === 0) {
        action = "INITIALIZE";
        newCount = 1;
      } else {
        const diffDays = this.getDaysDifference(new Date(streak.lastCheckin), now);
        if (diffDays === 1) {
          action = "INCREMENT";
          newCount = streak.current + 1;
        } else if (diffDays > 1) {
          action = "RESET";
          newCount = 1;
        } else if (diffDays <= 0) {
          // Clock skew or same day
          // Silent: same/future day no-op
          return { success: true, updated: false, action: "NO-OP", streak };
        }
      }

      const newBest = Math.max(streak.best, newCount);
      const newTotal = streak.totalCompletions + 1;

      const updatedStreak = await tx.streak.update({
        where: { id: streak.id },
        data: {
          current: newCount,
          best: newBest,
          lastCheckin: now,
          totalCompletions: newTotal
        }
      });

      // Streak updated silently

      // Award XP for daily streak
      if (action === "INCREMENT" || action === "INITIALIZE") {
        const xpReward = streak.xpReward ?? 20;
        const { LevelService } = await import("@/lib/services/level-service");
        await LevelService.awardXP(userId, xpReward, tx);

        try {
          const { QuestEngine } = await import("./quest-engine");
          await QuestEngine.emit({ userId, type: "DAILY_STREAK_INCREASED", value: newCount }, tx);
        } catch (err) {
          console.error("[StreakService] QuestEngine emit error:", err);
        }
      }

      return { success: true, updated: true, action: action as "NO-OP" | "INCREMENT" | "RESET" | "INITIALIZE", streak: updatedStreak };
    };

    if (txClient) {
      return await runner(txClient);
    } else {
      return await prisma.$transaction(runner);
    }
  }

  /**
   * Reconciles expired habit streaks for a user.
   */
  public static async reconcileUserStreaks(userId: string, txClient?: any): Promise<void> {
    const db = txClient || prisma;
    const now = new Date();

    const streaks = await db.streak.findMany({
      where: { userId, isPaused: false, isArchived: false }
    });

    for (const streak of streaks) {
      if (streak.current === 0 || streak.totalCompletions === 0) continue;

      const diffDays = this.getDaysDifference(new Date(streak.lastCheckin), now);
      let isExpired = false;

      if (streak.frequency === "Daily" || !streak.frequency) {
        if (diffDays > 1) isExpired = true;
      } else if (streak.frequency === "Weekly") {
        if (diffDays > 13) isExpired = true;
      } else if (streak.frequency === "Monthly") {
        if (diffDays > 60) isExpired = true;
      }

      if (isExpired) {
        await db.streak.update({
          where: { id: streak.id },
          data: { current: 0 }
        });
      }
    }
  }

  /**
   * Performs check-in for a specific habit streak.
   */
  public static async checkIn(
    userId: string,
    streakId: string,
    txClient?: any
  ): Promise<{ success: boolean; updated: boolean; alreadyCheckedIn: boolean; streak?: any; error?: string }> {
    const runner = async (tx: any) => {
      const streak = await tx.streak.findUnique({ where: { id: streakId } });
      if (!streak || streak.userId !== userId) {
        return { success: false, updated: false, alreadyCheckedIn: false, error: "Streak not found" };
      }
      if (streak.isArchived) {
        return { success: false, updated: false, alreadyCheckedIn: false, error: "Cannot check in to archived streak" };
      }
      if (streak.isPaused) {
        return { success: false, updated: false, alreadyCheckedIn: false, error: "Cannot check in to paused streak" };
      }

      const now = new Date();
      const todayStr = this.getCalendarDateString(now);
      const lastStr = this.getCalendarDateString(new Date(streak.lastCheckin));

      if (todayStr === lastStr && streak.totalCompletions > 0) {
        return { success: true, updated: false, alreadyCheckedIn: true, streak };
      }

      const diffDays = this.getDaysDifference(new Date(streak.lastCheckin), now);
      let newCount = streak.current + 1;

      if (streak.totalCompletions > 0 && diffDays > 1) {
        newCount = 1;
      }

      const newBest = Math.max(streak.best, newCount);
      const newTotal = streak.totalCompletions + 1;

      const updatedStreak = await tx.streak.update({
        where: { id: streakId },
        data: {
          current: newCount,
          best: newBest,
          lastCheckin: now,
          totalCompletions: newTotal
        }
      });

      const xpReward = streak.xpReward ?? 20;
      const coinReward = streak.coinReward ?? 5;

      const { LevelService } = await import("@/lib/services/level-service");
      await LevelService.awardXP(userId, xpReward, tx);

      const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
      if (moneyJar && coinReward > 0) {
        await tx.moneyJar.update({
          where: { id: moneyJar.id },
          data: { coins: { increment: coinReward } }
        });
      }

      return { success: true, updated: true, alreadyCheckedIn: false, streak: updatedStreak };
    };

    if (txClient) {
      return await runner(txClient);
    } else {
      return await prisma.$transaction(runner);
    }
  }
}
