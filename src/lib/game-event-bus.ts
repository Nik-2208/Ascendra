"use client";

import { trackEvent } from "@/lib/analytics-engine";
import { soundEngine } from "@/lib/sound-engine";
import { useUIStore } from "@/stores/ui-store";

// ── Event Types ──────────────────────────────────────────────

export type GameEventType =
  | "QUEST_COMPLETED"
  | "TASK_COMPLETED"
  | "TASK_CREATED"
  | "TASK_EDITED"
  | "TASK_DELETED"
  | "TASK_STARTED"
  | "TASK_FAILED"
  | "TASK_SKIPPED"
  | "BOSS_SELECTED"
  | "BOSS_DAMAGED"
  | "BOSS_DEFEATED"
  | "BOSS_FLED"
  | "URGE_WON"
  | "URGE_LOST"
  | "STREAK_CHECKIN"
  | "STREAK_BROKEN"
  | "REWARD_PURCHASED"
  | "LEVEL_UP"
  | "ACHIEVEMENT_UNLOCKED"
  | "PET_LEVELED"
  | "PET_EVOLVED"
  | "SKILL_UNLOCKED"
  | "REGION_DISCOVERED"
  | "VILLAGE_UNLOCKED"
  | "VILLAGE_ENTERED"
  | "VILLAGE_COMPLETED"
  | "FOCUS_SESSION_COMPLETED"
  | "MASTERY_GAINED"
  | "VILLAGE_UPGRADED"
  | "BRAIN_GAME_STARTED"
  | "BRAIN_GAME_COMPLETED"
  | "BRAIN_GAME_ABANDONED"
  | "BRAIN_NEW_PB"
  | "CAMPAIGN_CREATED"
  | "CAMPAIGN_COMPLETED"
  | "BACKUP_EXPORTED"
  | "BACKUP_RESTORED"
  | "SETTINGS_UPDATED";

export interface GameEvent {
  type: GameEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}

// ── Handler Registry ─────────────────────────────────────────

type GameEventHandler = (event: GameEvent) => void | Promise<void>;

const handlers: Map<GameEventType | "*", GameEventHandler[]> = new Map();

export function onGameEvent(type: GameEventType | "*", handler: GameEventHandler): () => void {
  const list = handlers.get(type) || [];
  list.push(handler);
  handlers.set(type, list);

  return () => {
    const current = handlers.get(type);
    if (current) {
      handlers.set(
        type,
        current.filter((h) => h !== handler)
      );
    }
  };
}

export async function dispatchGameEvent(
  type: GameEventType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const event: GameEvent = {
    type,
    payload,
    timestamp: Date.now(),
  };

  const specificHandlers = handlers.get(type) || [];
  const wildcardHandlers = handlers.get("*") || [];
  const all = [...specificHandlers, ...wildcardHandlers];

  for (const handler of all) {
    try {
      await handler(event);
    } catch (err) {
      console.error(`[GameEventBus] Error handling event ${type}:`, err);
    }
  }
}

// ── Default Handlers ─────────────────────────────────────────

onGameEvent("*", (event) => {
  const analyticsEvent: any = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: (event.payload.userId as string) || "current_user",
    eventType: event.type,
    payload: event.payload,
    createdAt: new Date(event.timestamp),
  };
  trackEvent(analyticsEvent);
});

onGameEvent("QUEST_COMPLETED", () => {
  soundEngine.playQuestComplete();
});

onGameEvent("LEVEL_UP", (event) => {
  soundEngine.playLevelUp();
  const payload = event.payload as any;
  if (payload?.newLevel) {
    useUIStore.getState().triggerLevelUp(payload.newLevel);
  }
});

onGameEvent("ACHIEVEMENT_UNLOCKED", () => {
  soundEngine.playAchievement();
});

onGameEvent("STREAK_CHECKIN", () => {
  soundEngine.playStreakCheckin();
});

onGameEvent("STREAK_BROKEN", () => {
  soundEngine.playUrgeDefeat();
});

onGameEvent("REWARD_PURCHASED", () => {
  soundEngine.playCoinSpend();
});

onGameEvent("BOSS_DEFEATED", () => {
  soundEngine.playQuestComplete();
});

