import { create } from "zustand";
import type { Boss } from "@/types";

interface BossState {
  bosses: Boss[];
  loading: boolean;
  
  loadBosses: (userId: string) => Promise<void>;
  dealDamage: (userId: string, bossId: string, amount: number) => Promise<boolean>;
}

export const useBossStore = create<BossState>((set, get) => ({
  bosses: [],
  loading: true,

  loadBosses: async (userId: string) => {
    try {
      const { LocalCacheManager } = await import("@/lib/local-cache");
      const cachedBosses = await LocalCacheManager.get<Boss[]>(`bosses:${userId}`);
      if (cachedBosses) {
        set({ bosses: cachedBosses, loading: false });
      }
    } catch (e) {
      console.warn("Failed to read cached bosses:", e);
    }

    try {
      const { getBossesAction } = await import("@/actions/game-actions");
      const bosses = await getBossesAction(userId);
      if (bosses) {
        set({ bosses: bosses as unknown as Boss[], loading: false });
        const { LocalCacheManager } = await import("@/lib/local-cache");
        await LocalCacheManager.set(`bosses:${userId}`, bosses);
      }
    } catch (error) {
      console.error("Failed to load bosses:", error);
      set({ loading: false });
    }
  },

  dealDamage: async (userId: string, bossId: string, amount: number) => {
    const boss = get().bosses.find(b => b.id === bossId);
    if (!boss) return false;

    const { dealBossDamageAction } = await import("@/actions/game-actions");
    const result = await dealBossDamageAction(userId, bossId, amount);

    if (result && result.success) {
      const data = result as { defeated?: boolean; drop?: unknown; levelUp?: boolean; newLevel?: number | null };
      const { dispatchGameEvent } = await import("@/lib/game-event-bus");
      
      await dispatchGameEvent("BOSS_DAMAGED", { bossId, damage: amount });
      
      if (data.defeated) {
        await dispatchGameEvent("BOSS_DEFEATED", {
          bossId,
          boss,
          drop: data.drop,
          levelUp: data.levelUp,
          newLevel: data.newLevel,
        });
      }
      return !!data.defeated;
    }

    return false;
  }
}));
