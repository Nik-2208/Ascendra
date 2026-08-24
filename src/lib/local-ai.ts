import type { Streak } from "@/types";

export interface Task {
  id: string;
  title: string;
  completed?: boolean;
  priority: string;
  dueDate?: string | Date | null;
  description?: string | null;
}

export interface StreakRiskPrediction {
  streakId: string;
  name: string;
  riskLevel: "low" | "medium" | "high";
  reason: string;
}

export interface LocalFinancialInsights {
  emergencyFundStatus: string;
  savingsRate: number;
  projectedGainsYear: number;
  tips: string[];
}

/**
 * Predicts which streaks are at risk of breaking based on last check-in date
 */
export function predictStreakRisk(streaks: Streak[]): StreakRiskPrediction[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return streaks
    .filter(s => s.lastCheckin)
    .map(s => {
      const lastCheckin = new Date(s.lastCheckin as any);
      let riskLevel: "low" | "medium" | "high" = "low";
      let reason = "Streak is active and check-in is up-to-date.";

      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastCheckin < yesterday) {
        riskLevel = "high";
        reason = "You missed yesterday's check-in! Do it now to prevent the streak from breaking.";
      } else if (lastCheckin < startOfToday) {
        riskLevel = "medium";
        reason = "You haven't checked in today. Complete it before midnight.";
      }

      return {
        streakId: s.id,
        name: s.name,
        riskLevel,
        reason
      };
    });
}

/**
 * Heuristically estimates the time required for a task based on keywords in title
 */
export function estimateTaskDuration(taskTitle: string): number {
  const title = taskTitle.toLowerCase();
  
  if (title.includes("read") || title.includes("book")) return 45;
  if (title.includes("workout") || title.includes("gym") || title.includes("run")) return 60;
  if (title.includes("quick") || title.includes("email") || title.includes("clean")) return 15;
  if (title.includes("study") || title.includes("code") || title.includes("project")) return 90;
  if (title.includes("meditate") || title.includes("yoga")) return 20;

  return 30; // default duration
}

/**
 * Optimizes the daily schedule: sorts tasks by urgency, importance, and energy matching
 */
export function autoOptimizeSchedule(tasks: Task[]): Task[] {
  const pVal = { High: 3, Medium: 2, Low: 1 };
  
  return [...tasks].sort((a, b) => {
    // 1. Uncompleted tasks first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // 2. High priority first
    const prioA = pVal[a.priority as keyof typeof pVal] || 2;
    const prioB = pVal[b.priority as keyof typeof pVal] || 2;
    if (prioB !== prioA) return prioB - prioA;

    // 3. Due dates first
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return 0;
  });
}

/**
 * Local financial analysis engine for Money Jars
 */
export function generateLocalFinancialInsights(
  jars: Array<{ id: string; name: string; totalSaved: number; goal: number }>,
  transactions: Array<{ amount: number; type: string; createdAt: Date }>
): LocalFinancialInsights {
  const totalSaved = jars.reduce((sum, j) => sum + j.totalSaved, 0);
  const totalGoal = jars.reduce((sum, j) => sum + j.goal, 0);
  
  const income = transactions.filter(t => t.type === "EARN").reduce((sum, t) => sum + t.amount, 0);
  const spending = transactions.filter(t => t.type === "SPEND").reduce((sum, t) => sum + t.amount, 0);
  
  const savingsRate = income > 0 ? Math.round(((income - spending) / income) * 100) : 0;
  const projectedGainsYear = totalSaved * 0.05; // 5% mock yield

  const tips: string[] = [];
  if (totalSaved < totalGoal * 0.2) {
    tips.push("Set up a micro-investment jar to build momentum on long-term targets.");
  }
  if (spending > income * 0.8) {
    tips.push("Your spending exceeds 80% of your earnings. Try setting aside 10% automatically.");
  } else {
    tips.push("Great discipline! You are maintaining a healthy savings rate above 20%.");
  }

  return {
    emergencyFundStatus: totalSaved > 1000 ? "Healthy" : "Building Status",
    savingsRate,
    projectedGainsYear,
    tips
  };
}
