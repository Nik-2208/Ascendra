import { create } from "zustand";
import type { CharacterProfile } from "@/types";

interface CharacterState {
  profile: CharacterProfile | null;
  loading: boolean;
  
  loadProfile: (userId: string) => Promise<void>;
  setProfile: (profile: CharacterProfile | null) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  profile: null,
  loading: true,

  setProfile: (profile) => set({ profile }),

  loadProfile: async (userId: string) => {
    try {
      const { LocalCacheManager } = await import("@/lib/local-cache");
      const cachedProfile = await LocalCacheManager.get<CharacterProfile>(`profile:${userId}`);
      if (cachedProfile) {
        set({ profile: cachedProfile, loading: false });
      }
    } catch (e) {
      console.warn("Failed to read cached profile:", e);
    }

    try {
      // Static import — no module loading overhead
      const { getCharacterAction } = await import("@/actions/game-actions");
      const profile = await getCharacterAction(userId);
      if (profile) {
        set({ profile: profile as CharacterProfile, loading: false });
        const { LocalCacheManager } = await import("@/lib/local-cache");
        await LocalCacheManager.set(`profile:${userId}`, profile);
      }
    } catch (error) {
      console.error("Failed to load character profile:", error);
      set({ loading: false });
    }
  },
}));
