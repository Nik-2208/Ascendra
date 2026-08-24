import "server-only";
import { ProgressionService } from "./progression-service";

export class LevelService {
  /**
   * Awards XP to a character and handles potential multi-level ups atomically.
   * Forwarded to centralized ProgressionService.
   */
  static async awardXP(userId: string, xpAmount: number, tx: any) {
    return ProgressionService.awardXP(userId, xpAmount, tx);
  }
}
