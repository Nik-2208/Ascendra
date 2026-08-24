export interface CampaignDefinition {
  id: string;
  name: string;
  description: string;
  category: "Study" | "Fitness" | "Mindfulness" | "Finance" | "Skills" | "Boss Battles" | "Streaks" | "Quest Board";
  difficulty: "Easy" | "Medium" | "Hard" | "Legendary";
  requiredLevel: number;
  icon: string;
  targetMetric: "quests_completed" | "bosses_defeated" | "focus_minutes" | "coins_saved" | "skills_unlocked" | "level_reached" | "streak_days";
  targetValue: number;
  weeklyMilestones: string[];
  finalReward: {
    xp: number;
    coins: number;
    title?: string;
  };
}

export const CAMPAIGN_DEFINITIONS: CampaignDefinition[] = [
  {
    id: "camp_hero_awakening",
    name: "The Hero's Awakening",
    description: "Begin your journey in the realm. Complete basic tasks and reach Level 5.",
    category: "Quest Board",
    difficulty: "Easy",
    requiredLevel: 1,
    icon: "🌱",
    targetMetric: "level_reached",
    targetValue: 5,
    weeklyMilestones: [
      "Reach Level 2: Take your first steps",
      "Reach Level 3: Gaining momentum",
      "Reach Level 4: The final stretch to Awakening"
    ],
    finalReward: { xp: 100, coins: 50, title: "Awakened Hero" }
  },
  {
    id: "camp_study_100h",
    name: "Master Scholar: 100 Hours",
    description: "Dedicate yourself to long-term focus. Complete 100 hours (6,000 minutes) of focus sessions.",
    category: "Study",
    difficulty: "Legendary",
    requiredLevel: 5,
    icon: "📚",
    targetMetric: "focus_minutes",
    targetValue: 6000,
    weeklyMilestones: [
      "Accumulate 10 Hours of Deep Focus",
      "Accumulate 25 Hours of Deep Focus",
      "Accumulate 50 Hours of Deep Focus",
      "Accumulate 75 Hours of Deep Focus"
    ],
    finalReward: { xp: 1000, coins: 500, title: "Grand Academic" }
  },
  {
    id: "camp_lose_5kg",
    name: "Body Recomposition Phase 1",
    description: "Build consistency in your workouts by completing 20 exercise sessions.",
    category: "Fitness",
    difficulty: "Easy",
    requiredLevel: 3,
    icon: "💪",
    targetMetric: "quests_completed", // We can query completed tasks with category Health
    targetValue: 20,
    weeklyMilestones: [
      "Complete 5 exercise sessions",
      "Complete 10 exercise sessions",
      "Complete 15 exercise sessions"
    ],
    finalReward: { xp: 200, coins: 150, title: "Athletic Novice" }
  },
  {
    id: "camp_coding_streak",
    name: "Code Warrior Streak",
    description: "Maintain a coding or habit streak of at least 15 days.",
    category: "Streaks",
    difficulty: "Medium",
    requiredLevel: 4,
    icon: "🔥",
    targetMetric: "streak_days",
    targetValue: 15,
    weeklyMilestones: [
      "Reach a 5-day active streak",
      "Reach a 10-day active streak"
    ],
    finalReward: { xp: 300, coins: 200, title: "Relentless Coder" }
  },
  {
    id: "camp_save_10k",
    name: "Treasury Hoarder",
    description: "Amass a fortune of 10,000 Coins in your Money Jar.",
    category: "Finance",
    difficulty: "Hard",
    requiredLevel: 5,
    icon: "💰",
    targetMetric: "coins_saved",
    targetValue: 10000,
    weeklyMilestones: [
      "Save 2,500 Coins in the Money Jar",
      "Save 5,000 Coins in the Money Jar",
      "Save 7,500 Coins in the Money Jar"
    ],
    finalReward: { xp: 500, coins: 1000, title: "Vault Master" }
  },
  {
    id: "camp_master_skilltree",
    name: "Archmage of Mastery",
    description: "Purchase and unlock 15 skills in the skill tree to complete your training.",
    category: "Skills",
    difficulty: "Hard",
    requiredLevel: 10,
    icon: "🌳",
    targetMetric: "skills_unlocked",
    targetValue: 15,
    weeklyMilestones: [
      "Unlock 3 skills in the tree",
      "Unlock 6 skills in the tree",
      "Unlock 9 skills in the tree",
      "Unlock 12 skills in the tree"
    ],
    finalReward: { xp: 600, coins: 400, title: "Grandmaster" }
  },
  {
    id: "camp_slay_bosses",
    name: "Regional Boss Slayer",
    description: "Defeat 10 bosses in the Boss Arena to cleanse the realm of darkness.",
    category: "Boss Battles",
    difficulty: "Legendary",
    requiredLevel: 5,
    icon: "⚔️",
    targetMetric: "bosses_defeated",
    targetValue: 10,
    weeklyMilestones: [
      "Defeat 2 regional bosses",
      "Defeat 5 regional bosses",
      "Defeat 8 regional bosses"
    ],
    finalReward: { xp: 800, coins: 600, title: "Bane of Titans" }
  },
  {
    id: "camp_meditation_habit",
    name: "Mindfulness & Zen",
    description: "Dedicate 300 minutes to mindfulness/meditation focus sessions.",
    category: "Mindfulness",
    difficulty: "Easy",
    requiredLevel: 2,
    icon: "🧘",
    targetMetric: "focus_minutes",
    targetValue: 300,
    weeklyMilestones: [
      "Complete 60 minutes of mindfulness focus",
      "Complete 180 minutes of mindfulness focus"
    ],
    finalReward: { xp: 150, coins: 100, title: "Zen Scholar" }
  }
];
