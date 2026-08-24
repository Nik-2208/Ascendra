import "server-only";
import { prisma } from "@/lib/prisma";
import { gameMath } from "@/lib/game-math";

export interface BossCombatResult {
  success: boolean;
  damageDealt: number;
  bossHp: number;
  isDefeated: boolean;
  isCrit: boolean;
  isDodge: boolean;
  rageValue: number;
  phase: number;
  rewards?: {
    xp: number;
    coins: number;
    points: number;
  };
}

export const BOSS_IDS_ORDER = [
  "boss_dummy",
  "boss_plague",
  "boss_hydra",
  "boss_colossus",
  "boss_phantom",
  "boss_titan",
  "boss_muse",
  "boss_wyrm",
  "boss_diplomat",
  "boss_mastery"
];

export function getRandomTask(difficulty: "EASY" | "MEDIUM" | "HARD"): string {
  const easyPool = [
    "Drink a glass of fresh water",
    "Stretch your hamstrings and back for 2 minutes",
    "Sit upright and breathe deeply for 1 minute",
    "Write down 3 gratitude points in your journal",
    "Do a 1-minute quick desk clean",
    "Stand up and do 10 gentle air squats",
    "Check your daily priority list",
    "Eat a serving of fresh fruit or nuts",
    "Rest your eyes and look at a distant object for 20 seconds",
    "Plan your next deep work focus block",
    "Recite 3 positive self-affirmations",
    "Do a 2-minute dynamic arm and shoulder stretch",
    "Jot down one goal for today in your planner",
    "Check your calendar and plan your sleep wind-down time",
    "Do 10 mindful belly breaths"
  ];
  
  const mediumPool = [
    "Read a non-fiction book or article for 15 minutes",
    "Complete a 15-minute quick full-body yoga session",
    "Do 25 pushups and a 1-minute pfank",
    "Sit in quiet meditation for 10 minutes",
    "Write a detailed journal entry about your weekly goals",
    "Spend 15 minutes reviewing educational cards/revision notes",
    "De-clutter your study desk and organize files for 15 minutes",
    "Listen to a 15-minute language learning podcast",
    "Practice drawing/sketching a still-life object for 15 minutes",
    "Practice scales or a song on an instrument for 15 minutes",
    "Review your monthly budget and expenses for 15 minutes",
    "Draft a quick reflection of your recent habit changes",
    "Read 3 pages of a textbook or technical documentation",
    "Solve 3 logic or mathematical brain teasers",
    "Go for a brisk 15-minute walk outside"
  ];

  const hardPool = [
    "Complete a 45-minute structured physical workout",
    "Write code or build a new feature for a project for 1 hour",
    "Study technical documentation or a course topic for 1 hour",
    "Practice deep work focus on a single task for 50 minutes",
    "Clean, vacuum, and fully organize your entire room",
    "Read educational material or technical chapters for 45 minutes",
    "Complete a 5km outdoor run or intensive cardio workout",
    "Research a complex topic and write a summary paragraph (1 hour)",
    "Write a blog post, essay, or creative draft for 45 minutes",
    "Spend 45 minutes building a prototype or side project",
    "Solve 5 programming algorithm challenges",
    "Complete a comprehensive weekly review and planning session (1 hour)",
    "Spend 1 hour practicing advanced techniques of your craft",
    "Work on design wireframes and user flow mocks for 1 hour",
    "Read and annotate a research paper for 45 minutes"
  ];

  const pool = difficulty === "EASY" ? easyPool : difficulty === "MEDIUM" ? mediumPool : hardPool;
  return pool[Math.floor(Math.random() * pool.length)];
}

