import "server-only";
import { prisma } from "@/lib/prisma";
import { QuestType, QuestStatus } from "@prisma/client";

export interface ActivityTemplate {
  phrases: string[];
  description: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EPIC" | "LEGENDARY";
  baseTarget: number;
}

const TEMPLATES: ActivityTemplate[] = [
  // --- Hydration, Nutrition & Sleep ---
  {
    phrases: ["Drink {target} glass of water", "Drink {target} glasses of water today", "Hydrate with {target} glasses of water"],
    description: "Drink {target} glasses of clean water to maintain optimal hydration.",
    category: "HEALTH",
    difficulty: "EASY",
    baseTarget: 5
  },
  {
    phrases: ["Prepare {target} healthy meal", "Cook {target} clean and nutritious meal"],
    description: "Prepare and consume {target} nutritious meal without processed foods.",
    category: "HEALTH",
    difficulty: "MEDIUM",
    baseTarget: 1
  },
  {
    phrases: ["Complete your daily health routine", "Execute {target} full daily health checklist"],
    description: "Complete your standard personal daily health and hygiene checklist.",
    category: "HEALTH",
    difficulty: "HARD",
    baseTarget: 1
  },

  // --- Reading ---
  {
    phrases: ["Read {target} pages of a book", "Read {target} pages of educational material", "Read {target} pages of non-fiction"],
    description: "Spend time reading {target} pages to improve your focus and knowledge.",
    category: "KNOWLEDGE",
    difficulty: "EASY",
    baseTarget: 5
  },
  {
    phrases: ["Spend {target} minutes reading", "Read for {target} minutes", "Dedicate {target} minutes to focused reading"],
    description: "Spend {target} minutes reading a book of your choice.",
    category: "KNOWLEDGE",
    difficulty: "MEDIUM",
    baseTarget: 20
  },
  {
    phrases: ["Read {target} complete chapter of a book", "Finish reading {target} chapter"],
    description: "Read {target} complete chapter of your current book.",
    category: "KNOWLEDGE",
    difficulty: "HARD",
    baseTarget: 1
  },

  // --- Writing & Journaling ---
  {
    phrases: ["Write {target} journal entry", "Write {target} personal reflection entry", "Complete {target} journal reflection"],
    description: "Write {target} personal reflection entry about your day.",
    category: "DISCIPLINE",
    difficulty: "EASY",
    baseTarget: 1
  },
  {
    phrases: ["Write {target} paragraphs of reflections", "Draft {target} paragraphs of journaling notes"],
    description: "Write {target} paragraphs of thoughts, logs, or planning notes.",
    category: "DISCIPLINE",
    difficulty: "MEDIUM",
    baseTarget: 3
  },
  {
    phrases: ["Spend {target} minutes writing creatively", "Write creatively for {target} minutes"],
    description: "Spend {target} minutes writing stories, poetry, or ideas.",
    category: "DISCIPLINE",
    difficulty: "HARD",
    baseTarget: 20
  },

  // --- Deep Work & Focus ---
  {
    phrases: ["Complete {target} 25-minute Pomodoro", "Perform {target} Pomodoro focus slot", "Focus for {target} Pomodoro session"],
    description: "Work with absolute focus for {target} 25-minute Pomodoro block.",
    category: "DISCIPLINE",
    difficulty: "MEDIUM",
    baseTarget: 1
  },
  {
    phrases: ["Complete a {target}-minute deep work session", "Focus for {target} minutes of deep work"],
    description: "Dedicate {target} minutes of continuous focused deep work.",
    category: "DISCIPLINE",
    difficulty: "HARD",
    baseTarget: 60
  },
  {
    phrases: ["Complete a {target}-minute Pomodoro cycle", "Execute a {target}-minute multi-block Pomodoro cycle"],
    description: "Complete a multi-block focused Pomodoro cycle of {target} minutes.",
    category: "DISCIPLINE",
    difficulty: "HARD",
    baseTarget: 90
  },

  // --- Meditation & Mindfulness ---
  {
    phrases: ["Meditate for {target} minutes", "Spend {target} minutes in quiet meditation", "Perform a {target}-minute meditation session"],
    description: "Practice calm, silent meditation for {target} minutes.",
    category: "DISCIPLINE",
    difficulty: "EASY",
    baseTarget: 5
  },
  {
    phrases: ["Meditate for {target} minutes today", "Complete a {target}-minute meditation session"],
    description: "Sit quietly and practice mindful meditation for {target} minutes.",
    category: "DISCIPLINE",
    difficulty: "MEDIUM",
    baseTarget: 15
  },
  {
    phrases: ["Practice deep breathing for {target} minutes", "Perform a {target}-minute breathing exercise"],
    description: "Dedicate {target} minutes to slow, deep breathing cycles.",
    category: "DISCIPLINE",
    difficulty: "EASY",
    baseTarget: 5
  },

  // --- Exercise, Gym & Stretching ---
  {
    phrases: ["Do {target} push-ups", "Complete {target} push-ups", "Perform {target} push-ups"],
    description: "Complete {target} push-ups to build strength.",
    category: "STRENGTH",
    difficulty: "EASY",
    baseTarget: 10
  },
  {
    phrases: ["Do {target} squats", "Complete {target} bodyweight squats", "Perform {target} squats"],
    description: "Complete {target} bodyweight squats to strengthen your legs.",
    category: "STRENGTH",
    difficulty: "MEDIUM",
    baseTarget: 20
  },
  {
    phrases: ["Walk for {target} minutes", "Take a {target}-minute walk outside", "Go for a {target}-minute brisk walk"],
    description: "Go for a brisk walk outside for {target} minutes.",
    category: "HEALTH",
    difficulty: "EASY",
    baseTarget: 10
  },
  {
    phrases: ["Finish a {target}-minute workout", "Complete {target} full exercise session", "Complete a {target}-minute home workout"],
    description: "Complete a structured physical exercise session of {target} minutes.",
    category: "STRENGTH",
    difficulty: "MEDIUM",
    baseTarget: 20
  },
  {
    phrases: ["Perform physical stretches for {target} minutes", "Stretch for {target} minutes"],
    description: "Perform physical flexibility stretches for {target} minutes.",
    category: "STRENGTH",
    difficulty: "EASY",
    baseTarget: 5
  },
  {
    phrases: ["Run {target} km", "Complete a {target} km run outside", "Run a distance of {target} km"],
    description: "Complete a continuous running distance of {target} km.",
    category: "HEALTH",
    difficulty: "HARD",
    baseTarget: 5
  },

  // --- Productivity & Organization ---
  {
    phrases: ["Organize your desk", "Tidy your workspace", "Clean your desk space"],
    description: "Declutter and organize your physical desk workspace.",
    category: "DISCIPLINE",
    difficulty: "EASY",
    baseTarget: 1
  },
  {
    phrases: ["Clean your workspace", "Deep clean your room workspace"],
    description: "Tidy and clean your primary study or development workspace.",
    category: "DISCIPLINE",
    difficulty: "MEDIUM",
    baseTarget: 1
  },
  {
    phrases: ["Practice typing for {target} minutes", "Spend {target} minutes practicing touch typing"],
    description: "Spend {target} minutes practicing touch typing skills on a typing portal.",
    category: "DISCIPLINE",
    difficulty: "EASY",
    baseTarget: 10
  },

  // --- Study & Learning ---
  {
    phrases: ["Study for {target} minutes", "Spend {target} minutes studying your course material", "Dedicate {target} minutes to focused studying"],
    description: "Focus on learning your current syllabus or study material for {target} minutes.",
    category: "KNOWLEDGE",
    difficulty: "MEDIUM",
    baseTarget: 45
  },
  {
    phrases: ["Review your study notes", "Spend time revising your study logs"],
    description: "Re-read and organize your learning logs or revision notes.",
    category: "KNOWLEDGE",
    difficulty: "MEDIUM",
    baseTarget: 1
  },
  {
    phrases: ["Study for {target} hours", "Dedicate {target} hours to focused studying"],
    description: "Dedicate {target} hours of continuous focused learning.",
    category: "KNOWLEDGE",
    difficulty: "HARD",
    baseTarget: 2
  },

  // --- Coding & Development ---
  {
    phrases: ["Solve {target} easy coding problem", "Complete {target} easy programming challenge"],
    description: "Solve {target} easy coding challenge on LeetCode or a similar platform.",
    category: "KNOWLEDGE",
    difficulty: "EASY",
    baseTarget: 1
  },
  {
    phrases: ["Solve {target} LeetCode coding problem", "Complete {target} algorithmic programming challenge"],
    description: "Solve {target} algorithmic coding challenge on LeetCode.",
    category: "KNOWLEDGE",
    difficulty: "MEDIUM",
    baseTarget: 1
  },
  {
    phrases: ["Build {target} project feature", "Implement {target} code feature in your project"],
    description: "Implement and test {target} full feature in your current coding project.",
    category: "KNOWLEDGE",
    difficulty: "HARD",
    baseTarget: 1
  },

  // --- Finance ---
  {
    phrases: ["Track today's expenses", "Log today's financial transactions", "Update your expense log today"],
    description: "Record and categorize all of your financial transactions today.",
    category: "FINANCE",
    difficulty: "EASY",
    baseTarget: 1
  },
  {
    phrases: ["Save ₹{target}", "Put ₹{target} into savings", "Deposit ₹{target} into your Money Jar savings"],
    description: "Set aside ₹{target} for your future savings goal.",
    category: "FINANCE",
    difficulty: "MEDIUM",
    baseTarget: 100
  },

  // --- Creativity ---
  {
    phrases: ["Draw for {target} minutes", "Practice sketching for {target} minutes", "Doodle creatively for {target} minutes"],
    description: "Spend {target} minutes sketching or drawing creatively.",
    category: "DISCIPLINE",
    difficulty: "EASY",
    baseTarget: 15
  },
  {
    phrases: ["Practice an instrument for {target} minutes", "Spend {target} minutes practicing music"],
    description: "Spend {target} minutes practicing a musical instrument of your choice.",
    category: "DISCIPLINE",
    difficulty: "MEDIUM",
    baseTarget: 20
  },
  {
    phrases: ["Practice a skill for {target} minutes", "Spend {target} minutes practicing a creative skill"],
    description: "Spend {target} minutes practicing a creative or professional skill.",
    category: "DISCIPLINE",
    difficulty: "HARD",
    baseTarget: 90
  }
];

