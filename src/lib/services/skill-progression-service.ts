import "server-only";
import { prisma } from "@/lib/prisma";
import { SKILL_NODES, type SkillNode } from "@/lib/skill-engine";

export class SkillProgressionService {
  /**
   * Authority on unlocking skill nodes in a single atomic transaction
   */
  static async unlockSkillNode(userId: string, nodeId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock character row using raw select or standard query
      const character = await tx.character.findUnique({
        where: { userId },
        include: { skills: true }
      });
      if (!character) throw new Error("Character not found");

      // 2. Validate skill exists
      const nodeDef = SKILL_NODES.find(n => n.id === nodeId);
      if (!nodeDef) throw new Error("Skill node not found in registry");

      // 3. Validate not already purchased
      const unlockedIds = new Set(character.skills.map(s => s.skillNodeId));
      if (unlockedIds.has(nodeId)) {
        throw new Error("Skill already unlocked");
      }

      // 4. Validate prerequisites dynamically from DB state
      const missingPrereqs = nodeDef.prerequisites.filter(pre => !unlockedIds.has(pre));
      if (missingPrereqs.length > 0) {
        throw new Error(`Prerequisites not met. Missing prerequisite IDs: ${missingPrereqs.join(", ")}`);
      }

      // 5. Check level requirements
      if (character.level < nodeDef.requiredLevel) {
        throw new Error(`Requires level ${nodeDef.requiredLevel}`);
      }

      // 6. Validate available skill points
      let buildingsObj: any = character.buildings || {};
      if (typeof buildingsObj === "string") {
        try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
      }

      if (!buildingsObj.skillsProgression) {
        buildingsObj.skillsProgression = {
          general: { xp: 0, level: 1, points: 0, spent: 0 }
        };
      }
      if (!buildingsObj.skillsProgression.general) {
        buildingsObj.skillsProgression.general = { xp: 0, level: 1, points: 0, spent: 0 };
      }

      const category = nodeDef.tree.toLowerCase().trim();
      const catProg = buildingsObj.skillsProgression[category] || { xp: 0, level: 1, points: 0, spent: 0 };
      const genProg = buildingsObj.skillsProgression.general;

      const totalAvailable = catProg.points + genProg.points;
      if (totalAvailable < nodeDef.cost) {
        throw new Error(`Not enough skill points to unlock ${nodeDef.name}`);
      }

      // 7. Deduct skill points
      let costRemaining = nodeDef.cost;
      if (catProg.points >= costRemaining) {
        catProg.points = Math.max(0, catProg.points - costRemaining);
        catProg.spent += costRemaining;
      } else {
        costRemaining -= catProg.points;
        catProg.spent += catProg.points;
        catProg.points = 0;
        genProg.points = Math.max(0, genProg.points - costRemaining);
        genProg.spent += costRemaining;
      }

      // 8. Rebuild active list
      if (!buildingsObj.activeSkillIds) {
        buildingsObj.activeSkillIds = [];
      }
      if (!buildingsObj.activeSkillIds.includes(nodeId)) {
        buildingsObj.activeSkillIds.push(nodeId);
      }

      buildingsObj.skillsProgression[category] = catProg;
      buildingsObj.skillsProgression.general = genProg;

      // 9. Save unlocked skill to DB (ensuring skill tree node is created)
      await tx.skillTreeNode.upsert({
        where: { id: nodeId },
        create: {
          id: nodeId,
          name: nodeDef.name,
          description: nodeDef.description,
          requiredLevel: nodeDef.requiredLevel,
          cost: nodeDef.cost
        },
        update: {
          name: nodeDef.name,
          description: nodeDef.description
        }
      });

      await tx.skill.create({
        data: {
          characterId: character.id,
          skillNodeId: nodeId
        }
      });

      // 10. Save progress back to character
      const updatedChar = await tx.character.update({
        where: { id: character.id },
        data: { buildings: buildingsObj },
        include: { skills: true }
      });

      // Trigger achievements & quest progress check
      const { RewardEngine } = await import("./reward-engine");
      await RewardEngine.checkAndUnlockAchievementsInternal(userId, tx);

      const { QuestEngine } = await import("./quest-engine");
      await QuestEngine.emit({ userId, type: "SKILL_UNLOCKED", value: 1 }, tx);

      // Chronicle Entry
      const { ChroniclesService } = await import("./chronicles-service");
      await ChroniclesService.createEntry(userId, "MASTERY", `Unlocked Skill: ${nodeDef.name}`, `Unlocked the ${nodeDef.name} skill node in the tree (${nodeDef.description}).`);

      return {
        success: true,
        character: updatedChar
      };
    });
  }

  /**
   * One-time or startup integrity check & repair pipeline
   */
  static async repairSkillProgression(userId: string, tx: any) {
    const character = await tx.character.findUnique({
      where: { userId },
      include: { skills: true }
    });
    if (!character) return;

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }

    let needsUpdate = false;

    // 1. De-duplicate skills in database
    const seenIds = new Set<string>();
    const dupesToDelete: string[] = [];
    character.skills.forEach((s: any) => {
      if (seenIds.has(s.skillNodeId)) {
        dupesToDelete.push(s.id);
      } else {
        seenIds.add(s.skillNodeId);
      }
    });

    if (dupesToDelete.length > 0) {
      await tx.skill.deleteMany({
        where: { id: { in: dupesToDelete } }
      });
      needsUpdate = true;
    }

    // 2. Ensure all unlocked skills are active by default
    if (!buildingsObj.activeSkillIds) {
      buildingsObj.activeSkillIds = character.skills.map((s: any) => s.skillNodeId);
      needsUpdate = true;
    } else {
      // Clean up orphaned or deleted skills from activeSkillIds
      const activeSet = new Set<string>(buildingsObj.activeSkillIds);
      const cleanActive = Array.from(activeSet).filter(id => SKILL_NODES.some(node => node.id === id));
      if (cleanActive.length !== buildingsObj.activeSkillIds.length) {
        buildingsObj.activeSkillIds = cleanActive;
        needsUpdate = true;
      }
    }

    // 3. Recalculate level-up skill points (Backfill: expectedTotalPoints = (currentLevel - 1) * 2)
    if (!buildingsObj.skillsProgression) {
      buildingsObj.skillsProgression = {
        general: { xp: 0, level: 1, points: 0, spent: 0 }
      };
      needsUpdate = true;
    }
    if (!buildingsObj.skillsProgression.general) {
      buildingsObj.skillsProgression.general = { xp: 0, level: 1, points: 0, spent: 0 };
      needsUpdate = true;
    }

    const currentLevel = character.level;
    const expectedTotalPoints = Math.floor(currentLevel / 2);
    const gen = buildingsObj.skillsProgression.general;
    const currentTotal = (gen.points || 0) + (gen.spent || 0);

    if (currentTotal !== expectedTotalPoints) {
      gen.points = Math.max(0, expectedTotalPoints - (gen.spent || 0));
      needsUpdate = true;
    }

    // 4. Prevent negative skill points
    if (buildingsObj.skillsProgression) {
      Object.keys(buildingsObj.skillsProgression).forEach(cat => {
        const prog = buildingsObj.skillsProgression[cat];
        if (prog) {
          if (prog.points < 0) {
            prog.points = 0;
            needsUpdate = true;
          }
          if (prog.spent < 0) {
            prog.spent = 0;
            needsUpdate = true;
          }
        }
      });
    }

    if (needsUpdate) {
      await tx.character.update({
        where: { id: character.id },
        data: { buildings: buildingsObj }
      });
    }
  }

  /**
   * Retrieve total skill points and unlocked/active node IDs for user
   */
  static async getSkillProgression(userId: string) {
    const character = await prisma.character.findUnique({
      where: { userId },
      include: { skills: true }
    });

    if (!character) throw new Error("Character not found");

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }

    const unlockedIds = Array.from(new Set(character.skills.map(s => s.skillNodeId)));
    const activeIds = buildingsObj.activeSkillIds || unlockedIds;

    const { calculateAvailableSkillPoints } = await import("@/lib/skill-engine");
    const totalAvailablePoints = calculateAvailableSkillPoints(character.level, new Set(unlockedIds));

    return {
      currentLevel: character.level,
      totalAvailablePoints,
      unlockedIds,
      activeIds
    };
  }

  /**
   * Toggle a skill between active (enabled) and disabled
   */
  static async toggleSkill(userId: string, nodeId: string) {
    return await prisma.$transaction(async (tx) => {
      const character = await tx.character.findUnique({
        where: { userId },
        include: { skills: true }
      });
      if (!character) throw new Error("Character not found");

      const unlockedIds = new Set(character.skills.map(s => s.skillNodeId));
      if (!unlockedIds.has(nodeId)) {
        throw new Error("Skill is not unlocked yet");
      }

      let buildingsObj: any = character.buildings || {};
      if (typeof buildingsObj === "string") {
        try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
      }

      let activeSet = new Set<string>(buildingsObj.activeSkillIds || Array.from(unlockedIds));
      if (activeSet.has(nodeId)) {
        activeSet.delete(nodeId);
      } else {
        activeSet.add(nodeId);
      }

      buildingsObj.activeSkillIds = Array.from(activeSet);

      await tx.character.update({
        where: { id: character.id },
        data: { buildings: buildingsObj }
      });

      return { success: true, activeSkillIds: buildingsObj.activeSkillIds };
    });
  }
}
