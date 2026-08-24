// ============================================================
// Life RPG OS V2 — Shared Type Definitions
// ============================================================

// Timestamp type — replaces firebase/firestore Timestamp
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Timestamp = unknown;


// ---- Character & Stats ----

export const STAT_NAMES = [
  "strength",
  "focus",
  "discipline",
  "knowledge",
  "health",
  "creativity",
  "charisma",
  "wisdom",
  "finance",
  "relationships",
] as const;

export type StatName = (typeof STAT_NAMES)[number];

export interface StatData {
  level: number;
  xp: number;
}

export interface CharacterSettings {
  sound: boolean;
  currency: string;
  timezone: string;
}

export interface CharacterProfile {
  userId?: string;
  displayName?: string;
  email?: string;
  level: number;
  prestige: number;
  rebirths?: number;
  totalXP: number;
  coins: number;
  gems?: number;
  premiumCoins?: number;
  title?: string;
  className?: string;
  avatar?: string;
  lifeGoal?: string;
  onboardingComplete?: boolean;
  isAdmin?: boolean;
  createdAt?: Timestamp | null;
  lastActive?: Timestamp | null;
  currentSeason?: string;
  settings?: CharacterSettings;
  stats: Record<StatName, StatData>;
  skillPoints?: number;
  unlockedSkills?: string[];
  unlockedRegions?: string[];
  urgesWon?: number;
  combatPower?: number;
}

// ---- Quests ----

export type QuestType =
  | "daily"
  | "weekly"
  | "monthly"
  | "story"
  | "side"
  | "seasonal"
  | "guild";

export type QuestStatus = "active" | "completed" | "failed" | "expired";

export type QuestDifficulty = "easy" | "medium" | "hard" | "epic" | "legendary";

export type QuestPriority = "low" | "medium" | "high" | "critical";

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  status: QuestStatus;
  difficulty: QuestDifficulty;
  priority: QuestPriority;
  stat: StatName;
  xpReward: number;
  coinReward: number;
  lootTableId: string | null;
  bossId: string | null;
  chainId: string | null;
  chainStep: number;
  dueDate: Timestamp | null;
  estimatedMinutes: number;
  completedAt: Timestamp | null;
  createdAt: Timestamp | null;
}

// ---- Bosses ----

export type BossStatus = "active" | "defeated" | "abandoned";

export interface Boss {
  id: string;
  name: string;
  description: string;
  lore: string;
  maxHP: number;
  currentHP: number;
  phase: number;
  weaknesses: StatName[];
  status: BossStatus;
  rewards: {
    xp: number;
    coins: number;
    lootTableId: string | null;
  };
  linkedStats: StatName[];
  defeatedAt: Timestamp | null;
  createdAt: Timestamp | null;
}

// ---- Streaks ----

export interface Streak {
  id: string;
  name: string;
  currentCount: number;
  bestCount: number;
  lastCheckin: Timestamp | null;
  stat: StatName;
  createdAt: Timestamp | null;
}

// ---- Achievements ----

export interface AchievementTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: {
    type: string;
    threshold: number;
  };
  rewards: {
    xp: number;
    coins: number;
  };
}

export interface Achievement {
  id: string;
  templateId: string;
  unlockedAt: Timestamp | null;
  progress: number;
}

// ---- Pets ----

export interface PetEvolution {
  stage: number;
  emoji: string;
  requiredLevel: number;
}

export interface PetTemplate {
  id: string;
  name: string;
  description: string;
  baseEmoji: string;
  evolutions: PetEvolution[];
  bonuses: {
    statBoost: StatName;
    xpMultiplier: number;
  };
}

export type PetMood = "happy" | "neutral" | "sad";

export interface Pet {
  id: string;
  templateId: string;
  name: string;
  level: number;
  xp: number;
  evolutionStage: number;
  isActive: boolean;
  mood: PetMood;
  lastInteraction: Timestamp | null;
}

// ---- Inventory / Gear ----

export type ItemRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic"
  | "ancient";

export type GearSlot =
  | "weapon"
  | "armor"
  | "artifact"
  | "relic"
  | "accessory";

export interface GearTemplate {
  id: string;
  name: string;
  slot: GearSlot;
  baseStats: Record<string, number>;
  rarityWeights: Record<ItemRarity, number>;
}

export type ItemType = "gear" | "consumable" | "quest_item" | "cosmetic" | "pet_item";

export interface InventoryItem {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  type: ItemType;
  slot: GearSlot;
  rarity: ItemRarity;
  stats: Partial<Record<StatName, number>>;
  equipped: boolean;
  obtainedAt: Timestamp | null;
}

// ---- Money Jar ----

export interface MoneyJarData {
  totalSaved: number;
  currency: string;
  goal: number;
}

export interface MoneyJarTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: Timestamp | null;
}

// ---- Seasons ----

export interface Season {
  id: string;
  name: string;
  theme: string;
  startDate: Timestamp;
  endDate: Timestamp;
  rewards: Array<{
    tier: number;
    xpRequired: number;
    reward: string;
    icon: string;
  }>;
}

// ---- Classes ----

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  emoji: string;
  statBonuses: Partial<Record<StatName, number>>;
  starterGear: string[];
}

// ---- Action Log ----

export type ActionLogType =
  | "quest_completed"
  | "boss_damaged"
  | "boss_attack"
  | "boss_defeated"
  | "urge_victory"
  | "level_up"
  | "achievement"
  | "purchase"
  | "item_bought"
  | "streak_checked"
  | "loot_found"
  | "region_unlocked"
  | "skill_unlocked";

export interface ActionLogEntry {
  id: string;
  type: ActionLogType;
  message: string;
  metadata?: Record<string, string | number>;
  createdAt: Timestamp | null;
}

// ---- Analytics ----

export type AnalyticsEvent =
  | "quest_completed"
  | "quest_created"
  | "boss_damage"
  | "boss_defeated"
  | "urge_victory"
  | "urge_defeat"
  | "level_up"
  | "achievement_unlocked"
  | "streak_checkin"
  | "streak_broken"
  | "loot_drop"
  | "pet_interaction"
  | "page_view"
  | "session_start"
  | "session_end"
  | "onboarding_step"
  | "onboarding_complete"
  | "item_purchased"
  | "item_equipped";

export interface AnalyticsEventPayload {
  event: AnalyticsEvent;
  metadata: Record<string, string | number | boolean>;
  timestamp: Timestamp | null;
}

// ---- Notifications ----

export type NotificationType =
  | "streak_warning"
  | "boss_alert"
  | "quest_reminder"
  | "achievement"
  | "season_update"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Timestamp | null;
}

// ---- Leaderboard ----

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  level: number;
  totalXP: number;
  avatar: string;
}

// ---- UI ----

export interface AchievementPopupData {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface LevelUpData {
  newLevel: number;
  show: boolean;
}

export interface LootRevealData {
  item: InventoryItem;
  show: boolean;
}

// ---- Schedule ----

export interface ScheduleBlock {
  id: string;
  title: string;
  startTime: string; // e.g., "09:00"
  durationMins: number;
  statCategory: StatName | "general";
  isActive: boolean;
  createdAt: Timestamp | null;
}

// ---- Coach ----

export interface CoachInsight {
  id: string;
  type: "positive" | "warning" | "suggestion" | "pattern";
  title: string;
  content: string;
  createdAt: Timestamp | null;
}
