import { create } from "zustand";
import { getPetsAction } from "@/actions/game-actions";
import type { Pet } from "@/types";

interface PetState {
  pets: Pet[];
  loading: boolean;
  loadData: (userId: string) => Promise<void>;
  setActive: (userId: string, petId: string) => Promise<void>;
}

export const usePetStore = create<PetState>((set) => ({
  pets: [],
  loading: true,

  loadData: async (userId: string) => {
    set({ loading: true });
    try {
      const data = await getPetsAction(userId);
      set({ pets: data as unknown as Pet[], loading: false });
    } catch (error) {
      console.error("Failed to load pets:", error);
      set({ loading: false });
    }
  },

  setActive: async (userId: string, petId: string) => {
    // This action would call a Server Action in game-actions
    // For now, mock update locally
    set((state) => ({
      pets: state.pets.map(p => ({
        ...p,
        isActive: p.id === petId
      }))
    }));
  },
}));
