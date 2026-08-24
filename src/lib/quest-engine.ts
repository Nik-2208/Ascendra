import type { CharacterProfile, Quest, QuestDifficulty, StatName } from "@/types";

export function autoScaleDifficulty(
  baseDifficulty: QuestDifficulty,
  characterLevel: number
): QuestDifficulty {
  // If character is high level, scale up easy quests
  if (characterLevel > 50 && baseDifficulty === "easy") return "medium";
  if (characterLevel > 80 && baseDifficulty === "medium") return "hard";
  
  return baseDifficulty;
}

export function recommendQuests(
  profile: CharacterProfile | null,
  activeQuests: Quest[]
): Partial<Quest>[] {
  if (!profile) return [];

  const recommendations: Partial<Quest>[] = [];

  // 1. Identify weakest stat
  let weakestStat = "discipline";
  let lowestLevel = Infinity;

  Object.entries(profile.stats).forEach(([statName, statData]) => {
    if (statData.level < lowestLevel) {
      lowestLevel = statData.level;
      weakestStat = statName;
    }
  });

  recommendations.push({
    title: `Train ${weakestStat} for 15 minutes`,
    description: `Your ${weakestStat} is your weakest link at level ${lowestLevel}. Time to train it.`,
    stat: weakestStat as StatName,
    difficulty: "easy",
    type: "daily",
    priority: "high"
  });

  // 2. Based on high coins (recommend a reward quest if we had a reward system mapped to quests, but let's recommend boss fights instead)
  if (profile.level >= 10 && activeQuests.filter(q => q.bossId).length === 0) {
    recommendations.push({
      title: "Challenge a Region Boss",
      description: "You have grown strong enough to face a major threat.",
      stat: "strength",
      difficulty: "epic",
      type: "story",
      priority: "critical"
    });
  }

  // 3. Balance physical and mental
  const hasPhysical = activeQuests.some(q => ["strength", "health", "fitness"].includes(q.stat));
  if (!hasPhysical) {
    recommendations.push({
      title: "Physical Conditioning",
      description: "You haven't accepted any physical quests today. Go for a run or do a workout.",
      stat: "health",
      difficulty: "medium",
      type: "daily",
      priority: "medium"
    });
  }

  return recommendations;
}
