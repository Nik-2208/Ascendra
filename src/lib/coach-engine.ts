import type { CharacterProfile, Quest, StatName, CoachInsight } from "@/types";

// Removed firebase import

// AI Coach Engine (Heuristic/Statistical)

export function generateInsights(profile: CharacterProfile | null): CoachInsight[] {
  const insights: CoachInsight[] = [];
  
  if (!profile) return insights;

  // Rule 1: High Discipline Check
  if (profile.stats.discipline.level > 5) {
    insights.push({
      id: "insight_disc_high",
      type: "positive",
      title: "Iron Will",
      content: "Your discipline stat is growing rapidly. The consistency in your daily quests is paying off. Keep the momentum going!",
      createdAt: new Date(),
    });
  }

  // Rule 2: Unused Coins
  if (profile.coins > 500) {
    insights.push({
      id: "insight_coins",
      type: "suggestion",
      title: "Treat Yourself",
      content: "You've accumulated over 500 coins! Consider visiting the Reward Shop to cash in on your hard work.",
      createdAt: new Date(),
    });
  }

  // Rule 3: Low Health vs High Level
  if (profile.stats.health.level < 3 && profile.level > 5) {
    insights.push({
      id: "insight_health",
      type: "warning",
      title: "Health Recovery Needed",
      content: "Your health stat is lagging behind your overall level. Try adding some physical or mental rest quests.",
      createdAt: new Date(),
    });
  }

  // Rule 4: Onboarding Complete
  if (!profile.onboardingComplete) {
     insights.push({
      id: "insight_onboarding",
      type: "suggestion",
      title: "Finish Onboarding",
      content: "Complete your profile and starter quests to fully unlock the game's features.",
      createdAt: new Date(),
    });
  }

  return insights;
}

export interface WeeklyReviewData {
  xpGained: number;
  bossDamageDealt: number;
  questsCompleted: number;
  urgesDefeated: number;
  topStat: string;
  summary: string;
}

export function generateWeeklyReview(quests: Quest[], urgesDefeatedCount = 0): WeeklyReviewData {
  // Filter for quests completed in the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentQuests = quests.filter(
    (q) => q.status === "completed" && q.completedAt && new Date(q.completedAt as string | number | Date) >= sevenDaysAgo
  );

  let xpGained = 0;
  const statCounts: Record<string, number> = {};

  recentQuests.forEach(q => {
    xpGained += q.xpReward;
    statCounts[q.stat] = (statCounts[q.stat] || 0) + 1;
  });

  // Find top stat
  let topStat = "None";
  let maxCount = 0;
  for (const [stat, count] of Object.entries(statCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topStat = stat;
    }
  }

  let summary = "A quiet week. Time to pick up the pace!";
  if (recentQuests.length > 20) {
    summary = "A highly productive week! You maintained strong focus and dealt significant damage to your active goals.";
  } else if (recentQuests.length > 5) {
    summary = "A solid week of progress. Keep building those habits.";
  }

  return {
    xpGained,
    bossDamageDealt: recentQuests.length * 25, // Calculated boss damage based on completed quest effort
    questsCompleted: recentQuests.length,
    urgesDefeated: urgesDefeatedCount,
    topStat: topStat.charAt(0).toUpperCase() + topStat.slice(1),
    summary
  };
}
