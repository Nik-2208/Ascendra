import { create } from "zustand";
import type { MoneyJarTransaction, MoneyJarData } from "@/types";
import { getMoneyJarDataAction } from "@/actions/game-actions";

interface MoneyJarState {
  transactions: MoneyJarTransaction[];
  data: MoneyJarData | null;
  loading: boolean;
  loadMoneyJar: (userId: string) => Promise<void>;
}

export const useMoneyJarStore = create<MoneyJarState>((set) => ({
  transactions: [],
  data: null,
  loading: true,

  loadMoneyJar: async (userId: string) => {
    set({ loading: true });

    try {
      const res = await getMoneyJarDataAction(userId);
      if (res.moneyJar) {
        set({
          data: {
            totalSaved: res.moneyJar.realMoneySaved,
            currency: res.moneyJar.currency,
            goal: res.moneyJar.realMoneyGoal
          },
          transactions: res.transactions,
          loading: false
        });
      } else {
        set({
          data: { totalSaved: 0, currency: "USD", goal: 10000 },
          transactions: res.transactions || [],
          loading: false
        });
      }
    } catch (error) {
      console.error("[MoneyJarStore] loadMoneyJar error:", (error as Error).message);
      set({ 
        data: { totalSaved: 0, currency: "USD", goal: 10000 }, 
        transactions: [], 
        loading: false 
      });
    }
  }
}));
