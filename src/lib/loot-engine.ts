import type { ItemRarity, GearSlot, InventoryItem, GearTemplate, StatName } from "@/types";

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#9ca3af", // gray
  rare: "#3b82f6", // blue
  epic: "#a855f7", // purple
  legendary: "#f59e0b", // gold
  mythic: "#ef4444", // red
  ancient: "#06b6d4", // cyan
};

const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  common: 1,
  rare: 1.5,
  epic: 2.5,
  legendary: 5,
  mythic: 10,
  ancient: 25,
};

export function rollLoot(templates: GearTemplate[], dropRate: number = 1.0): Omit<InventoryItem, "id" | "obtainedAt" | "equipped"> | null {
  // Determine if a drop occurs
  if (Math.random() > dropRate) return null;

  // Pick a random template
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Roll rarity based on weights
  const totalWeight = Object.values(template.rarityWeights).reduce((a, b) => a + b, 0);
  let randomWeight = Math.random() * totalWeight;
  let rolledRarity: ItemRarity = "common";

  for (const [rarity, weight] of Object.entries(template.rarityWeights)) {
    if (randomWeight <= weight) {
      rolledRarity = rarity as ItemRarity;
      break;
    }
    randomWeight -= weight;
  }

  // Generate dynamic stats based on baseStats + rarity multiplier + some RNG variance
  const multiplier = RARITY_MULTIPLIERS[rolledRarity];
  const finalStats: Record<string, number> = {};

  for (const [stat, baseValue] of Object.entries(template.baseStats)) {
    const variance = 0.8 + (Math.random() * 0.4); // 80% to 120%
    finalStats[stat] = Math.floor(baseValue * multiplier * variance);
  }

  return {
    templateId: template.id,
    name: `${capitalize(rolledRarity)} ${template.name}`,
    type: "gear",
    slot: template.slot,
    rarity: rolledRarity,
    stats: finalStats as Record<StatName, number>,
  };
}

export function getRarityColor(rarity: ItemRarity): string {
  return RARITY_COLORS[rarity];
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Hardcoded Templates for now (could be moved to Firestore later)
export const LOOT_TEMPLATES: GearTemplate[] = [
  {
    id: "t_sword_focus",
    name: "Blade of Focus",
    slot: "weapon",
    baseStats: { focus: 5, discipline: 2 },
    rarityWeights: { common: 60, rare: 30, epic: 8, legendary: 1.9, mythic: 0.1, ancient: 0 }
  },
  {
    id: "t_armor_health",
    name: "Vitality Plate",
    slot: "armor",
    baseStats: { health: 8, strength: 3 },
    rarityWeights: { common: 50, rare: 35, epic: 12, legendary: 2.8, mythic: 0.2, ancient: 0 }
  },
  {
    id: "t_relic_wisdom",
    name: "Tome of the Ancients",
    slot: "relic",
    baseStats: { wisdom: 10, knowledge: 5 },
    rarityWeights: { common: 20, rare: 40, epic: 30, legendary: 8, mythic: 1.9, ancient: 0.1 }
  }
];