export class BossService {
  static getScaledBossStats(boss: any, heroLevel: number) {
    const REGION_BOSS_HPS: Record<string, number[]> = {
      // Region Order: Mini, Elite, Guardian, Final
      boss_dummy: [150, 220, 320, 450],      // Region 1
      boss_plague: [300, 450, 650, 900],     // Region 2
      boss_hydra: [500, 750, 1100, 1500],     // Region 3
      boss_colossus: [800, 1200, 1700, 2400], // Region 4
      boss_phantom: [1300, 1900, 2700, 3800], // Region 5
      boss_titan: [2000, 3000, 4300, 6000],   // Region 6
      boss_muse: [3500, 5000, 7000, 9500],    // Region 7
      boss_wyrm: [5000, 7000, 10000, 15000],  // Region 8
      boss_diplomat: [6000, 8000, 11000, 16000],
      boss_mastery: [8000, 10000, 14000, 20000]
    };

    const bossId = boss.id;
    const hps = REGION_BOSS_HPS[bossId] || [150, 220, 320, 450];
    
    // Assign tier index based on ID to scale HP naturally:
    // Dummy, Plague, Hydra: Mini (index 0)
    // Colossus, Phantom, Titan: Elite (index 1)
    // Muse, Wyrm, Diplomat: Guardian (index 2)
    // Mastery: Final (index 3)
    let tierIdx = 0;
    if (["boss_colossus", "boss_phantom", "boss_titan"].includes(bossId)) {
      tierIdx = 1;
    } else if (["boss_muse", "boss_wyrm", "boss_diplomat"].includes(bossId)) {
      tierIdx = 2;
    } else if (bossId === "boss_mastery") {
      tierIdx = 3;
    }

    const baseHp = hps[tierIdx];

    const levelDiff = Math.max(0, heroLevel - boss.levelReq);
    const levelScaling = 1.0 + levelDiff * 0.03; // Scales with player level: +3% HP per level above recommended

    const maxHp = Math.round(baseHp * levelScaling);
    const damage = Math.round(boss.damage * levelScaling);
    const defense = Math.round(boss.defense * levelScaling);

    // Dynamic rewards scaling based on baseHp (Clamped strictly to Policy max 100 XP)
    const xpReward = Math.min(100, Math.round(maxHp * 0.5));
    const coinReward = Math.min(100, Math.round(maxHp * 0.25));

    return { maxHp, damage, defense, xpReward, coinReward };
  }

  static async getActiveBoss(userId: string, overrideBossId?: string | null) {
    let character = await prisma.character.findUnique({
      where: { userId },
      include: { stats: true }
    });

    if (!character) {
      character = await prisma.character.create({
        data: {
          userId,
          name: "Hero",
          class: "Novice",
          level: 1,
          xp: 0,
          stats: {
            create: {
              hp: 100, maxHp: 100, strength: 10, defense: 10,
              intelligence: 10, agility: 10, luck: 10
            }
          }
        },
        include: { stats: true }
      });
    }

    const bosses = await prisma.boss.findMany();
    const unlockedBosses = bosses.filter(b => character!.level >= b.levelReq);

    let bossProgress = await prisma.bossProgress.findUnique({ where: { userId } });
    if (!bossProgress) {
      bossProgress = await prisma.bossProgress.create({
        data: { userId }
      });
    }

    let selectedBoss = null;
    if (overrideBossId) {
      const rawId = overrideBossId.startsWith("boss_") ? overrideBossId : `boss_${overrideBossId}`;
      selectedBoss = bosses.find(b => b.id === rawId) || null;
      if (selectedBoss) {
        bossProgress = await prisma.bossProgress.update({
          where: { userId },
          data: { dedicatedBossId: selectedBoss.id }
        });
      }
    }

    if (!selectedBoss && bossProgress!.dedicatedBossId) {
      selectedBoss = bosses.find(b => b.id === bossProgress!.dedicatedBossId) || null;
    }

    if (!selectedBoss) {
      if (unlockedBosses.length > 0) {
        unlockedBosses.sort((a, b) => b.levelReq - a.levelReq);
        selectedBoss = unlockedBosses[0];
      } else {
        selectedBoss = bosses[0] || { id: "boss_dummy", name: "Training Dummy", maxHp: 150, damage: 10, defense: 5 };
      }
    }

    if (bossProgress!.currentBossId !== selectedBoss.id || bossProgress!.bossHP <= 0 || !bossProgress!.activeEasyTask?.startsWith("[")) {
      const scaled = BossService.getScaledBossStats(selectedBoss, character.level);
      bossProgress = await prisma.bossProgress.update({
        where: { userId },
        data: {
          currentBossId: selectedBoss.id,
          bossHP: scaled.maxHp,
          maxHP: scaled.maxHp,
          activeEasyTask: JSON.stringify([getRandomTask("EASY"), getRandomTask("EASY"), getRandomTask("EASY")]),
          activeMediumTask: JSON.stringify([getRandomTask("MEDIUM"), getRandomTask("MEDIUM"), getRandomTask("MEDIUM")]),
          activeHardTask: JSON.stringify([getRandomTask("HARD"), getRandomTask("HARD"), getRandomTask("HARD")]),
          completedTaskIds: []
        }
      });
    }

    const scaled = BossService.getScaledBossStats(selectedBoss, character.level);
    const scaledBoss = {
      ...selectedBoss,
      hp: bossProgress.bossHP,
      maxHp: bossProgress.maxHP,
      defense: scaled.defense,
      damage: scaled.damage
    };

    return { boss: scaledBoss, bossProgress };
  }

