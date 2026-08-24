"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gameMath } from "@/lib/game-math";
import { ActionResponse, successResponse, errorResponse, executeSecureAction } from "@/lib/actions-utils";
import { TaskSchema } from "@/lib/schemas";
import { z } from "zod";

export interface TaskData {
  title: string;
  description?: string | null;
  dueDate?: Date | string | null;
  dueTime?: string | null;
  priority: string; // Low, Medium, High
  category?: string | null;
  repeat: string; // None, Daily, Weekly, Monthly
  notes?: string | null;
}

function getQuestType(repeat: string) {
  if (repeat === "Daily") return "DAILY";
  if (repeat === "Weekly") return "WEEKLY";
  return "DAILY";
}

function getRewards(priority: string) {
  switch (priority) {
    case "Low":
      return { xp: 30, coins: 5 };
    case "High":
      return { xp: 80, coins: 20 };
    case "Medium":
    default:
      return { xp: 50, coins: 10 };
  }
}

export async function getTasksAction() {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" }
      ]
    });

    return tasks;
  });
}

export async function createTaskAction(rawData: TaskData) {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    // Server-side Zod validation
    const data = TaskSchema.parse(rawData);

    const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the task
      const task = await tx.task.create({
        data: {
          userId,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          dueDate: parsedDueDate,
          dueTime: data.dueTime?.trim() || null,
          priority: data.priority,
          category: data.category?.trim() || "General",
          repeat: data.repeat,
          notes: data.notes?.trim() || null,
          completed: false
        }
      });

      const { TaskRewardEngine } = await import("@/lib/services/task-reward-engine");
      const rewards = TaskRewardEngine.getBaseRewards(data.priority);
      const quest = await tx.quest.create({
        data: {
          title: data.title.trim(),
          description: data.description?.trim() || `Complete your scheduled task: ${data.title}`,
          type: getQuestType(data.repeat) as "DAILY" | "WEEKLY",
          xpReward: rewards.xp,
          coinReward: rewards.coins,
          isGlobal: false,
          creatorId: userId,
          taskId: task.id
        }
      });

      // 3. Create quest progress
      await tx.questProgress.create({
        data: {
          userId,
          questId: quest.id,
          status: "ACTIVE",
          progress: 0,
          target: 1
        }
      });

      return task;
    });

    return result;
  });
}

export async function updateTaskAction(id: string, rawData: TaskData) {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    // Input verification
    if (!id || typeof id !== "string") throw new Error("Invalid task identifier");
    const data = TaskSchema.parse(rawData);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      throw new Error("Task not found or unauthorized");
    }

    const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

    const result = await prisma.$transaction(async (tx) => {
      // Update Task
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          title: data.title.trim(),
          description: data.description?.trim() || null,
          dueDate: parsedDueDate,
          dueTime: data.dueTime?.trim() || null,
          priority: data.priority,
          category: data.category?.trim() || "General",
          repeat: data.repeat,
          notes: data.notes?.trim() || null
        }
      });

      // Update linked Quest if exists
      const linkedQuest = await tx.quest.findUnique({
        where: { taskId: id }
      });

      if (linkedQuest) {
        const rewards = getRewards(data.priority);
        await tx.quest.update({
          where: { id: linkedQuest.id },
          data: {
            title: data.title.trim(),
            description: data.description?.trim() || `Complete your scheduled task: ${data.title}`,
            type: getQuestType(data.repeat) as "DAILY" | "WEEKLY",
            xpReward: rewards.xp,
            coinReward: rewards.coins
          }
        });
      }

      return updatedTask;
    });

    return result;
  });
}

export async function deleteTaskAction(id: string) {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    if (!id || typeof id !== "string") throw new Error("Invalid task identifier");

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      throw new Error("Task not found or unauthorized");
    }

    await prisma.$transaction(async (tx) => {
      // Delete linked quest (cascade will delete progress)
      const linkedQuest = await tx.quest.findUnique({ where: { taskId: id } });
      if (linkedQuest) {
        await tx.quest.delete({ where: { id: linkedQuest.id } });
      }

      // Delete task
      await tx.task.delete({ where: { id } });
    });

    return true;
  });
}

