export type QuestCategory =
  | "DAILY"
  | "WEEKLY"
  | "LONG_TERM"
  | "STORY"
  | "CAMPAIGN"
  | "REPEATABLE"
  | "HABIT"
  | "FOCUS"
  | "FITNESS"
  | "LEARNING"
  | "FINANCE"
  | "CODING"
  | "MINDFULNESS"
  | "CUSTOM"
  | "EVENT"
  | "BOSS"
  | "CHALLENGE";

export type QuestDifficulty = "EASY" | "MEDIUM" | "HARD";

export type QuestTrackingMode = "AUTOMATIC" | "MANUAL";

export interface QuestDifficultyScale {
  difficulty: QuestDifficulty;
  xpMin: number;
  xpMax: number;
  coinsMin: number;
  coinsMax: number;
}

export const QUEST_DIFFICULTY_POLICY: Record<QuestDifficulty, QuestDifficultyScale> = {
  EASY: {
    difficulty: "EASY",
    xpMin: 25,
    xpMax: 30,
    coinsMin: 5,
    coinsMax: 10
  },
  MEDIUM: {
    difficulty: "MEDIUM",
    xpMin: 55,
    xpMax: 60,
    coinsMin: 15,
    coinsMax: 25
  },
  HARD: {
    difficulty: "HARD",
    xpMin: 75,
    xpMax: 100,
    coinsMin: 30,
    coinsMax: 50
  }
};

export const QUEST_ENGINE_CONSTANTS = {
  MAX_DISPLAYED_XP: 100,
  MAX_AWARDED_XP: 150,
  DAILY_RATION: {
    xp: 10,
    coins: 20
  },
  MANUAL_HONESTY_PLEDGE: "Be truthful to yourself. Honor your real-life progress."
} as const;

export interface CanonicalQuestItem {
  id: string;
  progressId?: string;
  questId?: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  trackingMode: QuestTrackingMode;
  baseXpReward: number;
  baseCoinReward: number;
  xpReward: number;
  coinReward: number;
  progress: number;
  target: number;
  status: "ACTIVE" | "COMPLETED" | "FAILED";
  completedAt?: string | null;
  isGlobal?: boolean;
  taskId?: string | null;
  userId?: string;
  createdAt?: string;
}
