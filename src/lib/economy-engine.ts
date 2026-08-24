import type { StatName, InventoryItem, ItemRarity, GearSlot } from "@/types";

// ============================================================
// Economy Engine — Shop items, pricing, multi-currency
// ============================================================

export type Currency = "coins" | "gems";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "gear" | "consumable" | "cosmetic" | "utility" | "real_reward";
  cost: number;
  currency: Currency;
  requiredLevel: number;
  // If gear, it generates an inventory item on purchase
  generatesItem?: {
    slot: GearSlot;
    rarity: ItemRarity;
    stats: Partial<Record<StatName, number>>;
  };
  // If consumable, it applies an effect
  effect?: {
    type: "xp_boost" | "coin_boost" | "heal" | "skill_reset";
    value: number;
    duration?: number; // in minutes
  };
}

export const SHOP_ITEMS: ShopItem[] = [
  // === GEAR ===
  {
    id: "shop_iron_sword",
    name: "Iron Sword",
    description: "A reliable weapon for the aspiring warrior.",
    icon: "⚔️",
    category: "gear",
    cost: 1000,
    currency: "coins",
    requiredLevel: 3,
    generatesItem: {
      slot: "weapon",
      rarity: "common",
      stats: { strength: 4, discipline: 2 },
    },
  },
  {
    id: "shop_scholars_tome",
    name: "Scholar's Tome",
    description: "Enhances knowledge gain from quests.",
    icon: "📖",
    category: "gear",
    cost: 1500,
    currency: "coins",
    requiredLevel: 5,
    generatesItem: {
      slot: "relic",
      rarity: "rare",
      stats: { knowledge: 6, wisdom: 3 },
    },
  },
  {
    id: "shop_steel_plate",
    name: "Steel Plate Armor",
    description: "Heavy protection for tough battles.",
    icon: "🛡️",
    category: "gear",
    cost: 2500,
    currency: "coins",
    requiredLevel: 8,
    generatesItem: {
      slot: "armor",
      rarity: "rare",
      stats: { health: 8, strength: 4 },
    },
  },
  {
    id: "shop_focus_crystal",
    name: "Focus Crystal",
    description: "An ancient artifact that sharpens concentration.",
    icon: "🔮",
    category: "gear",
    cost: 3750,
    currency: "coins",
    requiredLevel: 10,
    generatesItem: {
      slot: "artifact",
      rarity: "epic",
      stats: { focus: 10, discipline: 5 },
    },
  },
  {
    id: "shop_legendary_ring",
    name: "Ring of Persistence",
    description: "A legendary ring that amplifies all streaks.",
    icon: "💍",
    category: "gear",
    cost: 250,
    currency: "gems",
    requiredLevel: 15,
    generatesItem: {
      slot: "accessory",
      rarity: "legendary",
      stats: { discipline: 12, focus: 8, wisdom: 5 },
    },
  },

  // === CONSUMABLES ===
  {
    id: "shop_xp_potion",
    name: "XP Potion",
    description: "Grants 100 bonus XP instantly.",
    icon: "🧪",
    category: "consumable",
    cost: 500,
    currency: "coins",
    requiredLevel: 1,
    effect: { type: "xp_boost", value: 100 },
  },
  {
    id: "shop_coin_boost",
    name: "Gold Magnet",
    description: "Next 5 quests give double coins.",
    icon: "🧲",
    category: "consumable",
    cost: 750,
    currency: "coins",
    requiredLevel: 5,
    effect: { type: "coin_boost", value: 2, duration: 60 },
  },
  {
    id: "shop_skill_reset",
    name: "Skill Reset Scroll",
    description: "Reset all skill points and redistribute.",
    icon: "📜",
    category: "utility",
    cost: 125,
    currency: "gems",
    requiredLevel: 10,
    effect: { type: "skill_reset", value: 1 },
  },

  // === REAL-LIFE REWARDS ===
  {
    id: "shop_coffee",
    name: "Guilt-Free Coffee",
    description: "You earned it. Go get that coffee.",
    icon: "☕",
    category: "real_reward",
    cost: 250,
    currency: "coins",
    requiredLevel: 1,
  },
  {
    id: "shop_gaming",
    name: "1 Hour Gaming",
    description: "Relax guilt-free with your favorite game.",
    icon: "🎮",
    category: "real_reward",
    cost: 750,
    currency: "coins",
    requiredLevel: 1,
  },
  {
    id: "shop_movie",
    name: "Watch a Movie",
    description: "Take a well-deserved break.",
    icon: "🍿",
    category: "real_reward",
    cost: 1500,
    currency: "coins",
    requiredLevel: 1,
  },
];

export function getShopItemsByCategory(category: ShopItem["category"]): ShopItem[] {
  return SHOP_ITEMS.filter((i) => i.category === category);
}

export function canAfford(coins: number, gems: number, item: ShopItem): boolean {
  if (item.currency === "coins") return coins >= item.cost;
  return gems >= item.cost;
}
