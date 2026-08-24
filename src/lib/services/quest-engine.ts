import "server-only";
import { UnifiedQuestEngine, QuestEvent, QuestEventType } from "@/lib/quest-engine/unified-quest-engine";

export type { QuestEvent, QuestEventType };

export class QuestEngine {
  /**
   * Emit a gameplay event that automatically updates all matching active quests in real time
   */
  static async emit(event: QuestEvent, externalTx?: any): Promise<number> {
    return UnifiedQuestEngine.emitEvent(event, externalTx);
  }

  /**
   * Atomically claims rewards for a completed quest
   */
  static async claimReward(userId: string, questProgressId: string) {
    return UnifiedQuestEngine.claimReward(userId, questProgressId);
  }

  /**
   * Self-healing process to auto-evaluate and update completed quests
   */
  static async selfHeal(userId: string) {
    const { SelfHealFramework } = await import("@/lib/self-heal/self-heal-framework");
    await SelfHealFramework.runPreFlightCheck(userId);
  }
}
