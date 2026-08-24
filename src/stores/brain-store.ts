import { create } from "zustand";
import { getBrainLevelFromXp, getRankForLevel, RANKS } from "@/lib/brain-progression-engine";

export { RANKS, getRankForLevel };

export interface BrainProfileState {
  brainXp: number;
  brainLevel: number;
  brainRank: string;
  brainEnergy: number;
  maxBrainEnergy: number;
  lastEnergyTimestamp: number;
  dailyScore: number;
  streakDays: number;
  personalBests: Record<string, number>;
  
  syncEnergy: () => { currentEnergy: number; timeToNextSec: number };
  consumeEnergy: () => boolean;
  setBrainProfile: (profile: Partial<BrainProfileState>) => void;
}

const REGEN_INTERVAL_MS = 15 * 60 * 1000;

export const useBrainStore = create<BrainProfileState>((set, get) => ({
  brainXp: 0,
  brainLevel: 1,
  brainRank: "Novice Mind",
  brainEnergy: 10,
  maxBrainEnergy: 10,
  lastEnergyTimestamp: Date.now(),
  dailyScore: 0,
  streakDays: 1,
  personalBests: {},

  setBrainProfile: (profile) => set((state) => {
    const nextXp = profile.brainXp !== undefined ? Math.max(0, profile.brainXp) : state.brainXp;
    const canonicalLevel = getBrainLevelFromXp(nextXp);
    const canonicalRank = getRankForLevel(canonicalLevel);

    return {
      ...state,
      ...profile,
      brainXp: nextXp,
      brainLevel: profile.brainLevel !== undefined ? profile.brainLevel : canonicalLevel,
      brainRank: profile.brainRank !== undefined ? profile.brainRank : canonicalRank,
    };
  }),

  syncEnergy: () => {
    const state = get();
    const now = Date.now();
    
    if (state.brainEnergy >= state.maxBrainEnergy) {
      set({ lastEnergyTimestamp: now });
      return { currentEnergy: state.maxBrainEnergy, timeToNextSec: 0 };
    }

    const elapsed = now - state.lastEnergyTimestamp;
    const energyGained = Math.floor(elapsed / REGEN_INTERVAL_MS);

    if (energyGained > 0) {
      const newEnergy = Math.min(state.maxBrainEnergy, state.brainEnergy + energyGained);
      const remainderMs = elapsed % REGEN_INTERVAL_MS;
      const newLastTimestamp = newEnergy >= state.maxBrainEnergy ? now : now - remainderMs;

      set({
        brainEnergy: newEnergy,
        lastEnergyTimestamp: newLastTimestamp,
      });

      if (newEnergy >= state.maxBrainEnergy) {
        return { currentEnergy: state.maxBrainEnergy, timeToNextSec: 0 };
      }
      const nextSec = Math.ceil((REGEN_INTERVAL_MS - remainderMs) / 1000);
      return { currentEnergy: newEnergy, timeToNextSec: nextSec };
    }

    const remainingMs = REGEN_INTERVAL_MS - elapsed;
    return { currentEnergy: state.brainEnergy, timeToNextSec: Math.ceil(remainingMs / 1000) };
  },

  consumeEnergy: () => {
    const { syncEnergy } = get();
    const { currentEnergy } = syncEnergy();
    if (currentEnergy < 1) return false;

    const state = get();
    const now = Date.now();
    const nextEnergy = state.brainEnergy - 1;
    const newTimestamp = state.brainEnergy === state.maxBrainEnergy ? now : state.lastEnergyTimestamp;

    set({
      brainEnergy: nextEnergy,
      lastEnergyTimestamp: newTimestamp,
    });

    return true;
  },
}));
