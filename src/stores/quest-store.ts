import { create } from "zustand";
import { soundEngine } from "@/lib/sound-engine";
import { useUIStore } from "./ui-store";
import type { Quest } from "@/types";

interface QuestState {
  quests: Quest[];
  loading: boolean;
  
  loadQuests: (userId: string) => Promise<void>;
  completeQuest: (userId: string, questId: string) => Promise<void>;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: [],
  loading: true,

  loadQuests: async (userId: string) => {
    try {
      const { LocalCacheManager } = await import("@/lib/local-cache");
      const cachedQuests = await LocalCacheManager.get<Quest[]>(`quests:${userId}`);
      if (cachedQuests) {
        set({ quests: cachedQuests, loading: false });
      }
    } catch (e) {
      console.warn("Failed to read cached quests:", e);
    }

    try {
      const { getQuestsAction } = await import("@/actions/game-actions");
      const quests = await getQuestsAction(userId);
      if (quests) {
        set({ quests: quests as unknown as Quest[], loading: false });
        const { LocalCacheManager } = await import("@/lib/local-cache");
        await LocalCacheManager.set(`quests:${userId}`, quests);
      }
    } catch (error) {
      console.error("Failed to load quests:", error);
      set({ loading: false });
    }
  },

  completeQuest: async (userId: string, progressId: string) => {
    const quest = get().quests.find(q => q.id === progressId);
    if (!quest) return;

    soundEngine.playQuestComplete();

    const { completeQuestAction } = await import("@/actions/game-actions");
    const result = await completeQuestAction(userId, progressId);

    if (result && result.success) {
      const { dispatchGameEvent } = await import("@/lib/game-event-bus");
      await dispatchGameEvent("QUEST_COMPLETED", {
        questId: progressId,
        quest,
        xpGained: "xpGained" in result ? result.xpGained : 0,
        coinsGained: "coinsGained" in result ? result.coinsGained : 0,
        levelUp: "levelUp" in result ? result.levelUp : false,
        newLevel: "newLevel" in result ? result.newLevel : null,
      });
    }
  }
}));
