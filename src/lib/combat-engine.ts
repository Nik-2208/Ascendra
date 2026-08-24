import type { CharacterProfile, StatName, InventoryItem, GearSlot } from "@/types";
import { CLASS_TEMPLATES, type CharacterClassId } from "./progression-engine";

// ============================================================
// Combat Engine — Dynamic damage calculations
// ============================================================

export interface CombatStats {
  totalPower: number;
  statBonuses: Record<string, number>;
  gearBonus: number;
  classMultiplier: number;
  streakMultiplier: number;
}

/**
 * Calculate the total Combat Power for a player.
 */
export function calculateCombatPower(
  profile: CharacterProfile,
  equippedItems: InventoryItem[],
  streakCount: number = 0
): CombatStats {
  const classId = profile.className as CharacterClassId;
  const classTemplate = CLASS_TEMPLATES[classId];

  // 1. Sum base stat levels
  let baseStatTotal = 0;
  const statBonuses: Record<string, number> = {};

  for (const [statName, statData] of Object.entries(profile.stats)) {
    const multiplier = classTemplate?.baseStatMultipliers[statName as StatName] || 1.0;
    const effective = Math.floor(statData.level * multiplier);
    statBonuses[statName] = effective;
    baseStatTotal += effective;
  }

  // 2. Sum gear bonuses
  let gearBonus = 0;
  for (const item of equippedItems) {
    for (const val of Object.values(item.stats)) {
      gearBonus += val;
    }
  }

  // 3. Streak multiplier (1.0 to 2.0)
  const streakMultiplier = Math.min(2.0, 1.0 + streakCount * 0.03);

  // 4. Class passive multiplier
  let classMultiplier = 1.0;
  if (classId === "warrior") classMultiplier = 1.1; // +10% boss damage
  if (classId === "monk") classMultiplier = 0.95; // monks are discipline-focused, not damage

  const totalPower = Math.floor((baseStatTotal + gearBonus) * streakMultiplier * classMultiplier);

  return { totalPower, statBonuses, gearBonus, classMultiplier, streakMultiplier };
}

/**
 * Calculate damage dealt to a boss from a quest completion.
 */
export function calculateBossDamage(
  profile: CharacterProfile,
  equippedItems: InventoryItem[],
  questStat: StatName,
  questDifficulty: string,
  bossWeaknesses: StatName[],
  streakCount: number = 0
): number {
  const combat = calculateCombatPower(profile, equippedItems, streakCount);

  const difficultyMultipliers: Record<string, number> = {
    easy: 0.5,
    medium: 1.0,
    hard: 1.5,
    epic: 2.5,
    legendary: 5.0,
  };

  const diffMult = difficultyMultipliers[questDifficulty] || 1.0;

  // Weakness bonus: 2x if quest stat matches boss weakness
  const weaknessBonus = bossWeaknesses.includes(questStat) ? 2.0 : 1.0;

  // Relevant stat contributes extra damage
  const relevantStat = combat.statBonuses[questStat] || 1;

  // Base damage formula
  const baseDamage = 10 + relevantStat * 2;
  const finalDamage = Math.floor(baseDamage * diffMult * weaknessBonus * combat.streakMultiplier * combat.classMultiplier);

  return Math.max(1, finalDamage);
}

/**
 * Calculate sell value for an item based on rarity and stats.
 */
export function calculateSellValue(item: InventoryItem): number {
  const rarityMultipliers: Record<string, number> = {
    common: 5,
    rare: 15,
    epic: 40,
    legendary: 100,
    mythic: 250,
    ancient: 500,
  };

  const baseMult = rarityMultipliers[item.rarity] || 5;
  const totalStats = Object.values(item.stats).reduce((a, b) => a + b, 0);

  return Math.floor(baseMult + totalStats * 2);
}
