import type { CharacterProfile, StatName, InventoryItem } from "@/types";

export type CharacterClassId = "warrior" | "scholar" | "monk" | "builder" | "creator" | "explorer";

export interface ClassTemplate {
  id: CharacterClassId;
  name: string;
  description: string;
  icon: string;
  primaryStat: StatName;
  baseStatMultipliers: Partial<Record<StatName, number>>;
  passiveBonus: string;
  starterGear: Partial<InventoryItem>[];
}

export const CLASS_TEMPLATES: Record<CharacterClassId, ClassTemplate> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "Focuses on physical health and raw discipline. Deals heavy damage to bosses.",
    icon: "⚔️",
    primaryStat: "strength",
    baseStatMultipliers: {
      strength: 1.2,
      health: 1.1,
      discipline: 1.1,
    },
    passiveBonus: "+10% Boss Damage",
    starterGear: [
      { name: "Wooden Sword", type: "gear", slot: "weapon", rarity: "common", stats: { strength: 2 }, description: "A simple wooden sword." },
      { name: "Leather Tunic", type: "gear", slot: "armor", rarity: "common", stats: { health: 2 }, description: "Basic protection." }
    ]
  },
  scholar: {
    id: "scholar",
    name: "Scholar",
    description: "Master of knowledge and wisdom. Learns quickly and earns more XP.",
    icon: "📚",
    primaryStat: "knowledge",
    baseStatMultipliers: {
      knowledge: 1.3,
      wisdom: 1.1,
      focus: 1.1,
    },
    passiveBonus: "+10% Quest XP",
    starterGear: [
      { name: "Apprentice Wand", type: "gear", slot: "weapon", rarity: "common", stats: { knowledge: 3 }, description: "A wand for a beginner scholar." },
      { name: "Scholar's Robe", type: "gear", slot: "armor", rarity: "common", stats: { focus: 1 }, description: "A comfortable robe for long study sessions." }
    ]
  },
  monk: {
    id: "monk",
    name: "Monk",
    description: "Unbreakable focus and discipline. Excels at fighting distractions and maintaining streaks.",
    icon: "🧘",
    primaryStat: "discipline",
    baseStatMultipliers: {
      discipline: 1.3,
      focus: 1.2,
      health: 1.0,
    },
    passiveBonus: "+20% XP from Distraction Battles",
    starterGear: [
      { name: "Prayer Beads", type: "gear", slot: "accessory", rarity: "common", stats: { discipline: 3 }, description: "Helps maintain focus." },
      { name: "Monk's Habit", type: "gear", slot: "armor", rarity: "common", stats: { focus: 1 }, description: "Simple clothing." }
    ]
  },
  builder: {
    id: "builder",
    name: "Builder",
    description: "Focuses on wealth and structure. Masters the economy and long-term goals.",
    icon: "⚒️",
    primaryStat: "finance",
    baseStatMultipliers: {
      finance: 1.3,
      discipline: 1.1,
      knowledge: 1.1,
    },
    passiveBonus: "+10% Coins from Quests",
    starterGear: [
      { name: "Sturdy Hammer", type: "gear", slot: "weapon", rarity: "common", stats: { finance: 2, strength: 1 }, description: "Good for building." },
      { name: "Toolbelt", type: "gear", slot: "accessory", rarity: "common", stats: { finance: 2 }, description: "Holds many useful things." }
    ]
  },
  creator: {
    id: "creator",
    name: "Creator",
    description: "Driven by inspiration. Excels in creativity and charisma.",
    icon: "🎨",
    primaryStat: "creativity",
    baseStatMultipliers: {
      creativity: 1.3,
      charisma: 1.2,
      focus: 1.0,
    },
    passiveBonus: "-5% Shop Prices",
    starterGear: [
      { name: "Artist's Brush", type: "gear", slot: "weapon", rarity: "common", stats: { creativity: 3 }, description: "Used to paint masterpieces." },
      { name: "Colorful Beret", type: "gear", slot: "armor", rarity: "common", stats: { charisma: 1 }, description: "Very stylish." }
    ]
  },
  explorer: {
    id: "explorer",
    name: "Explorer",
    description: "Jack of all trades. Discovers world regions faster and finds better loot.",
    icon: "🗺️",
    primaryStat: "wisdom",
    baseStatMultipliers: {
      wisdom: 1.2,
      health: 1.1,
      charisma: 1.1,
      focus: 1.1,
    },
    passiveBonus: "+5% Loot Drop Chance",
    starterGear: [
      { name: "Walking Stick", type: "gear", slot: "weapon", rarity: "common", stats: { wisdom: 2, health: 1 }, description: "Reliable for long journeys." },
      { name: "Traveler's Cloak", type: "gear", slot: "armor", rarity: "common", stats: { focus: 1 }, description: "Protects against the elements." }
    ]
  }
};

/**
 * Get the effective stat value by applying class multipliers to the raw base stat.
 */
export function getEffectiveStat(profile: CharacterProfile, statName: StatName, baseValue: number): number {
  const classTemplate = CLASS_TEMPLATES[profile.className as CharacterClassId];
  if (!classTemplate) return baseValue;

  const multiplier = classTemplate.baseStatMultipliers[statName] || 1.0;
  return Math.floor(baseValue * multiplier);
}
