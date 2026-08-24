import "server-only";
import { prisma } from "@/lib/prisma";

export class MasteryService {
  /**
   * Award category-specific mastery XP, handle levels, and award skill points
   */
  static async awardMasteryXp(userId: string, category: string, amount: number) {
    if (amount <= 0) return null;
    
    // Map standard event categories to skill progression keys
    let cat = category.toLowerCase().trim();
    if (cat === "general" || cat === "all") cat = "discipline";

    try {
      const result = await prisma.$transaction(async (tx) => {
        const character = await tx.character.findUnique({
          where: { userId }
        });
        if (!character) throw new Error("Character not found");

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
            productivity: { xp: 0, level: 1, points: 0, spent: 0 },
            creativity: { xp: 0, level: 1, points: 0, spent: 0 },
            social: { xp: 0, level: 1, points: 0, spent: 0 },
            health: { xp: 0, level: 1, points: 0, spent: 0 },
            finance: { xp: 0, level: 1, points: 0, spent: 0 }
          };
        }

        if (!buildingsObj.skillsProgression.general) {
          buildingsObj.skillsProgression.general = { xp: 0, level: 1, points: 0, spent: 0 };
        }

        if (!buildingsObj.skillsProgression[cat]) {
          buildingsObj.skillsProgression[cat] = { xp: 0, level: 1, points: 0, spent: 0 };
        }

        const prog = buildingsObj.skillsProgression[cat];
        prog.xp += amount;

        // Level up check: level up requires level * 100 XP
        let leveledUp = false;
        let newLevel = prog.level;
        let pointsAwarded = 0;
        
        while (prog.xp >= newLevel * 100) {
          prog.xp -= newLevel * 100;
          newLevel += 1;
          prog.points += 1; // Milestone: award 1 skill point in this category
          pointsAwarded += 1;
          leveledUp = true;
        }
        prog.level = newLevel;
        buildingsObj.skillsProgression[cat] = prog;

        const updated = await tx.character.update({
          where: { id: character.id },
          data: { buildings: buildingsObj }
        });

        return {
          updated,
          leveledUp,
          newLevel,
          pointsAwarded
        };
      });

      if (result?.leveledUp) {
        try {
          const { ChroniclesService } = await import("./chronicles-service");
          await ChroniclesService.createEntry(
            userId,
            "MASTERY",
            "Mastery Gained",
            `Gained ${amount} Mastery XP in ${cat.toUpperCase()}. Current level: ${result.newLevel}.`
          );
        } catch (eventErr) {
          console.error("Failed to log mastery gained chronicle:", eventErr);
        }
      }

      return result;
    } catch (e) {
      console.error("[MasteryService] Failed to award mastery XP:", e);
      return null;
    }
  }
}
