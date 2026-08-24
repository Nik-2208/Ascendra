import { create } from "zustand";
import { getAchievementsAction, unlockAchievementAction } from "@/actions/game-actions";
import type { Achievement } from "@/types";
import { evaluateAchievements, ACHIEVEMENT_DEFINITIONS, type GameStateSnapshot, type AchievementDefinition } from "@/lib/achievement-engine";
import { useUIStore } from "@/stores/ui-store";

interface AchievementState {
  achievements: Achievement[];
  loading: boolean;
  /** Track how many urge victories the user has (stored in profile or counted locally) */
  urgesWon: number;
  /** Track how many quests completed (counted from Firestore snapshots) */
  completedQuestCount: number;

  loadData: (userId: string) => Promise<void>;
  setUrgesWon: (count: number) => void;
  setCompletedQuestCount: (count: number) => void;

  /**
   * Run the achievement evaluator against current game state.
   * Automatically unlocks new achievements in Firestore and triggers UI popups.
   */
  runEvaluation: (userId: string, snapshot: GameStateSnapshot) => Promise<void>;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  achievements: [],
  loading: true,
  urgesWon: 0,
  completedQuestCount: 0,

  loadData: async (userId: string) => {
    set({ loading: true });
    try {
      const data = await getAchievementsAction(userId);
      set({ achievements: data as Achievement[], loading: false });
    } catch (error) {
      console.error("Failed to load achievements:", error);
      set({ loading: false });
    }
  },

  setUrgesWon: (count) => set({ urgesWon: count }),
  setCompletedQuestCount: (count) => set({ completedQuestCount: count }),

  runEvaluation: async (userId: string, snapshot: GameStateSnapshot) => {
    const { achievements } = get();
    const alreadyUnlocked = new Set(achievements.map(a => a.templateId));

    const newlyUnlocked = evaluateAchievements(snapshot, alreadyUnlocked);

    // Unlock each new achievement (write to DB + show UI popup)
    for (const def of newlyUnlocked) {
      try {
        await unlockAchievementAction(userId, def.id);
        
        // Add to local state
        set(state => ({
          achievements: [...state.achievements, { id: def.id, templateId: def.id, unlockedAt: new Date(), progress: 100 } as Achievement]
        }));
        
        useUIStore.getState().pushAchievement({
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
        });
      } catch (err) {
        console.error(`[AchievementStore] Failed to unlock ${def.id}:`, err);
      }
    }
  },
}));