  static async getBosses(userId: string) {
    const character = await prisma.character.findUnique({ where: { userId } });
    if (!character) throw new Error("Character not found");

    const bossProgress = await prisma.bossProgress.findUnique({ where: { userId } });
    const bosses = await prisma.boss.findMany();
    bosses.sort((a, b) => a.levelReq - b.levelReq);

    return bosses.map((b) => {
      const isLocked = character.level < b.levelReq;
      const scaled = BossService.getScaledBossStats(b, character.level);
      
      let status = "locked";
      if (bossProgress?.dedicatedBossId === b.id) {
        status = "active";
      } else if (!isLocked) {
        if (bossProgress?.currentBossId === b.id && bossProgress.bossHP <= 0) {
          status = "defeated";
        } else {
          status = "active";
        }
      }

      return {
        id: b.id,
        name: b.name,
        description: b.description,
        maxHP: scaled.maxHp,
        currentHP: bossProgress?.currentBossId === b.id ? bossProgress.bossHP : scaled.maxHp,
        status,
        levelReq: b.levelReq,
        isToggledChallenge: bossProgress?.dedicatedBossId === b.id,
        rewards: {
          xp: scaled.xpReward,
          coins: scaled.coinReward
        }
      };
    });
  }

  static async toggleBossChallenge(userId: string, bossId: string, enabled: boolean) {
    return await prisma.$transaction(async (tx) => {
      let progress = await tx.bossProgress.findUnique({ where: { userId } });
      if (!progress) {
        progress = await tx.bossProgress.create({ data: { userId } });
      }
      
      if (enabled) {
        await tx.bossProgress.update({
          where: { userId },
          data: { dedicatedBossId: bossId }
        });
      } else if (progress.dedicatedBossId === bossId) {
        await tx.bossProgress.update({
          where: { userId },
          data: { dedicatedBossId: null }
        });
      }
    });
  }

  static async applyFailurePenalty(userId: string, tx: any) {
    const character = await tx.character.findUnique({ where: { userId } });
    if (!character) return;

    const newXP = Math.max(0, character.xp - 100);
    const newLevel = gameMath.levelFromXP(newXP);

    await tx.character.update({
      where: { id: character.id },
      data: { xp: newXP, level: newLevel }
    });

    const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
    if (moneyJar) {
      const newCoins = Math.max(0, moneyJar.coins - 100);
      await tx.moneyJar.update({
        where: { id: moneyJar.id },
        data: { coins: newCoins }
      });
    }

    await tx.bossProgress.updateMany({
      where: { userId },
      data: { dedicatedBossId: null }
    });
  }