// Chronicles automatic database logger
onGameEvent("*", async (event) => {
  try {
    const payload = event.payload as any;
    const userId = payload?.userId || payload?.quest?.userId || payload?.boss?.userId;
    if (!userId) return;

    const { createChronicleAction } = await import("@/actions/chronicle-actions");

    let type: string | null = null;
    let title = "";
    let content = "";

    switch (event.type) {
      case "BRAIN_GAME_COMPLETED":
        type = "BRAIN";
        title = `Completed ${payload.gameId || 'Brain Exercise'}`;
        content = `Score: ${payload.score || 0}% • Earned ${payload.brainXp > 0 ? '+' : ''}${payload.brainXp} Brain XP and ${payload.generalXp || 0} XP.`;
        break;
      case "BRAIN_NEW_PB":
        type = "BRAIN";
        title = `New Personal Best in ${payload.gameId}`;
        content = `Achieved a new high score of ${payload.score}%!`;
        break;
      case "QUEST_COMPLETED":
      case "TASK_COMPLETED":
        type = "TASK";
        title = "Task Completed";
        content = `Completed task: "${payload.quest?.title || payload.title || 'Task'}" (+${payload.xpGained || 0} XP, +${payload.coinsGained || 0} Coins).`;
        break;
      case "TASK_CREATED":
        type = "TASK";
        title = "Task Created";
        content = `Added new task: "${payload.title || 'Task'}" (${payload.priority || 'Normal'} Priority).`;
        break;
      case "LEVEL_UP":
        type = "LEVEL_UP";
        title = "Level Up!";
        content = `Promoted to Character Level ${payload.newLevel}!`;
        break;
      case "ACHIEVEMENT_UNLOCKED":
        type = "ACHIEVEMENT";
        title = "Achievement Unlocked";
        content = `Unlocked: "${payload.achievementName || 'Achievement'}"!`;
        break;
      case "BOSS_DEFEATED":
        type = "BOSS";
        title = "Boss Defeated";
        content = `Vanquished "${payload.boss?.name || 'Boss'}"! Earned rewards and progression.`;
        break;
      case "BOSS_DAMAGED":
        type = "BOSS";
        title = "Boss Damaged";
        content = `Dealt ${payload.damage || 0} damage to boss.`;
        break;
      case "URGE_WON":
        type = "RESILIENCE";
        title = "Distraction Overcome";
        content = `Successfully redirected focus and overcame distraction. (+${payload.xpGained || 15} XP).`;
        break;
      case "URGE_LOST":
        type = "RESILIENCE";
        title = "Setback Logged";
        content = `Acknowledged a momentary setback and reset focus for next victory.`;
        break;
      case "REWARD_PURCHASED":
        type = "PURCHASE";
        title = "Item Purchased";
        content = `Purchased: "${payload.itemName || 'Item'}" for ${payload.cost || 0} coins.`;
        break;
      case "PET_LEVELED":
        type = "PET";
        title = "Pet Leveled Up";
        content = `Your companion "${payload.petName || 'Pet'}" reached level ${payload.newLevel}!`;
        break;
      case "SKILL_UNLOCKED":
        type = "SKILL";
        title = "Skill Unlocked";
        content = `Mastered skill: "${payload.skillName || 'Skill'}"!`;
        break;
      case "FOCUS_SESSION_COMPLETED":
        type = payload.isPomodoro ? "POMODORO" : "STOPWATCH";
        title = payload.isPomodoro ? "Pomodoro Completed" : "Focus Session Completed";
        content = `Completed ${Math.round(payload.duration / 60)} minutes of deep focus (+${payload.xpEarned || 0} XP).`;
        break;
      case "VILLAGE_UPGRADED":
        type = "VILLAGE";
        title = "Village Upgraded";
        content = `Upgraded ${payload.buildingName || 'Sanctuary'} to level ${payload.newLevel || 1}.`;
        break;
      case "BACKUP_EXPORTED":
        type = "BACKUP";
        title = "Backup Exported";
        content = `Exported complete game journal & character data backup.`;
        break;
      case "BACKUP_RESTORED":
        type = "BACKUP";
        title = "Backup Restored";
        content = `Restored full database state from backup file.`;
        break;
    }

    if (type) {
      await createChronicleAction(type as any, title, content);
    }
  } catch (err) {
    console.error("[GameEventBus] Chronicles automatic logger failed:", err);
  }
});