export class QuestGenerator {
  static generateProceduralTask(difficulty: "EASY" | "MEDIUM" | "HARD" | "EPIC" | "LEGENDARY") {
    const pool = TEMPLATES.filter(t => t.difficulty === difficulty);
    const template = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : TEMPLATES[0];

    const rawPhrase = template.phrases[Math.floor(Math.random() * template.phrases.length)];

    let target = template.baseTarget;
    if (difficulty === "EASY") target = Math.max(1, Math.round(template.baseTarget * (Math.random() * 0.5 + 0.8)));
    else if (difficulty === "MEDIUM") target = Math.round(template.baseTarget * (Math.random() * 0.6 + 0.9));
    else if (difficulty === "HARD") target = Math.round(template.baseTarget * (Math.random() * 0.8 + 1.1));
    else if (difficulty === "EPIC") target = Math.round(template.baseTarget * (Math.random() * 1.0 + 1.5));
    else if (difficulty === "LEGENDARY") target = Math.round(template.baseTarget * (Math.random() * 1.5 + 2.0));

    const title = rawPhrase.replace("{target}", target.toString());
    const description = template.description.replace("{target}", target.toString());

    return { title, description, category: template.category };
  }

  static async replenishQuests(userId: string, tx: any = prisma) {
    // Audit and clamp database to enforce XP bounds: [5, 100] XP and [5, 200] Coins
    await tx.quest.updateMany({
      where: { xpReward: { gt: 100 } },
      data: { xpReward: 100 }
    });
    await tx.quest.updateMany({
      where: { xpReward: { lt: 5 } },
      data: { xpReward: 5 }
    });
    await tx.quest.updateMany({
      where: { coinReward: { gt: 200 } },
      data: { coinReward: 200 }
    });
    await tx.quest.updateMany({
      where: { coinReward: { lt: 5 } },
      data: { coinReward: 5 }
    });

    const character = await tx.character.findUnique({
      where: { userId }
    });
    if (!character) return;

    let buildingsObj: any = character.buildings || {};
    if (typeof buildingsObj === "string") {
      try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
    }
    const currentBossId = buildingsObj.activeToggledBossId || "boss_dummy";

    const activeProgresses = await tx.questProgress.findMany({
      where: { userId, status: "ACTIVE" },
      include: { quest: { include: { progress: true } } }
    });

    const activeTasks = await tx.task.findMany({
      where: { userId, completed: false }
    });

    const activeByType = (type: QuestType) => activeProgresses.filter((p: any) => p.quest.type === type);

    // 1. Replenish DAILY (target: 5)
    const activeDailies = activeByType(QuestType.DAILY);
    const dailyNeeded = 5 - activeDailies.length;
    if (dailyNeeded > 0) {
      await this.generateRandomQuests(userId, character.level, QuestType.DAILY, dailyNeeded, null, null, tx);
    }

    // 2. Replenish Side Quests (REPEATABLE, target: 10)
    const activeSides = activeByType(QuestType.REPEATABLE);
    const sideNeeded = 10 - activeSides.length;
    if (sideNeeded > 0) {
      await this.generateRandomQuests(userId, character.level, QuestType.REPEATABLE, sideNeeded, null, null, tx);
    }

    // 3. Replenish Weekly (WEEKLY, target: 5)
    const activeWeeklies = activeByType(QuestType.WEEKLY);
    const weeklyNeeded = 5 - activeWeeklies.length;
    if (weeklyNeeded > 0) {
      await this.generateRandomQuests(userId, character.level, QuestType.WEEKLY, weeklyNeeded, null, null, tx);
    }

    // 4. Replenish Boss Tasks (HABIT, target: Exactly 3: 1 Easy, 1 Medium, 1 Hard)
    const activeBossTasks = activeTasks.filter((t: any) => t.notes && t.notes.startsWith(`BOSS_TASK:${currentBossId}:`));
    
    const hasEasy = activeBossTasks.some((t: any) => t.notes?.endsWith(":EASY"));
    const hasMedium = activeBossTasks.some((t: any) => t.notes?.endsWith(":MEDIUM"));
    const hasHard = activeBossTasks.some((t: any) => t.notes?.endsWith(":HARD"));

    if (!hasEasy) {
      await this.generateRandomQuests(userId, character.level, QuestType.HABIT, 1, currentBossId, "EASY", tx);
    }
    if (!hasMedium) {
      await this.generateRandomQuests(userId, character.level, QuestType.HABIT, 1, currentBossId, "MEDIUM", tx);
    }
    if (!hasHard) {
      await this.generateRandomQuests(userId, character.level, QuestType.HABIT, 1, currentBossId, "HARD", tx);
    }

    // 5. Replenish Village Tasks (STORY, target: 3)
    const activeVillages = activeByType(QuestType.STORY);
    const villageNeeded = 3 - activeVillages.length;
    if (villageNeeded > 0) {
      await this.generateRandomQuests(userId, character.level, QuestType.STORY, villageNeeded, null, null, tx);
    }
  }

