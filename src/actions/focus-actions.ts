"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gameMath } from "@/lib/game-math";
import { ActionResponse, successResponse, errorResponse } from "@/lib/actions-utils";
import { RewardEngine } from "@/lib/services/reward-engine";

export interface FocusSessionData {
  taskId?: string | null;
  targetDuration: number; // in seconds
  actualDuration: number; // in seconds
}

// Helper to determine the user's best productivity window based on past focus sessions
async function getTimeEchoWindow(userId: string) {
  const sessions = await prisma.focusSession.findMany({
    where: { userId },
    select: { completedAt: true }
  });

  if (sessions.length < 3) {
    // Default recommendation if not enough data
    return {
      slot: "Evening",
      hoursText: "6 PM – 10 PM",
      startHour: 18,
      endHour: 22,
      message: "Schedule future tasks in the evening (6–10 PM) for maximum productivity."
    };
  }

  // Count sessions per time slot
  let morning = 0;   // 6 AM - 12 PM (6 to 11)
  let afternoon = 0; // 12 PM - 6 PM (12 to 17)
  let evening = 0;   // 6 PM - 10 PM (18 to 21)
  let night = 0;     // 10 PM - 6 AM (22 to 5)

  for (const s of sessions) {
    const hr = new Date(s.completedAt).getHours();
    if (hr >= 6 && hr < 12) morning++;
    else if (hr >= 12 && hr < 18) afternoon++;
    else if (hr >= 18 && hr < 22) evening++;
    else night++;
  }

  const max = Math.max(morning, afternoon, evening, night);
  if (max === morning) {
    return { slot: "Morning", hoursText: "6 AM – 12 PM", startHour: 6, endHour: 12, message: "Morning study sessions are your most productive." };
  } else if (max === afternoon) {
    return { slot: "Afternoon", hoursText: "12 PM – 6 PM", startHour: 12, endHour: 18, message: "Afternoon focus slots give you the highest consistency." };
  } else if (max === night) {
    return { slot: "Night", hoursText: "10 PM – 6 AM", startHour: 22, endHour: 6, message: "You are a night owl! Late-night focus is your superpower." };
  } else {
    return { slot: "Evening", hoursText: "6 PM – 10 PM", startHour: 18, endHour: 22, message: "Evening sessions (6–10 PM) give your highest completion rate." };
  }
}

export async function completeFocusSessionAction(data: FocusSessionData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const { taskId, targetDuration, actualDuration } = data;
    if (actualDuration <= 0) return errorResponse("Invalid duration");

    // 1. Determine task title if linked
    let taskTitle: string | null = null;
    let taskCategory: string = "discipline"; // default to discipline
    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task) {
        taskTitle = task.title;
        taskCategory = task.category || "discipline";
      }
    }

    // 2. Calculate XP and Coins earned with scaling and penalties
    const completionPercent = targetDuration > 0 ? actualDuration / targetDuration : 1;
    let xpEarned = 0;
    let coinsGained = 0;

    if (completionPercent >= 0.2) {
      // Base scaling: 0.45 XP per minute, 0.23 Coins per minute
      xpEarned = (actualDuration / 60) * 0.45;
      coinsGained = (actualDuration / 60) * 0.23;

      // Penalize partial completion
      if (completionPercent < 0.9) {
         xpEarned *= 0.8;
         coinsGained *= 0.8;
      }
    }

    xpEarned = Math.max(0, Math.floor(xpEarned));
    coinsGained = Math.max(0, Math.floor(coinsGained));

    // 3. Time Echo logic: Check if current time falls in recommended window
    const windowInfo = await getTimeEchoWindow(userId);
    const now = new Date();
    const currentHour = now.getHours();
    let isEchoBonus = false;

    if (windowInfo.startHour < windowInfo.endHour) {
      isEchoBonus = currentHour >= windowInfo.startHour && currentHour < windowInfo.endHour;
    } else {
      // Overnight slot (e.g. 22 to 6)
      isEchoBonus = currentHour >= windowInfo.startHour || currentHour < windowInfo.endHour;
    }

    if (isEchoBonus && xpEarned > 0) {
      xpEarned += 10; // +10 XP Time Echo bonus!
    }

    const { WriteCoordinator } = await import("@/lib/services/write-coordinator");
    const result = await WriteCoordinator.enqueue(async () => {
      return await prisma.$transaction(async (tx) => {
      // Create session record
      const newSession = await tx.focusSession.create({
        data: {
          userId,
          taskId: taskId || null,
          taskTitle,
          duration: actualDuration,
          xpEarned
        }
      });

      // Update Character XP and Level
      const character = await tx.character.findUnique({
        where: { userId },
        include: { stats: true }
      });
      const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });

      let didLevelUp = false;
      let newLevelVal = null;

      if (character) {
        const { LevelService } = await import("@/lib/services/level-service");
        const lvlRes = await LevelService.awardXP(userId, xpEarned, tx);
        didLevelUp = lvlRes.levelUp;
        newLevelVal = lvlRes.newLevel;
      }

      if (moneyJar && coinsGained > 0) {
        await tx.moneyJar.update({
          where: { id: moneyJar.id },
          data: { coins: { increment: coinsGained } }
        });

        await tx.transaction.create({
          data: {
            userId,
            amount: coinsGained,
            type: "EARN",
            source: `FOCUS_SESSION:${newSession.id}`
          }
        });
      }

      // Track Analytics
      await tx.analyticsEvent.create({
        data: {
          userId,
          eventType: "FOCUS_SESSION_COMPLETED",
          payload: { duration: actualDuration, targetDuration, xpEarned, coinsGained, isEchoBonus }
        }
      });

      return {
        focusSession: newSession,
        xpGained: xpEarned,
        coinsGained,
        levelUp: didLevelUp,
        newLevel: newLevelVal,
        isEchoBonus
      };
      });
    });

    if (result) {
      // Emit Pomodoro and Meditation focus events to QuestEngine
      try {
        const { QuestEngine } = await import("@/lib/services/quest-engine");
        const focusMinutes = Math.round(actualDuration / 60);
        await QuestEngine.emit({ userId, type: "POMODORO_FINISHED", value: focusMinutes });
        await QuestEngine.emit({ userId, type: "MEDITATION_COMPLETED", value: focusMinutes });
      } catch (qErr) {
        console.error("QuestEngine event emission error on focus completion:", qErr);
      }

      // Award Mastery XP outside transaction to avoid deadlocks
      if (taskCategory && xpEarned > 0) {
        try {
          const { MasteryService } = await import("@/lib/services/mastery-service");
          await MasteryService.awardMasteryXp(userId, taskCategory, xpEarned);
        } catch (masteryErr) {
          console.error("Failed to award mastery XP on focus completion:", masteryErr);
        }
      }
    }

    return successResponse(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to complete focus session";
    return errorResponse(msg);
  }
}

