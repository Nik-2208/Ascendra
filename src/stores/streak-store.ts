import { create } from "zustand";
import { getStreaksAction } from "@/actions/game-actions";
import type { Streak } from "@/types";

interface StreakState {
  streaks: Streak[];
  loading: boolean;
  loadData: (userId: string) => Promise<void>;
  checkin: (userId: string, streakId: string) => Promise<void>;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  streaks: [],
  loading: true,

  loadData: async (userId: string) => {
    set({ loading: true });
    try {
      const data = await getStreaksAction(userId);
      set({ streaks: data as Streak[], loading: false });
    } catch (error) {
      console.error("Failed to load streaks:", error);
      set({ loading: false });
    }
  },

  checkin: async (userId: string, streakId: string) => {
    const { streakCheckinAction } = await import("@/actions/game-actions");
    const result = await streakCheckinAction(userId, streakId);
    
    if (result && result.success) {
      const { dispatchGameEvent } = await import("@/lib/game-event-bus");
      await dispatchGameEvent("STREAK_CHECKIN", {
        streakId,
        userId,
        xpGained: "xpGained" in result ? result.xpGained : 0,
        newCount: "newCount" in result ? result.newCount : 0,
        levelUp: "levelUp" in result ? result.levelUp : false,
        newLevel: "newLevel" in result ? result.newLevel : null,
      });
    }
  }
}));