  static async fleeBattle(userId: string) {
    return await prisma.$transaction(async (tx) => {
      const progress = await tx.bossProgress.findUnique({ where: { userId } });
      if (!progress || !progress.currentBossId) {
        throw new Error("No active boss battle to flee from.");
      }

      const boss = await tx.boss.findUnique({ where: { id: progress.currentBossId } });
      if (!boss) throw new Error("Active boss not found.");

      const character = await tx.character.findUnique({ where: { userId } });
      if (!character) throw new Error("Character not found.");

      const level = character.level || 1;
      const xpLoss = Math.min(200 + (level - 1) * 20, 1200);
      const coinLoss = Math.min(300 + (level - 1) * 25, 1500);

      const oldXP = character.xp;
      const newXP = Math.max(0, oldXP - xpLoss);
      const newLevel = gameMath.levelFromXP(newXP);

      let buildingsObj: any = character.buildings || {};
      if (typeof buildingsObj === "string") {
        try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
      }
      
      buildingsObj.statistics = buildingsObj.statistics || {};
      buildingsObj.statistics.timesFled = (buildingsObj.statistics.timesFled || 0) + 1;
      buildingsObj.statistics.totalXpLostFromFleeing = (buildingsObj.statistics.totalXpLostFromFleeing || 0) + xpLoss;
      buildingsObj.statistics.totalCoinsLostFromFleeing = (buildingsObj.statistics.totalCoinsLostFromFleeing || 0) + coinLoss;

      await tx.character.update({
        where: { id: character.id },
        data: {
          xp: newXP,
          level: newLevel,
          buildings: buildingsObj
        }
      });

      const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
      let currentCoins = moneyJar ? moneyJar.coins : 0;
      const newCoins = Math.max(0, currentCoins - coinLoss);
      
      await tx.moneyJar.upsert({
        where: { userId },
        create: { userId, coins: newCoins },
        update: { coins: newCoins }
      });

      await tx.transaction.create({
        data: {
          userId,
          amount: -coinLoss,
          type: "SPEND",
          source: `BATTLE_FLEE:${boss.id}`
        }
      });

      const { ChroniclesService } = await import("./chronicles-service");
      await ChroniclesService.createEntry(
        userId,
        "BATTLE",
        `Fled from ${boss.name}`,
        `Fled from ${boss.name} in Region ${progress.currentRegionId || "Unknown"}. Lost ${xpLoss} XP and ${coinLoss} Coins. Remaining boss HP: ${progress.bossHP}/${progress.maxHP}.`
      );

      const { NotificationService } = await import("./notification-service");
      await NotificationService.send(
        userId,
        "🏃 Fled Battle",
        `You fled from ${boss.name}. Lost ${xpLoss} XP and ${coinLoss} Coins.`,
        "SYSTEM",
        tx
      );

      const { ProgressionService } = await import("./progression-service");
      await ProgressionService.validateAndRepairProgressionInternal(userId, tx);

      return {
        success: true,
        xpLoss,
        coinLoss,
        bossName: boss.name,
        newXP,
        newLevel,
        newCoins
      };
    });
  }