export async function getFocusStatsAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Single query: fetch all sessions ordered by completion date
    const allSessions = await prisma.focusSession.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      select: { id: true, taskTitle: true, duration: true, xpEarned: true, completedAt: true }
    });

    // In-memory filtering avoids 2 extra DB round-trips
    const todaySessions = allSessions.filter(s => s.completedAt >= startOfToday);
    const weeklySessions = allSessions.filter(s => s.completedAt >= startOfWeek);

    const todayFocusTime = todaySessions.reduce((acc, s) => acc + s.duration, 0);
    const weeklyFocusTime = weeklySessions.reduce((acc, s) => acc + s.duration, 0);
    const longestSession = allSessions.reduce((max, s) => s.duration > max ? s.duration : max, 0);
    
    // Time Echo Insight
    const echoWindow = await getTimeEchoWindow(userId);

    // Classification of focus lengths
    const sessionsCount = allSessions.length;
    let popularDurationText = "25-minute Pomodoro is your optimal timer block.";
    if (sessionsCount >= 3) {
      let pomodoroCount = 0;
      let shortCount = 0;
      let longCount = 0;
      for (const s of allSessions) {
        const mins = s.duration / 60;
        if (mins >= 20 && mins <= 30) pomodoroCount++;
        else if (mins < 20) shortCount++;
        else longCount++;
      }
      const maxCount = Math.max(pomodoroCount, shortCount, longCount);
      if (maxCount === shortCount) popularDurationText = "Short focus sprints (< 20 mins) yield your highest completion rate.";
      else if (maxCount === longCount) popularDurationText = "Long deep-work focus sessions (> 30 mins) match your workflow best.";
    }

    return successResponse({
      todayFocusTime, // in seconds
      weeklyFocusTime, // in seconds
      longestSession, // in seconds
      echoWindow,
      popularDurationText,
      history: allSessions.slice(0, 10).map(s => ({
        id: s.id,
        taskTitle: s.taskTitle || "General Focus",
        duration: s.duration,
        xpEarned: s.xpEarned,
        completedAt: s.completedAt
      }))
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch focus stats";
    return errorResponse(msg);
  }
}

export interface PomodoroTimings {
  focusMins: number;      // 15, 20, 25 (default), 30, 45, 60, custom 5-180
  shortBreakMins: number; // default 5, custom 1-30
  longBreakMins: number;  // default 15, custom 5-60
}

export async function getPomodoroTimingsAction(): Promise<ActionResponse<PomodoroTimings>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const settingEvent = await prisma.analyticsEvent.findFirst({
      where: {
        userId,
        eventType: "POMODORO_TIMINGS_SETTING"
      },
      orderBy: { createdAt: "desc" }
    });

    if (settingEvent && settingEvent.payload) {
      const p = settingEvent.payload as any;
      return successResponse({
        focusMins: Math.max(5, Math.min(180, Number(p.focusMins) || 25)),
        shortBreakMins: Math.max(1, Math.min(30, Number(p.shortBreakMins) || 5)),
        longBreakMins: Math.max(5, Math.min(60, Number(p.longBreakMins) || 15))
      });
    }

    return successResponse({
      focusMins: 25,
      shortBreakMins: 5,
      longBreakMins: 15
    });
  } catch (error) {
    return successResponse({
      focusMins: 25,
      shortBreakMins: 5,
      longBreakMins: 15
    });
  }
}

export async function savePomodoroTimingsAction(timings: PomodoroTimings): Promise<ActionResponse<PomodoroTimings>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    const userId = session.user.id;

    const validated: PomodoroTimings = {
      focusMins: Math.max(5, Math.min(180, Number(timings.focusMins) || 25)),
      shortBreakMins: Math.max(1, Math.min(30, Number(timings.shortBreakMins) || 5)),
      longBreakMins: Math.max(5, Math.min(60, Number(timings.longBreakMins) || 15))
    };

    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventType: "POMODORO_TIMINGS_SETTING",
        payload: validated as any
      }
    });

    return successResponse(validated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save timings";
    return errorResponse(msg);
  }
}
