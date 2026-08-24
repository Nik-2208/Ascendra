import { create } from "zustand";
import type { ScheduleBlock } from "@/types";
import { getScheduleBlocksAction } from "@/actions/game-actions";

interface ScheduleState {
  blocks: ScheduleBlock[];
  loading: boolean;
  loadSchedule: (userId: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  blocks: [],
  loading: true,

  loadSchedule: async (userId: string) => {
    set({ loading: true });

    try {
      const blocks = await getScheduleBlocksAction(userId);
      
      // Sort locally by startTime
      blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      set({ blocks, loading: false });
    } catch (error) {
      console.error("[ScheduleStore] loadSchedule error:", (error as Error).message);
      set({ blocks: [], loading: false });
    }
  }
}));