  static async completeBossTask(userId: string, difficulty: "EASY" | "MEDIUM" | "HARD", taskText: string) {
    const result = await prisma.$transaction(async (tx) => {
      const progress = await tx.bossProgress.findUnique({ where: { userId } });
      if (!progress || !progress.currentBossId) throw new Error("No active boss fight.");

      let activeField = difficulty === "EASY" ? progress.activeEasyTask : difficulty === "MEDIUM" ? progress.activeMediumTask : progress.activeHardTask;
      
      let tasks: string[] = [];
      try {
        tasks = JSON.parse(activeField || "[]");
      } catch (e) {
        tasks = activeField ? [activeField] : [];
      }

      if (tasks.length === 0) {
        tasks = [getRandomTask(difficulty), getRandomTask(difficulty), getRandomTask(difficulty)];
      }

      const taskIndex = tasks.indexOf(taskText);
      if (taskIndex === -1) {
        throw new Error(`Task '${taskText}' is not currently active.`);
      }

      const character = await tx.character.findUnique({ where: { userId } });
      if (!character) throw new Error("Character not found");

      const boss = await tx.boss.findUnique({ where: { id: progress.currentBossId } });
      if (!boss) throw new Error("Boss not found");

      let damageDealt = 20;
      let minCoins = 5, maxCoins = 40, minXp = 5, maxXp = 20;
      if (difficulty === "MEDIUM") {
        damageDealt = 35;
        minCoins = 50; maxCoins = 100; minXp = 25; maxXp = 50;
      } else if (difficulty === "HARD") {
        damageDealt = 50;
        minCoins = 100; maxCoins = 200; minXp = 50; maxXp = 100;
      }

      const coinsAwarded = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;
      const xpAwarded = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;

      const nextHp = Math.max(0, progress.bossHP - damageDealt);
      const isDefeated = nextHp <= 0;

      const freshTask = getRandomTask(difficulty);
      tasks[taskIndex] = freshTask;

      const updateData: any = {
        bossHP: nextHp,
        version: { increment: 1 },
        completedTaskIds: { push: taskText }
      };

      const serializedTasks = JSON.stringify(tasks);
      if (difficulty === "EASY") updateData.activeEasyTask = serializedTasks;
      if (difficulty === "MEDIUM") updateData.activeMediumTask = serializedTasks;
      if (difficulty === "HARD") updateData.activeHardTask = serializedTasks;

      await tx.bossProgress.update({
        where: { userId },
        data: updateData
      });

      const { ChroniclesService } = await import("./chronicles-service");
      await ChroniclesService.createEntry(
        userId,
        "BATTLE",
        `Damaged ${boss.name}`,
        `Completed task: '${taskText}'. Dealt ${damageDealt} damage to ${boss.name}. Earned +${xpAwarded} XP, +${coinsAwarded} Coins.`
      );

      const { ProgressionService } = await import("./progression-service");
      await ProgressionService.awardXP(userId, xpAwarded, tx);

      await tx.moneyJar.upsert({
        where: { userId },
        create: { userId, coins: coinsAwarded },
        update: { coins: { increment: coinsAwarded } }
      });

      if (isDefeated) {
        const bossesList = await tx.boss.findMany();
        bossesList.sort((a, b) => a.levelReq - b.levelReq);
        const currentIdx = bossesList.findIndex(b => b.id === boss.id);
        const nextBoss = currentIdx !== -1 && currentIdx + 1 < bossesList.length ? bossesList[currentIdx + 1] : null;

        await ChroniclesService.createEntry(
          userId,
          "BATTLE",
          `Defeated ${boss.name}`,
          `Successfully defeated the boss ${boss.name}!`
        );

        if (nextBoss) {
          const nextScaled = BossService.getScaledBossStats(nextBoss, character.level);
          await tx.bossProgress.update({
            where: { userId },
            data: {
              dedicatedBossId: nextBoss.id,
              currentBossId: nextBoss.id,
              bossHP: nextScaled.maxHp,
              maxHP: nextScaled.maxHp,
              activeEasyTask: JSON.stringify([getRandomTask("EASY"), getRandomTask("EASY"), getRandomTask("EASY")]),
              activeMediumTask: JSON.stringify([getRandomTask("MEDIUM"), getRandomTask("MEDIUM"), getRandomTask("MEDIUM")]),
              activeHardTask: JSON.stringify([getRandomTask("HARD"), getRandomTask("HARD"), getRandomTask("HARD")]),
              completedTaskIds: []
            }
          });
        }
      }

      return {
        success: true,
        damageDealt,
        isDefeated,
        bossHp: nextHp,
        newTask: freshTask,
        coinsAwarded,
        xpAwarded
      };
    });

    return result;
  }

