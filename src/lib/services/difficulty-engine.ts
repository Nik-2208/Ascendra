import "server-only";
import { prisma } from "@/lib/prisma";

export interface AscensionProfile {
  count: number;
  multiplier: number; // 1 + (count * 0.10)
  difficultyPercent: string;
  lifetimeXP: number;
  lifetimeCoins: number;
  lifetimeTasks: number;
  lifetimeBossKills: number;
  lifetimeFocusSecs: number;
  history: Array<{
    ascensionNumber: number;
    date: string;
    levelAtAscension: number;
    titleGranted: string;
  }>;
}

export class DifficultyEngine {
  /**
   * Calculates global difficulty multiplier.
   * Formula: 1 + (ascensionCount * 0.10)
   * Example: Ascension 0 -> 1.0 (100%), Ascension 1 -> 1.1 (110%), Ascension 10 -> 2.0 (200%)
   */
  static getMultiplier(ascensionCount: number): number {
    const count = Math.max(0, Math.floor(ascensionCount));
    return Number((1 + count * 0.10).toFixed(2));
  }

  /**
   * Retrieves user's complete Ascension Profile and difficulty status
   */
  static async getAscensionProfile(userId: string, tx?: any): Promise<AscensionProfile> {
    const db = tx || prisma;
    const character = await db.character.findUnique({
      where: { userId },
      select: { prestige: true, rebirths: true, buildings: true, xp: true }
    });

    if (!character) {
      return {
        count: 0,
        multiplier: 1.0,
        difficultyPercent: "100%",
        lifetimeXP: 0,
        lifetimeCoins: 0,
        lifetimeTasks: 0,
        lifetimeBossKills: 0,
        lifetimeFocusSecs: 0,
        history: []
      };
    }

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }

    const asc = buildingsObj.ascension || {};
    const count = Math.max(0, character.prestige || 0, character.rebirths || 0, asc.count || 0);
    const multiplier = DifficultyEngine.getMultiplier(count);

    return {
      count,
      multiplier,
      difficultyPercent: `${Math.round(multiplier * 100)}%`,
      lifetimeXP: Math.max(character.xp, asc.lifetimeXP || character.xp || 0),
      lifetimeCoins: asc.lifetimeCoins || 0,
      lifetimeTasks: asc.lifetimeTasks || 0,
      lifetimeBossKills: asc.lifetimeBossKills || 0,
      lifetimeFocusSecs: asc.lifetimeFocusSecs || 0,
      history: asc.history || []
    };
  }

  /**
   * Scale XP requirements by difficulty multiplier
   */
  static scaleXP(baseXP: number, multiplier: number): number {
    return Math.round(baseXP * multiplier);
  }

  /**
   * Scale price or cost by difficulty multiplier
   */
  static scaleCost(baseCost: number, multiplier: number): number {
    return Math.round(baseCost * multiplier);
  }

  /**
   * Scale Boss stats (HP, damage, defense) by difficulty multiplier
   */
  static scaleBossStats(baseHp: number, baseDmg: number, baseDef: number, multiplier: number) {
    return {
      scaledHp: Math.round(baseHp * multiplier),
      scaledDamage: Math.round(baseDmg * multiplier),
      scaledDefense: Math.round(baseDef * multiplier)
    };
  }
}
