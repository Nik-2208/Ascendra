import { RewardPolicy } from "./reward-policy";

export interface TaskReward {
  xp: number;
  coins: number;
}

export class TaskRewardEngine {
  /**
   * Get canonical base rewards for task priority derived from global RewardPolicy
   */
  static getBaseRewards(priority: string): TaskReward {
    const diff = RewardPolicy.inferDifficulty({ priority });
    return RewardPolicy.getRewardsForDifficulty(diff);
  }

  /**
   * Resolve exact canonical rewards for a task or linked quest object.
   * Guarantees Displayed XP == Awarded XP 100% of the time, normalized to <= 100 XP.
   */
  static resolveRewards(taskOrQuest: { xpReward?: number; coinReward?: number; priority?: string }): TaskReward {
    const diff = RewardPolicy.inferDifficulty({ priority: taskOrQuest.priority });
    if (typeof taskOrQuest.xpReward === "number" && taskOrQuest.xpReward > 0) {
      return RewardPolicy.normalizeRewards(taskOrQuest.xpReward, taskOrQuest.coinReward || 0, diff);
    }

    return RewardPolicy.getRewardsForDifficulty(diff);
  }
}
