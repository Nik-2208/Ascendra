import "server-only";
import { prisma } from "@/lib/prisma";

export type StatCategory = 
  | "strength" 
  | "intelligence" 
  | "discipline" 
  | "focus" 
  | "wisdom" 
  | "health" 
  | "resilience" 
  | "creativity" 
  | "charisma" 
  | "productivity";

export interface AttributeState {
  level: number;
  xp: number;
  xpForNextLevel: number;
  lifetimeXP: number;
  progressPercent: number;
}

export type HeroAttributesRecord = Record<StatCategory, AttributeState>;

export class HeroAttributeEngine {
  /**
   * Required XP formula for an attribute to reach next level: 50 * (level ^ 1.3)
   */
  static getRequiredXPForLevel(level: number): number {
    return Math.floor(50 * Math.pow(Math.max(1, level), 1.3));
  }

  /**
   * Calculates attribute state from total lifetime XP
   */
  static getAttributeStateFromLifetimeXP(totalXP: number): AttributeState {
    let level = 1;
    let accumulated = 0;
    let req = HeroAttributeEngine.getRequiredXPForLevel(level);

    while (totalXP >= accumulated + req && level < 100) {
      accumulated += req;
      level++;
      req = HeroAttributeEngine.getRequiredXPForLevel(level);
    }

    const xpIntoLevel = Math.max(0, totalXP - accumulated);
    const progressPercent = Math.min(100, Math.max(0, Number(((xpIntoLevel / req) * 100).toFixed(1))));

    return {
      level,
      xp: xpIntoLevel,
      xpForNextLevel: req,
      lifetimeXP: totalXP,
      progressPercent
    };
  }

  /**
   * Map action types/categories to multi-attribute XP rewards
   */
  static getAttributeRewardsForCategory(category: string, baseAmount = 10): Partial<Record<StatCategory, number>> {
    const cat = (category || "").toLowerCase().trim();

    if (cat.includes("workout") || cat.includes("fitness") || cat.includes("health")) {
      return { strength: Math.round(baseAmount * 1.0), discipline: Math.round(baseAmount * 0.8), health: Math.round(baseAmount * 0.6) };
    }
    if (cat.includes("study") || cat.includes("knowledge") || cat.includes("learning")) {
      return { intelligence: Math.round(baseAmount * 1.0), focus: Math.round(baseAmount * 0.8), wisdom: Math.round(baseAmount * 0.6) };
    }
    if (cat.includes("reading") || cat.includes("book")) {
      return { wisdom: Math.round(baseAmount * 1.0), focus: Math.round(baseAmount * 0.6) };
    }
    if (cat.includes("meditation") || cat.includes("mindfulness")) {
      return { focus: Math.round(baseAmount * 1.0), discipline: Math.round(baseAmount * 0.8), resilience: Math.round(baseAmount * 0.6) };
    }
    if (cat.includes("brain") || cat.includes("game")) {
      return { intelligence: Math.round(baseAmount * 1.0), focus: Math.round(baseAmount * 0.8) };
    }
    if (cat.includes("resilience") || cat.includes("urge")) {
      return { resilience: Math.round(baseAmount * 1.0), discipline: Math.round(baseAmount * 0.8) };
    }
    if (cat.includes("pomodoro") || cat.includes("focus")) {
      return { focus: Math.round(baseAmount * 1.0), productivity: Math.round(baseAmount * 0.8), discipline: Math.round(baseAmount * 0.5) };
    }
    if (cat.includes("boss")) {
      return { strength: Math.round(baseAmount * 1.0), resilience: Math.round(baseAmount * 0.8) };
    }
    if (cat.includes("campaign")) {
      return { productivity: Math.round(baseAmount * 1.0), discipline: Math.round(baseAmount * 0.8) };
    }
    if (cat.includes("creative") || cat.includes("art")) {
      return { creativity: Math.round(baseAmount * 1.0), wisdom: Math.round(baseAmount * 0.5) };
    }
    if (cat.includes("social") || cat.includes("chat")) {
      return { charisma: Math.round(baseAmount * 1.0) };
    }

    // Default fallback
    return { productivity: Math.round(baseAmount * 0.8), discipline: Math.round(baseAmount * 0.6) };
  }

  /**
   * Award attribute XP to user in a transaction and log level-up events
   */
  static async awardAttributeXP(
    userId: string, 
    rewards: Partial<Record<StatCategory, number>>, 
    tx?: any
  ): Promise<HeroAttributesRecord> {
    const db = tx || prisma;
    const character = await db.character.findUnique({
      where: { userId },
      include: { stats: true }
    });

    if (!character) throw new Error("Character not found");

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }

    const currentAttrs = buildingsObj.heroAttributes || {};
    const ALL_CATEGORIES: StatCategory[] = [
      "strength", "intelligence", "discipline", "focus", "wisdom", 
      "health", "resilience", "creativity", "charisma", "productivity"
    ];

    const updatedRecord: Partial<HeroAttributesRecord> = {};
    const levelUpEvents: Array<{ stat: StatCategory; newLevel: number }> = [];

    ALL_CATEGORIES.forEach(cat => {
      const addedXP = Math.max(0, rewards[cat] || 0);
      const existingLifetime = Math.max(0, currentAttrs[cat]?.lifetimeXP || 0);
      const newLifetime = existingLifetime + addedXP;

      const oldState = HeroAttributeEngine.getAttributeStateFromLifetimeXP(existingLifetime);
      const newState = HeroAttributeEngine.getAttributeStateFromLifetimeXP(newLifetime);

      if (newState.level > oldState.level) {
        levelUpEvents.push({ stat: cat, newLevel: newState.level });
      }

      updatedRecord[cat] = newState;
    });

    buildingsObj.heroAttributes = updatedRecord;

    // Update Character & CharacterStats in DB
    await db.character.update({
      where: { id: character.id },
      data: { buildings: buildingsObj }
    });

    if (character.stats) {
      await db.characterStats.update({
        where: { characterId: character.id },
        data: {
          strength: updatedRecord.strength?.level || 10,
          intelligence: updatedRecord.intelligence?.level || 10,
          defense: updatedRecord.discipline?.level || 10,
          hp: Math.max(100, (updatedRecord.health?.level || 10) * 10)
        }
      });
    }

    // Log level-up chronicles
    for (const event of levelUpEvents) {
      const { ChroniclesService } = await import("./chronicles-service");
      await ChroniclesService.createEntry(
        userId,
        "HERO_ATTRIBUTE",
        `Attribute Level Up: ${event.stat.toUpperCase()}`,
        `${event.stat.toUpperCase()} reached Level ${event.newLevel}!`
      );
    }

    return updatedRecord as HeroAttributesRecord;
  }

  /**
   * Retrieve all Hero Attributes for a character
   */
  static async getHeroAttributes(userId: string): Promise<HeroAttributesRecord> {
    const character = await prisma.character.findUnique({
      where: { userId },
      select: { buildings: true }
    });

    let buildingsObj: any = character?.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }

    const currentAttrs = buildingsObj.heroAttributes || {};
    const ALL_CATEGORIES: StatCategory[] = [
      "strength", "intelligence", "discipline", "focus", "wisdom", 
      "health", "resilience", "creativity", "charisma", "productivity"
    ];

    const result: Partial<HeroAttributesRecord> = {};
    ALL_CATEGORIES.forEach(cat => {
      const lifetime = Math.max(0, currentAttrs[cat]?.lifetimeXP || 0);
      result[cat] = HeroAttributeEngine.getAttributeStateFromLifetimeXP(lifetime);
    });

    return result as HeroAttributesRecord;
  }
}
