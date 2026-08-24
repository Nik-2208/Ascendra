import type { StatName } from "@/types";

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  tree: StatName | "general";
  tier: number;
  prerequisites: string[];
  cost: number;
  requiredLevel: number;
  effect: SkillEffect;
}

export interface SkillEffect {
  type: string;
  stat?: StatName;
  value: number;
}

export const SKILL_NODES: SkillNode[] = [
  // --- KNOWLEDGE TREE ---
  { id: "sk_scholar", name: "Scholar", description: "+3% Study XP", icon: "📚", tree: "knowledge", tier: 1, prerequisites: [], cost: 1, requiredLevel: 2, effect: { type: "xp_bonus", stat: "knowledge", value: 0.03 } },
  { id: "sk_focused_mind", name: "Focused Mind", description: "+4% Pomodoro XP", icon: "🧠", tree: "knowledge", tier: 2, prerequisites: ["sk_scholar"], cost: 2, requiredLevel: 5, effect: { type: "xp_bonus", stat: "knowledge", value: 0.04 } },

  // --- STRENGTH TREE ---
  { id: "sk_power_strike", name: "Power Strike", description: "+5% Boss Damage", icon: "💥", tree: "strength", tier: 1, prerequisites: [], cost: 1, requiredLevel: 2, effect: { type: "boss_damage", value: 0.05 } },
  { id: "sk_iron_body", name: "Iron Body", description: "+4% Workout XP", icon: "🔥", tree: "strength", tier: 2, prerequisites: ["sk_power_strike"], cost: 2, requiredLevel: 5, effect: { type: "xp_bonus", stat: "strength", value: 0.04 } },

  // --- DISCIPLINE TREE ---
  { id: "sk_meditation_master", name: "Meditation Master", description: "+5% Meditation Rewards", icon: "🧘", tree: "discipline", tier: 1, prerequisites: [], cost: 1, requiredLevel: 2, effect: { type: "xp_bonus", stat: "discipline", value: 0.05 } },
  { id: "sk_guardian", name: "Guardian", description: "-5% Boss Damage Taken", icon: "🛡️", tree: "discipline", tier: 2, prerequisites: ["sk_meditation_master"], cost: 2, requiredLevel: 5, effect: { type: "damage_taken_reduction", value: 0.05 } },

  // --- HEALTH TREE ---
  { id: "sk_vitality", name: "Vitality", description: "+5% Max HP", icon: "❤️", tree: "health", tier: 1, prerequisites: [], cost: 1, requiredLevel: 2, effect: { type: "stat_multiplier", stat: "health", value: 0.05 } },
  { id: "sk_quick_recovery", name: "Quick Recovery", description: "+5% HP Recovery", icon: "🔋", tree: "health", tier: 2, prerequisites: ["sk_vitality"], cost: 2, requiredLevel: 5, effect: { type: "hp_recovery", value: 0.05 } },

  // --- FINANCE TREE ---
  { id: "sk_treasure_hunter", name: "Treasure Hunter", description: "+4% Coin Rewards", icon: "🪙", tree: "finance", tier: 1, prerequisites: [], cost: 1, requiredLevel: 2, effect: { type: "coin_bonus", value: 0.04 } },
  { id: "sk_merchants_blessing", name: "Merchant's Blessing", description: "+5% Shop Discounts", icon: "🏷️", tree: "finance", tier: 2, prerequisites: ["sk_treasure_hunter"], cost: 2, requiredLevel: 5, effect: { type: "shop_discount", value: 0.05 } },
  { id: "sk_lucky_explorer", name: "Lucky Explorer", description: "+6% Rare Loot Chance", icon: "🍀", tree: "finance", tier: 3, prerequisites: ["sk_merchants_blessing"], cost: 3, requiredLevel: 10, effect: { type: "loot_bonus", value: 0.06 } },

  // --- GENERAL TREE ---
  { id: "sk_efficient_learner", name: "Efficient Learner", description: "+5% All XP", icon: "✨", tree: "general", tier: 1, prerequisites: [], cost: 1, requiredLevel: 3, effect: { type: "xp_bonus", value: 0.05 } },
  { id: "sk_master_adventurer", name: "Master Adventurer", description: "+7% All Rewards", icon: "🏆", tree: "general", tier: 2, prerequisites: ["sk_efficient_learner"], cost: 2, requiredLevel: 6, effect: { type: "all_rewards", value: 0.07 } },
  { id: "sk_legend", name: "Legend", description: "+9% Global Bonus", icon: "🌟", tree: "general", tier: 3, prerequisites: ["sk_master_adventurer"], cost: 3, requiredLevel: 12, effect: { type: "global_bonus", value: 0.09 } },

  // --- PRODUCTIVITY & EXTRA SYSTEMS ---
  { id: "sk_critical_mastery", name: "Critical Mastery", description: "+5% Critical Chance", icon: "🎯", tree: "general", tier: 1, prerequisites: [], cost: 1, requiredLevel: 3, effect: { type: "crit_chance", value: 0.05 } },
  { id: "sk_executioner", name: "Executioner", description: "+10% Critical Damage", icon: "⚔️", tree: "general", tier: 2, prerequisites: ["sk_critical_mastery"], cost: 2, requiredLevel: 6, effect: { type: "crit_damage", value: 0.10 } },
  { id: "sk_village_architect", name: "Village Architect", description: "+6% Village Growth", icon: "🏰", tree: "general", tier: 1, prerequisites: [], cost: 1, requiredLevel: 4, effect: { type: "village_growth", value: 0.06 } },
  { id: "sk_world_explorer", name: "World Explorer", description: "+5% Region Progress", icon: "🧭", tree: "general", tier: 2, prerequisites: ["sk_village_architect"], cost: 2, requiredLevel: 8, effect: { type: "region_progress", value: 0.05 } },
  { id: "sk_quest_master", name: "Quest Master", description: "+5% Quest Rewards", icon: "📜", tree: "general", tier: 1, prerequisites: [], cost: 1, requiredLevel: 5, effect: { type: "quest_rewards", value: 0.05 } },
  { id: "sk_boss_slayer", name: "Boss Slayer", description: "+8% Boss Rewards", icon: "💀", tree: "general", tier: 2, prerequisites: ["sk_quest_master"], cost: 2, requiredLevel: 10, effect: { type: "boss_rewards", value: 0.08 } }
];

