import { create } from "zustand";
import { getShopItems } from "@/actions/shop-actions";

export type ShopItemType = "reward" | "boost" | "cosmetic";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "coins" | "premiumCoins" | "gems";
  type: ShopItemType;
  icon: string;
  createdAt?: unknown;
}

interface ShopState {
  items: ShopItem[];
  loading: boolean;
  loadShopItems: () => Promise<void>;
}

export const useShopStore = create<ShopState>((set) => ({
  items: [],
  loading: true,

  loadShopItems: async () => {
    set({ loading: true });
    try {
      const res = await getShopItems();
      const items = res.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.value, // value maps to price
        currency: "coins" as const, // items are bought with coins for now
        type: item.type as any,
        icon: (item as { icon?: string }).icon || "star",
      }));
      set({ items, loading: false });
    } catch (error) {
      console.error("[ShopStore] Error loading items:", (error as Error).message);
      set({ items: [], loading: false });
    }
  },
}));
