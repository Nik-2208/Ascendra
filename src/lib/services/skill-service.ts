import "server-only";
import { prisma } from "@/lib/prisma";
import { SKILL_NODES, type SkillNode } from "@/lib/skill-engine";

export class SkillService {
  /**
   * Unlocks a skill node atomically in a single Prisma transaction
   */
  static async unlockSkillNode(userId: string, nodeId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate player exists
      const character = await tx.character.findUnique({
        where: { userId },
        include: { skills: true }
      });
      if (!character) throw new Error("Character not found");

      // 2. Parse skill node definition
      const nodeDef = SKILL_NODES.find(n => n.id === nodeId);
      if (!nodeDef) throw new Error("Skill node not found in registry");

      // 3. Load unlocked skills
      const unlockedIds = new Set(character.skills.map(s => s.skillNodeId));
      if (unlockedIds.has(nodeId)) {
        throw new Error("Skill is already unlocked");
      }

      // 4. Validate prerequisites
      const prereqsMet = nodeDef.prerequisites.every(pre => unlockedIds.has(pre));
      if (!prereqsMet) {
        throw new Error(`Prerequisite skills are not unlocked for: ${nodeDef.name}`);
      }

      // 5. Check character level requirement
      if (character.level < nodeDef.requiredLevel) {
        throw new Error(`Requires character level ${nodeDef.requiredLevel}`);
      }

      // 6. Load current skill points
      let buildingsObj: any = character.buildings || {};
      if (typeof buildingsObj === "string") {
        try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
      }

      if (!buildingsObj.skillsProgression) {
        buildingsObj.skillsProgression = {
          general: { xp: 0, level: 1, points: 0, spent: 0 },
          knowledge: { xp: 0, level: 1, points: 0, spent: 0 },
          discipline: { xp: 0, level: 1, points: 0, spent: 0 },
          strength: { xp: 0, level: 1, points: 0, spent: 0 },
          health: { xp: 0, level: 1, points: 0, spent: 0 },
          finance: { xp: 0, level: 1, points: 0, spent: 0 }
        };
      }
      if (!buildingsObj.skillsProgression.general) {
        buildingsObj.skillsProgression.general = { xp: 0, level: 1, points: 0, spent: 0 };
      }

      const category = nodeDef.tree.toLowerCase().trim();
      const catProg = buildingsObj.skillsProgression[category] || { xp: 0, level: 1, points: 0, spent: 0 };
      const genProg = buildingsObj.skillsProgression.general || { xp: 0, level: 1, points: 0, spent: 0 };

      // 7. Validate enough skill points
      const totalAvailable = catProg.points + genProg.points;
      if (totalAvailable < nodeDef.cost) {
        throw new Error(`Not enough Skill Points. Need ${nodeDef.cost}, you have ${totalAvailable}.`);
      }

      // 8. Deduct skill points
      let costRemaining = nodeDef.cost;
      if (catProg.points >= costRemaining) {
        catProg.points -= costRemaining;
        catProg.spent += costRemaining;
      } else {
        costRemaining -= catProg.points;
        catProg.spent += catProg.points;
        catProg.points = 0;
        genProg.points = Math.max(0, genProg.points - costRemaining);
        genProg.spent += costRemaining;
      }

      // 9. Automatically activate unlocked skill (apply effects)
      if (!buildingsObj.activeSkillIds) {
        buildingsObj.activeSkillIds = [];
      }
      if (!buildingsObj.activeSkillIds.includes(nodeId)) {
        buildingsObj.activeSkillIds.push(nodeId);
      }

      buildingsObj.skillsProgression[category] = catProg;
      buildingsObj.skillsProgression.general = genProg;

      // 10. Persist Skill Node Unlock
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

      // 11. Save updated progress to Character record
      const updatedChar = await tx.character.update({
        where: { id: character.id },
        data: {
          buildings: buildingsObj
        },
        include: { skills: true }
      });

      const nextUnlockedIds = updatedChar.skills.map(s => s.skillNodeId);

      // 10. Grant Tier-Scaled Skill Rewards (Scaled: T1=5, T2=10, T3=15, T4=20, T5+=25)
      const tierRewards = Math.min(25, nodeDef.tier * 5);
      const { awardPlayerXpAction } = await import("@/actions/character-actions");
      await awardPlayerXpAction(userId, tierRewards, tierRewards);

      // Create Chronicle Entry
      const { ChroniclesService } = await import("./chronicles-service");
      await ChroniclesService.createEntry(userId, "MASTERY", `Unlocked Skill: ${nodeDef.name}`, `Unlocked the ${nodeDef.name} skill node in the tree (${nodeDef.description}). Gained ${tierRewards} XP & Coins.`);

      return {
        success: true,
        character: updatedChar,
        unlockedSkills: nextUnlockedIds,
        skillPoints: catProg.points + genProg.points,
        rewardXp: tierRewards,
        rewardCoins: tierRewards
      };
    });
  }
}
