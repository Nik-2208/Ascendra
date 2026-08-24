/**
 * Achievement Engine — Auto-evaluates achievement conditions on every game event.
 */

import type { CharacterProfile } from "@/types";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  condition: AchievementCondition;
  rewards: { xp: number; coins: number };
}

type AchievementCondition =
  | { type: "quests_completed"; threshold: number }
  | { type: "bosses_defeated"; threshold: number }
  | { type: "streak_count"; threshold: number }
  | { type: "level_reached"; threshold: number }
  | { type: "coins_accumulated"; threshold: number }
  | { type: "pets_owned"; threshold: number }
  | { type: "items_owned"; threshold: number }
  | { type: "urges_won"; threshold: number }
  | { type: "stat_level"; stat: string; threshold: number }
  | { type: "total_xp"; threshold: number }
  | { type: "skills_unlocked"; threshold: number };

// Programmatic Generator for 200+ Achievements
const baseDefinitions: AchievementDefinition[] = [
  {
    id: "first_quest",
    name: "First Steps",
    description: "Complete your first quest.",
    icon: "🌟",
    category: "Quests",
    condition: { type: "quests_completed", threshold: 1 },
    rewards: { xp: 25, coins: 10 },
  }
];

// Generate Quests categories (20 milestones)
for (let i = 2; i <= 25; i++) {
  const threshold = i * 2;
  baseDefinitions.push({
    id: `quest_milestone_${threshold}`,
    name: `Quest Specialist Tier ${i}`,
    description: `Complete ${threshold} total quests successfully.`,
    icon: "📜",
    category: "Quests",
    condition: { type: "quests_completed", threshold },
    rewards: { xp: threshold * 10, coins: threshold * 5 }
  });
}

// Generate Level categories (20 milestones)
for (let i = 2; i <= 25; i++) {
  const threshold = i * 4;
  baseDefinitions.push({
    id: `level_milestone_${threshold}`,
    name: `Rising Hero Tier ${i}`,
    description: `Reach player level ${threshold}.`,
    icon: "⬆️",
    category: "Levels",
    condition: { type: "level_reached", threshold },
    rewards: { xp: threshold * 10, coins: threshold * 5 }
  });
}

// Generate Coins categories (20 milestones)
for (let i = 1; i <= 20; i++) {
  const threshold = i * 1500;
  baseDefinitions.push({
    id: `coin_milestone_${threshold}`,
    name: `Gold Accumulator Tier ${i}`,
    description: `Accumulate ${threshold} total coins in your money jar.`,
    icon: "🪙",
    category: "Finance",
    condition: { type: "coins_accumulated", threshold },
    rewards: { xp: 100, coins: Math.floor(threshold * 0.05) }
  });
}

// Generate Streaks categories (20 milestones)
for (let i = 1; i <= 20; i++) {
  const threshold = i * 3;
  baseDefinitions.push({
    id: `streak_milestone_${threshold}`,
    name: `Consistent Adventurer Tier ${i}`,
    description: `Maintain an active daily streak of ${threshold} days.`,
    icon: "🔥",
    category: "Streaks",
    condition: { type: "streak_count", threshold },
    rewards: { xp: threshold * 15, coins: threshold * 10 }
  });
}

// Generate Skills unlocked (20 milestones)
for (let i = 1; i <= 20; i++) {
  const threshold = i;
  baseDefinitions.push({
    id: `skills_unlocked_${threshold}`,
    name: `Mastery Accumulator Tier ${i}`,
    description: `Unlock ${threshold} skill tree nodes in any path.`,
    icon: "🧘",
    category: "Skills",
    condition: { type: "skills_unlocked", threshold },
    rewards: { xp: threshold * 50, coins: threshold * 25 }
  });
}

// Generate Bosses Defeated (20 milestones)
for (let i = 1; i <= 20; i++) {
  const threshold = i;
  baseDefinitions.push({
    id: `bosses_defeated_${threshold}`,
    name: `Boss Slayer Tier ${i}`,
    description: `Defeat ${threshold} boss monsters.`,
    icon: "🗡️",
    category: "Bosses",
    condition: { type: "bosses_defeated", threshold },
    rewards: { xp: threshold * 100, coins: threshold * 50 }
  });
}