  static async regenerateBossTasks(userId: string, bossId: string) {
    return await prisma.$transaction(async (tx) => {
      const progress = await tx.bossProgress.findUnique({ where: { userId } });
      if (!progress) throw new Error("Boss progress not found.");
      
      await tx.bossProgress.update({
        where: { userId },
        data: {
          activeEasyTask: JSON.stringify([getRandomTask("EASY"), getRandomTask("EASY"), getRandomTask("EASY")]),
          activeMediumTask: JSON.stringify([getRandomTask("MEDIUM"), getRandomTask("MEDIUM"), getRandomTask("MEDIUM")]),
          activeHardTask: JSON.stringify([getRandomTask("HARD"), getRandomTask("HARD"), getRandomTask("HARD")]),
          version: { increment: 1 }
        }
      });
      return { success: true };
    });
  }

  static async attackBoss(userId: string, bossId: string, baseDamage: number): Promise<BossCombatResult> {
    if (baseDamage <= 0) throw new Error("Invalid attack strength");

    const result = await prisma.$transaction(async (tx) => {
      const character = await tx.character.findUnique({
        where: { userId },
        include: { stats: true }
      });
      if (!character || !character.stats) throw new Error("Character not found");

      const boss = await tx.boss.findUnique({ where: { id: bossId } });
      if (!boss) throw new Error("Boss not found");

      let progress = await tx.bossProgress.findUnique({ where: { userId } });
      if (!progress || progress.currentBossId !== bossId) {
        throw new Error("Target is not your current active boss.");
      }

      const scaled = BossService.getScaledBossStats(boss, character.level);

      const isDodge = Math.random() < 0.08;
      const isCrit = Math.random() < 0.15;
      
      let finalDamage = gameMath.calculateDamage(baseDamage, scaled.defense);
      if (isDodge) finalDamage = 0;
      else if (isCrit) finalDamage = Math.round(finalDamage * 1.5);

      const nextHp = Math.max(0, progress.bossHP - finalDamage);
      const isDefeated = nextHp <= 0;

      let phase = 1;
      const hpPercentage = nextHp / scaled.maxHp;
      if (hpPercentage < 0.3) phase = 3;
      else if (hpPercentage < 0.6) phase = 2;
      const rageValue = Math.min(100, Math.round((1 - hpPercentage) * 100));

      await tx.bossProgress.update({
        where: { userId },
        data: {
          bossHP: nextHp,
          version: { increment: 1 }
        }
      });

      let rewardsObj;
      if (isDefeated) {
        if (progress.dedicatedBossId === bossId) {
          await tx.bossProgress.update({
            where: { userId },
            data: { dedicatedBossId: null }
          });
        }

        const { ProgressionService } = await import("./progression-service");
        await ProgressionService.awardXP(userId, scaled.xpReward, tx);

        const updatedChar = await tx.character.findUnique({ where: { userId } });
        let charBuildings: any = updatedChar?.buildings || {};
        if (typeof charBuildings === "string") {
          try { charBuildings = JSON.parse(charBuildings); } catch (e) { charBuildings = {}; }
        }
        if (!charBuildings.skillsProgression) charBuildings.skillsProgression = { general: { xp: 0, level: 1, points: 0, spent: 0 } };
        if (!charBuildings.skillsProgression.general) charBuildings.skillsProgression.general = { xp: 0, level: 1, points: 0, spent: 0 };
        charBuildings.skillsProgression.general.points += 10;

        await tx.character.update({
          where: { userId },
          data: { buildings: charBuildings }
        });

        await tx.moneyJar.upsert({
          where: { userId },
          create: { userId, coins: scaled.coinReward },
          update: { coins: { increment: scaled.coinReward } }
        });

        await tx.transaction.create({
          data: {
            userId,
            amount: scaled.coinReward,
            type: "EARN",
            source: `BOSS_REWARD:${bossId}`
          }
        });

        rewardsObj = {
          xp: scaled.xpReward,
          coins: scaled.coinReward,
          points: 10
        };
      }

      return {
        success: true,
        damageDealt: finalDamage,
        bossHp: nextHp,
        isDefeated,
        isCrit,
        isDodge,
        rageValue,
        phase,
        rewards: rewardsObj
      };
    });

    return result;
  }
}
