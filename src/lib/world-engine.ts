import type { StatName } from "@/types";

// ============================================================
// World Engine — Regions, fog of war, unlock conditions
// ============================================================

export interface WorldRegion {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  linkedStat: StatName;
  unlockCondition: UnlockCondition;
  position: { x: number; y: number };
  connections: string[];
  questThemes: string[];
  bossName: string | null;
}

export type UnlockCondition =
  | { type: "level"; value: number }
  | { type: "boss_defeated"; bossId: string }
  | { type: "stat_level"; stat: StatName; value: number }
  | { type: "always" };

export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: "starting_village",
    name: "Starting Village",
    description: "Where your journey begins. A safe haven for all adventurers.",
    emoji: "🏠",
    color: "#22c55e",
    linkedStat: "health",
    unlockCondition: { type: "always" },
    position: { x: 50, y: 85 },
    connections: ["health_kingdom", "forest_of_focus"],
    questThemes: ["daily habits", "basic self-care"],
    bossName: "Training Dummy",
  },
  {
    id: "health_kingdom",
    name: "Health Kingdom",
    description: "A realm of physical vitality. Train your body, heal your mind.",
    emoji: "❤️",
    color: "#ef4444",
    linkedStat: "health",
    unlockCondition: { type: "level", value: 3 },
    position: { x: 25, y: 65 },
    connections: ["starting_village", "arena_of_strength"],
    questThemes: ["exercise", "nutrition", "sleep"],
    bossName: "Plague Beast",
  },
  {
    id: "forest_of_focus",
    name: "Forest of Focus",
    description: "Ancient trees whisper secrets of concentration.",
    emoji: "🌲",
    color: "#16a34a",
    linkedStat: "focus",
    unlockCondition: { type: "level", value: 5 },
    position: { x: 75, y: 65 },
    connections: ["starting_village", "library_of_knowledge"],
    questThemes: ["deep work", "meditation", "distraction control"],
    bossName: "Distraction Hydra",
  },
  {
    id: "arena_of_strength",
    name: "Arena of Strength",
    description: "Warriors test their might against impossible odds.",
    emoji: "⚔️",
    color: "#f97316",
    linkedStat: "strength",
    unlockCondition: { type: "level", value: 8 },
    position: { x: 15, y: 40 },
    connections: ["health_kingdom", "career_mountains"],
    questThemes: ["physical training", "pushing limits"],
    bossName: "Iron Colossus",
  },
  {
    id: "library_of_knowledge",
    name: "Grand Library",
    description: "Infinite shelves of wisdom await the curious mind.",
    emoji: "📚",
    color: "#3b82f6",
    linkedStat: "knowledge",
    unlockCondition: { type: "level", value: 11 },
    position: { x: 85, y: 40 },
    connections: ["forest_of_focus", "creativity_forest"],
    questThemes: ["reading", "courses", "research"],
    bossName: "Archivist Phantom",
  },
  {
    id: "career_mountains",
    name: "Career Mountains",
    description: "Treacherous peaks where ambition meets opportunity.",
    emoji: "⛰️",
    color: "#7c3aed",
    linkedStat: "discipline",
    unlockCondition: { type: "level", value: 14 },
    position: { x: 30, y: 20 },
    connections: ["arena_of_strength", "finance_desert", "citadel"],
    questThemes: ["career development", "networking", "skills"],
    bossName: "Corporate Titan",
  },
  {
    id: "creativity_forest",
    name: "Creativity Forest",
    description: "A kaleidoscopic realm where imagination runs wild.",
    emoji: "🎨",
    color: "#ec4899",
    linkedStat: "creativity",
    unlockCondition: { type: "level", value: 17 },
    position: { x: 70, y: 20 },
    connections: ["library_of_knowledge", "relationship_isles", "citadel"],
    questThemes: ["art", "music", "writing", "building"],
    bossName: "Chaos Muse",
  },
  {
    id: "finance_desert",
    name: "Finance Desert",
    description: "Only the wise survive the harsh economy of this barren land.",
    emoji: "💰",
    color: "#f59e0b",
    linkedStat: "finance",
    unlockCondition: { type: "level", value: 20 },
    position: { x: 20, y: 10 },
    connections: ["career_mountains"],
    questThemes: ["saving", "investing", "budgeting"],
    bossName: "Golden Wyrm",
  },
  {
    id: "relationship_isles",
    name: "Relationship Isles",
    description: "Scattered islands connected by bridges of trust.",
    emoji: "🤝",
    color: "#06b6d4",
    linkedStat: "relationships",
    unlockCondition: { type: "level", value: 24 },
    position: { x: 80, y: 10 },
    connections: ["creativity_forest"],
    questThemes: ["social", "family", "community"],
    bossName: "Shadow Diplomat",
  },
  {
    id: "citadel",
    name: "The Citadel",
    description: "The ultimate proving ground. Only legends may enter.",
    emoji: "🏰",
    color: "#a855f7",
    linkedStat: "wisdom",
    unlockCondition: { type: "level", value: 30 },
    position: { x: 50, y: 5 },
    connections: ["career_mountains", "creativity_forest"],
    questThemes: ["mastery", "legacy", "purpose"],
    bossName: "Chronos, Lord of Mastery",
  },
];

/**
 * Check if a region is unlocked for a given player state.
 */
export function isRegionUnlocked(
  region: WorldRegion,
  playerLevel: number,
  stats: Record<StatName, { level: number; xp: number }>,
  defeatedBossIds: Set<string>
): boolean {
  const cond = region.unlockCondition;
  switch (cond.type) {
    case "always":
      return true;
    case "level":
      return playerLevel >= cond.value;
    case "stat_level":
      return (stats[cond.stat]?.level || 0) >= cond.value;
    case "boss_defeated":
      return defeatedBossIds.has(cond.bossId);
  }
}
