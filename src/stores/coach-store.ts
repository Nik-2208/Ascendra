import { create } from "zustand";
import type { CoachInsight } from "@/types";
import { getCoachInsightsAction } from "@/actions/game-actions";

interface CoachState {
  insights: CoachInsight[];
  loading: boolean;
  loadInsights: (userId: string) => Promise<void>;
}

export const useCoachStore = create<CoachState>((set) => ({
  insights: [],
  loading: true,

  loadInsights: async (userId: string) => {
    set({ loading: true });

    try {
      const insights = await getCoachInsightsAction(userId);
      set({ insights, loading: false });
    } catch (error) {
      console.error("[CoachStore] loadInsights error:", (error as Error).message);
      set({ insights: [], loading: false });
    }
  }
}));