export function canUnlockNode(
  node: SkillNode,
  unlockedIds: Set<string>,
  skillPoints: number,
  playerLevel: number
): boolean {
  if (unlockedIds.has(node.id)) return false;
  if (playerLevel < node.requiredLevel) return false;
  if (skillPoints < node.cost) return false;
  return node.prerequisites.every((pre) => unlockedIds.has(pre));
}

export interface ActiveMultipliers {
  xpBonus: number;      // capped at 0.30 max (+30%)
  coinBonus: number;    // capped at 0.30 max (+30%)
  bossDamage: number;  // max +0.20 (+20%)
  critChance: number;  // max +0.10 (+10%)
  critDamage: number;  // max +0.25 (+25%)
  shopDiscount: number; // max +0.15 (+15%)
  brainXpBonus: number; // max +0.10 (+10%)
}

/**
 * Calculates active skill multipliers with diminishing returns and +30% hard caps.
 * ONLY active (enabled) skills are calculated.
 */
export function calculateActiveSkillMultipliers(activeSkillIds: Set<string> | string[]): ActiveMultipliers {
  const activeSet = activeSkillIds instanceof Set ? activeSkillIds : new Set(activeSkillIds);
  const activeNodes = SKILL_NODES.filter((n) => activeSet.has(n.id));

  let rawXpBonus = 0;
  let rawCoinBonus = 0;
  let bossDamage = 0;
  let critChance = 0;
  let critDamage = 0;
  let shopDiscount = 0;
  let brainXpBonus = 0;

  for (const node of activeNodes) {
    const { type, value } = node.effect;
    if (type === "xp_bonus" || type === "all_rewards" || type === "global_bonus" || type === "quest_rewards") {
      // Diminishing returns: bonus = bonus + value * (1 - currentBonus * 0.5)
      rawXpBonus += value * (1 - rawXpBonus * 0.5);
    }
    if (type === "coin_bonus" || type === "all_rewards" || type === "global_bonus") {
      rawCoinBonus += value * (1 - rawCoinBonus * 0.5);
    }
    if (type === "boss_damage") {
      bossDamage += value;
    }
    if (type === "crit_chance") {
      critChance += value;
    }
    if (type === "crit_damage") {
      critDamage += value;
    }
    if (type === "shop_discount") {
      shopDiscount += value;
    }
    if (type === "brain_xp_bonus") {
      brainXpBonus += value;
    }
  }

  return {
    xpBonus: Math.min(0.30, Math.max(0, rawXpBonus)),
    coinBonus: Math.min(0.30, Math.max(0, rawCoinBonus)),
    bossDamage: Math.min(0.20, Math.max(0, bossDamage)),
    critChance: Math.min(0.10, Math.max(0, critChance)),
    critDamage: Math.min(0.25, Math.max(0, critDamage)),
    shopDiscount: Math.min(0.15, Math.max(0, shopDiscount)),
    brainXpBonus: Math.min(0.10, Math.max(0, brainXpBonus)),
  };
}

export function calculateSkillEffects(unlockedIds: Set<string>): SkillEffect[] {
  return SKILL_NODES.filter((n) => unlockedIds.has(n.id)).map((n) => n.effect);
}

export function calculateAvailableSkillPoints(playerLevel: number, unlockedIds: Set<string>): number {
  const totalEarned = Math.floor(playerLevel / 2);
  const totalSpent = SKILL_NODES.filter((n) => unlockedIds.has(n.id)).reduce((sum, n) => sum + n.cost, 0);
  return Math.max(0, totalEarned - totalSpent);
}