// Generate Items Collection (20 milestones)
for (let i = 1; i <= 20; i++) {
  const threshold = i * 2;
  baseDefinitions.push({
    id: `items_owned_${threshold}`,
    name: `Loot Collector Tier ${i}`,
    description: `Own ${threshold} items in your backpack slots.`,
    icon: "backpack",
    category: "Collection",
    condition: { type: "items_owned", threshold },
    rewards: { xp: threshold * 20, coins: threshold * 10 }
  });
}

// Generate XP milestones (20 milestones)
for (let i = 1; i <= 20; i++) {
  const threshold = i * 2000;
  baseDefinitions.push({
    id: `total_xp_${threshold}`,
    name: `XP Champion Tier ${i}`,
    description: `Earn a cumulative total of ${threshold} XP.`,
    icon: "✨",
    category: "Levels",
    condition: { type: "total_xp", threshold },
    rewards: { xp: 150, coins: 50 }
  });
}

// Generate Stat Levels (20 milestones)
const stats = ["strength", "discipline", "knowledge", "health"];
stats.forEach(stat => {
  for (let i = 1; i <= 10; i++) {
    const threshold = i * 2;
    baseDefinitions.push({
      id: `stat_${stat}_level_${threshold}`,
      name: `${stat.toUpperCase()} Master Tier ${i}`,
      description: `Reach Level ${threshold} in ${stat} attribute.`,
      icon: "🎖️",
      category: stat === "strength" ? "Strength" : stat === "discipline" ? "Focus" : stat === "knowledge" ? "Study" : "Health",
      condition: { type: "stat_level", stat, threshold },
      rewards: { xp: threshold * 25, coins: threshold * 15 }
    });
  }
});

// Generate Hidden Trophies
for (let i = 1; i <= 10; i++) {
  baseDefinitions.push({
    id: `hidden_achievement_${i}`,
    name: `Secret Chronicles Tier ${i}`,
    description: `Unlock this hidden secret chronicle milestone.`,
    icon: "❓",
    category: "Hidden",
    condition: { type: "urges_won", threshold: i * 5 },
    rewards: { xp: 300, coins: 200 }
  });
}

export const ACHIEVEMENT_DEFINITIONS = baseDefinitions;

export interface GameStateSnapshot {
  profile: CharacterProfile | null;
  completedQuestCount: number;
  defeatedBossCount: number;
  bestStreakCount: number;
  urgesWon: number;
  petCount: number;
  itemCount: number;
  skillsCount: number;
}

function checkCondition(condition: AchievementCondition, state: GameStateSnapshot): boolean {
  if (!state.profile) return false;

  switch (condition.type) {
    case "quests_completed":
      return state.completedQuestCount >= condition.threshold;
    case "bosses_defeated":
      return state.defeatedBossCount >= condition.threshold;
    case "streak_count":
      return state.bestStreakCount >= condition.threshold;
    case "level_reached":
      return state.profile.level >= condition.threshold;
    case "coins_accumulated":
      return state.profile.coins >= condition.threshold;
    case "pets_owned":
      return state.petCount >= condition.threshold;
    case "items_owned":
      return state.itemCount >= condition.threshold;
    case "urges_won":
      return state.urgesWon >= condition.threshold;
    case "stat_level":
      return (state.profile.stats?.[condition.stat as keyof typeof state.profile.stats]?.level ?? 0) >= condition.threshold;
    case "total_xp":
      return state.profile.totalXP >= condition.threshold;
    case "skills_unlocked":
      return state.skillsCount >= condition.threshold;
    default:
      return false;
  }
}

export function evaluateAchievements(
  state: GameStateSnapshot,
  alreadyUnlocked: Set<string>
): AchievementDefinition[] {
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (alreadyUnlocked.has(def.id)) continue;

    if (checkCondition(def.condition, state)) {
      newlyUnlocked.push(def);
    }
  }

  return newlyUnlocked;
}