export async function completeTaskAction(id: string, completed: boolean) {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    if (!id || typeof id !== "string") throw new Error("Invalid task identifier");

    const { FailsafeGuard } = await import("@/lib/failsafe/failsafe-guard");
    return await FailsafeGuard.runIdempotent(`task_complete:${userId}:${id}:${completed}`, 3000, async () => {
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task || task.userId !== userId) {
        throw new Error("Task not found or unauthorized");
      }

      if (task.completed === completed) {
        return { alreadyDone: true };
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Update task status
        const updatedTask = await tx.task.update({
          where: { id },
          data: {
            completed,
            completedAt: completed ? new Date() : null
          }
        });

        // 2. Find and update linked quest progress
        const linkedQuest = await tx.quest.findUnique({ where: { taskId: id } });
        let questCompleted = false;
        let xpGained = 0;
        let coinsGained = 0;
        let didLevelUp = false;
        let newLevelVal = null;
        let streakUpdated = false;
        let currentStreak = 0;

        if (linkedQuest) {
          const questProgress = await tx.questProgress.findFirst({
            where: { userId, questId: linkedQuest.id }
          });

          if (questProgress) {
            await tx.questProgress.update({
              where: { id: questProgress.id },
              data: {
                status: completed ? "COMPLETED" : "ACTIVE",
                completedAt: completed ? new Date() : null,
                progress: completed ? 1 : 0
              }
            });
            questCompleted = completed;
          }
        }

        // 3. If completing, award rewards and process streaks
        if (completed) {
          const character = await tx.character.findUnique({
            where: { userId },
            include: { stats: true }
          });

          let buildingsObj: any = character?.buildings || {};
          if (typeof buildingsObj === "string") {
            try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
          }
          const { TaskRewardEngine } = await import("@/lib/services/task-reward-engine");
          const rewards = TaskRewardEngine.resolveRewards({
            xpReward: linkedQuest?.xpReward,
            coinReward: linkedQuest?.coinReward,
            priority: task.priority
          });
          xpGained = rewards.xp;
          coinsGained = rewards.coins;

          const { ChroniclesService } = await import("@/lib/services/chronicles-service");
          await ChroniclesService.createEntry(userId, "TASK", "Task Completed", `Completed task: ${task.title} (+${xpGained} XP, +${coinsGained} Coins)`);

          const { NotificationService } = await import("@/lib/services/notification-service");
          await NotificationService.send(
            userId,
            "🎉 Task Completed",
            `You completed "${task.title}" and earned +${xpGained} XP and +${coinsGained} Coins.`,
            "TASK_COMPLETED",
            tx
          );

          if (character) {
            const { UnifiedRewardEngine } = await import("@/lib/reward-engine/unified-reward-engine");
            const breakdown = {
              transactionId: `tx_task_${Date.now()}`,
              source: `TASK_COMPLETED:${id}`,
              baseXp: xpGained,
              baseCoins: coinsGained,
              skillXpBonus: 0,
              skillCoinBonus: 0,
              ascensionXpBonus: 0,
              ascensionCoinBonus: 0,
              finalXp: xpGained,
              finalCoins: coinsGained,
              xpCapApplied: false,
              appliedModifiers: [],
              timestamp: Date.now()
            };
            const awardRes = await UnifiedRewardEngine.processAward(userId, breakdown, tx);
            didLevelUp = awardRes.didLevelUp;
            newLevelVal = awardRes.didLevelUp ? awardRes.newLevel : null;

            // Grant Skill XP based on task category
            const { RewardEngine } = await import("@/lib/services/reward-engine");
            await RewardEngine.awardSkillXP(userId, task.category, xpGained, tx);

            // Award independent Hero Attributes XP
            const { HeroAttributeEngine } = await import("@/lib/services/hero-attribute-engine");
            const attrRewards = HeroAttributeEngine.getAttributeRewardsForCategory(task.category, 10);
            await HeroAttributeEngine.awardAttributeXP(userId, attrRewards, tx);
          }

          // 4. Update streaks if the task is recurring using central StreakService
          if (task.repeat && task.repeat !== "None") {
            const streakName = task.title.trim();
            let streak = await tx.streak.findUnique({
              where: { userId_name: { userId, name: streakName } }
            });

            if (!streak) {
              streak = await tx.streak.create({
                data: {
                  userId,
                  name: streakName,
                  current: 0,
                  best: 0,
                  lastCheckin: new Date(0)
                }
              });
            }

            const { StreakService } = await import("@/lib/services/streak-service");
            const sRes = await StreakService.checkIn(userId, streak.id, tx);
            if (sRes.success && sRes.streak) {
              streakUpdated = sRes.updated;
              currentStreak = sRes.streak.current;
            }
          }

          // 5. Track and unlock achievements & quest progress
          const { RewardEngine } = await import("@/lib/services/reward-engine");
          await RewardEngine.checkAndUnlockAchievementsInternal(userId, tx);

          const { QuestEngine } = await import("@/lib/services/quest-engine");
          await QuestEngine.emit({ userId, type: "TASK_COMPLETED", value: 1 }, tx);
        }

        return {
          task: updatedTask,
          xpGained,
          coinsGained,
          levelUp: didLevelUp,
          newLevel: newLevelVal,
          streakUpdated,
          currentStreak
        };
      });

      const { revalidatePath } = await import("next/cache");
      revalidatePath("/");
      revalidatePath("/quests");
      revalidatePath("/boss-arena");
      revalidatePath("/life-map");

      return result;
    });
  });
}

export async function reorderTasksAction(taskIds: string[]) {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    // Zero-Trust input list verification: verify all ids belong to caller
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId
      }
    });

    if (tasks.length !== taskIds.length) {
      throw new Error("One or more task identifiers are invalid or unauthorized");
    }

    await prisma.$transaction(
      taskIds.map((id, index) => 
        prisma.task.update({
          where: { id, userId },
          data: { order: index }
        })
      )
    );

    return true;
  });
}