  static async generateRandomQuests(
    userId: string,
    playerLevel: number,
    type: QuestType,
    count: number,
    bossId: string | null,
    bossDifficulty: "EASY" | "MEDIUM" | "HARD" | null,
    tx: any = prisma
  ) {
    for (let i = 0; i < count; i++) {
      let difficulty: "EASY" | "MEDIUM" | "HARD" | "EPIC" | "LEGENDARY" = "EASY";
      
      if (bossDifficulty) {
        difficulty = bossDifficulty;
      } else {
        const roll = Math.random();
        if (roll < 0.3) difficulty = "EASY";
        else if (roll < 0.6) difficulty = "MEDIUM";
        else if (roll < 0.8) difficulty = "HARD";
        else if (roll < 0.95) difficulty = "EPIC";
        else difficulty = "LEGENDARY";
      }

      const procedural = this.generateProceduralTask(difficulty);

      let xpMin = 5, xpMax = 10;
      let coinMin = 5, coinMax = 15;

      const { RewardPolicy } = await import("./reward-policy");
      const mappedDifficulty = difficulty === "HARD" || difficulty === "EPIC" || difficulty === "LEGENDARY" ? "HARD" : difficulty === "EASY" ? "EASY" : "MEDIUM";
      const policyRewards = RewardPolicy.getRewardsForDifficulty(mappedDifficulty, {
        category: procedural.category,
        title: procedural.title
      });
      const xpReward = policyRewards.xp;
      const coinReward = policyRewards.coins;

      const notes = bossId ? `BOSS_TASK:${bossId}:${difficulty}` : `PROCEDURAL_QUEST:${procedural.category}`;

      // Create the task in DB
      const task = await tx.task.create({
        data: {
          userId,
          title: procedural.title,
          description: procedural.description,
          priority: difficulty === "LEGENDARY" || difficulty === "EPIC" ? "High" : "Medium",
          category: procedural.category,
          notes,
          completed: false
        }
      });

      // Create Quest
      const quest = await tx.quest.create({
        data: {
          title: procedural.title,
          description: procedural.description,
          type,
          xpReward,
          coinReward,
          isGlobal: false,
          creatorId: userId,
          taskId: task.id
        }
      });

      // Create Quest Progress
      await tx.questProgress.create({
        data: {
          userId,
          questId: quest.id,
          status: QuestStatus.ACTIVE,
          progress: 0,
          target: 1
        }
      });
    }
  }
}
