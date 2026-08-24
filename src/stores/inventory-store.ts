import { create } from "zustand";
import type { InventoryItem, GearSlot } from "@/types";

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  
  loadInventory: (userId: string) => Promise<void>;
  equip: (userId: string, itemId: string, slot: GearSlot) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  loading: true,

  loadInventory: async (userId: string) => {
    set({ loading: true });
    try {
      const { getInventoryAction } = await import("@/actions/game-actions");
      const items = await getInventoryAction(userId);
      set({ items: items as unknown as InventoryItem[], loading: false });
    } catch (error) {
      console.error("Failed to load inventory:", error);
      set({ loading: false });
    }
  },

  equip: async (userId: string, itemId: string, slot: GearSlot) => {
    const { equipItemAction } = await import("@/actions/game-actions");
    await equipItemAction(userId, itemId, slot);
  }
}));
