import type { AppNotification } from "@/types";

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  let active = true;

  const fetchNotifications = async () => {
    try {
      const { getNotificationsAction } = await import("@/actions/game-actions");
      const notifs = await getNotificationsAction(userId);
      if (active) callback(notifs as AppNotification[]);
    } catch (e) {
      if (active) callback([]);
    }
  };

  fetchNotifications();
  const interval = setInterval(fetchNotifications, 15000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function createNotification(
  userId: string,
  notification: Omit<AppNotification, "id" | "createdAt" | "read">
): Promise<void> {
  try {
    const { createNotificationAction } = await import("@/actions/game-actions");
    await createNotificationAction(userId, notification);
  } catch (e) {
    console.error("Failed to create notification");
  }
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  try {
    const { markNotificationReadAction } = await import("@/actions/game-actions");
    await markNotificationReadAction(notificationId);
  } catch (e) {
    console.error("Failed to mark read");
  }
}

// Common notification triggers
export async function notifyStreakWarning(userId: string, streakName: string) {
  await createNotification(userId, {
    type: "streak_warning",
    title: "⚠️ Streak at Risk!",
    body: `Your "${streakName}" streak will break if you don't check in today.`,
  });
}

export async function notifyBossAlert(userId: string, bossName: string) {
  await createNotification(userId, {
    type: "boss_alert",
    title: "🔥 Boss Challenge!",
    body: `${bossName} is waiting. Complete quests to deal damage!`,
  });
}

export async function notifyAchievement(userId: string, achievementName: string) {
  await createNotification(userId, {
    type: "achievement",
    title: "🏆 Achievement Unlocked!",
    body: `You earned: ${achievementName}`,
  });
}
