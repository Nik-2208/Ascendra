import "server-only";
import { prisma } from "@/lib/prisma";
import { SKILL_NODES } from "@/lib/skill-engine";

export class SkillEffectService {
  static async getActiveEffects(userId: string) {
    const character = await prisma.character.findUnique({
      where: { userId },
      include: { skills: true }
    });
    if (!character) return this.getDefaultEffects();

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }

    const unlockedNodeIds = new Set(character.skills.map(s => s.skillNodeId));
    
    // Read active toggled skills list, default to all unlocked if list is missing
    const activeSkillIds = Array.isArray(buildingsObj.activeSkillIds)
      ? new Set<string>(buildingsObj.activeSkillIds)
      : unlockedNodeIds;

    const activeSkills = SKILL_NODES.filter(node => unlockedNodeIds.has(node.id) && activeSkillIds.has(node.id));

    const bonuses = this.getDefaultEffects();

    for (const skill of activeSkills) {
      const type = skill.id;
      if (type === "sk_power_strike") bonuses.bossDamage += 0.15;
      else if (type === "sk_critical_mastery") bonuses.critChance += 0.10;
      else if (type === "sk_executioner") bonuses.critDamage += 0.25;
      else if (type === "sk_guardian") bonuses.damageTakenReduction += 0.15;
      else if (type === "sk_vitality") bonuses.maxHpBonus += 0.20;
      else if (type === "sk_quick_recovery") bonuses.hpRecovery += 0.10;
      else if (type === "sk_scholar") bonuses.studyXp += 0.20;
      else if (type === "sk_iron_body") bonuses.workoutXp += 0.20;
      else if (type === "sk_focused_mind") bonuses.pomodoroXp += 0.20;
      else if (type === "sk_meditation_master") bonuses.meditationRewards += 0.25;
      else if (type === "sk_treasure_hunter") bonuses.coinRewards += 0.15;
      else if (type === "sk_merchants_blessing") bonuses.shopDiscount += 0.10;
      else if (type === "sk_lucky_explorer") bonuses.rareLootChance += 0.20;
      else if (type === "sk_efficient_learner") bonuses.allXp += 0.15;
      else if (type === "sk_master_adventurer") {
        bonuses.allRewards += 0.10;
        bonuses.allXp += 0.10;
      }
      else if (type === "sk_village_architect") bonuses.villageGrowth += 0.25;
      else if (type === "sk_world_explorer") bonuses.regionProgress += 0.20;
      else if (type === "sk_quest_master") bonuses.questRewards += 0.20;
      else if (type === "sk_boss_slayer") bonuses.bossRewards += 0.20;
      else if (type === "sk_legend") bonuses.globalBonus += 0.10;
    }

    return bonuses;
  }

  private static getDefaultEffects() {
    return {
      bossDamage: 0,
      critChance: 0.15, // base 15% player crit chance
      critDamage: 1.5,  // base 1.5x crit damage
      damageTakenReduction: 0,
      maxHpBonus: 0,
      hpRecovery: 0,
      studyXp: 0,
      workoutXp: 0,
      pomodoroXp: 0,
      meditationRewards: 0,
      coinRewards: 0,
      shopDiscount: 0,
      rareLootChance: 0,
      allXp: 0,
      allRewards: 0,
      villageGrowth: 0,
      regionProgress: 0,
      questRewards: 0,
      bossRewards: 0,
      globalBonus: 0
    };
  }
}
