const REGEN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes = 900,000 ms

export interface GameMetrics {
  accuracy?: number;
  speedMs?: number;
  difficulty?: number;
  tier?: "Beginner" | "Master" | "Legendary";
  domain?: string;
}

export function syncEnergyProfile(brainProfile: any) {
  const now = Date.now();
  let energy = typeof brainProfile.brainEnergy === "number" ? brainProfile.brainEnergy : 10;
  let maxEnergy = typeof brainProfile.maxBrainEnergy === "number" ? brainProfile.maxBrainEnergy : 10;
  let lastTimestamp = typeof brainProfile.lastEnergyTimestamp === "number" ? brainProfile.lastEnergyTimestamp : now;

  // Handle edge case: clock manipulation or future timestamps
  if (lastTimestamp > now) {
    lastTimestamp = now;
  }

  if (energy >= maxEnergy) {
    return {
      updatedProfile: {
        ...brainProfile,
        brainEnergy: maxEnergy,
        lastEnergyTimestamp: now,
      },
      timeToNextSec: 0,
      hasChanges: energy !== maxEnergy || lastTimestamp !== now,
    };
  }

  const elapsed = now - lastTimestamp;
  const gained = Math.floor(elapsed / REGEN_INTERVAL_MS);

  if (gained > 0) {
    const newEnergy = Math.min(maxEnergy, energy + gained);
    const remainder = elapsed % REGEN_INTERVAL_MS;
    const newLastTimestamp = newEnergy >= maxEnergy ? now : now - remainder;
    const timeToNextSec = newEnergy >= maxEnergy ? 0 : Math.ceil((REGEN_INTERVAL_MS - remainder) / 1000);

    return {
      updatedProfile: {
        ...brainProfile,
        brainEnergy: newEnergy,
        lastEnergyTimestamp: newLastTimestamp,
      },
      timeToNextSec,
      hasChanges: true,
    };
  }

  const remainingMs = REGEN_INTERVAL_MS - elapsed;
  const timeToNextSec = Math.ceil(remainingMs / 1000);

  return {
    updatedProfile: brainProfile,
    timeToNextSec,
    hasChanges: false,
  };
}
