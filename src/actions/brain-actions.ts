"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  calculateGameBrainXp,
  getBrainLevelFromXp,
  getXpRequiredForBrainLevel,
  getRankForLevel,
} from "@/lib/brain-progression-engine";
import { syncEnergyProfile, type GameMetrics } from "@/lib/brain-energy-engine";

export async function getBrainLabData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const character = await prisma.character.findUnique({
    where: { userId },
  });

  if (!character) {
    throw new Error("Character not found");
  }

  let buildings: any = character.buildings || {};
  if (typeof buildings === "string") {
    try {
      buildings = JSON.parse(buildings);
    } catch (e) {
      buildings = {};
    }
  }

  let brainProfile = buildings.brainProfile || {
    brainXp: 0,
    brainLevel: 1,
    brainRank: "Novice Mind",
    brainEnergy: 10,
    maxBrainEnergy: 10,
    lastEnergyTimestamp: Date.now(),
    dailyScore: 0,
    personalBests: {},
  };

  // 1. Energy Regeneration Sync
  const { updatedProfile, timeToNextSec, hasChanges } = syncEnergyProfile(brainProfile);
  brainProfile = updatedProfile;

  // 2. Canonical Level & Rank Sync
  const canonicalLevel = getBrainLevelFromXp(brainProfile.brainXp || 0);
  const canonicalRank = getRankForLevel(canonicalLevel);

  let profileChanged = hasChanges;
  if (brainProfile.brainLevel !== canonicalLevel || brainProfile.brainRank !== canonicalRank) {
    brainProfile.brainLevel = canonicalLevel;
    brainProfile.brainRank = canonicalRank;
    profileChanged = true;
  }

  if (profileChanged) {
    buildings.brainProfile = brainProfile;
    await prisma.character.update({
      where: { id: character.id },
      data: { buildings },
    });
  }

  return {
    ...brainProfile,
    timeToNextSec,
  };
}

export async function consumeBrainEnergyAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const result = await prisma.$transaction(async (tx) => {
    const character = await tx.character.findUnique({ where: { userId } });
    if (!character) throw new Error("Character not found");

    let buildings: any = character.buildings || {};
    if (typeof buildings === "string") {
      try {
        buildings = JSON.parse(buildings);
      } catch (e) {
        buildings = {};
      }
    }

    let brainProfile = buildings.brainProfile || {
      brainXp: 0,
      brainLevel: 1,
      brainRank: "Novice Mind",
      brainEnergy: 10,
      maxBrainEnergy: 10,
      lastEnergyTimestamp: Date.now(),
      dailyScore: 0,
      personalBests: {},
    };

    const { updatedProfile } = syncEnergyProfile(brainProfile);
    brainProfile = updatedProfile;

    if (brainProfile.brainEnergy < 1) {
      return { success: false, error: "NO_ENERGY", profile: brainProfile };
    }

    const now = Date.now();
    const nextEnergy = brainProfile.brainEnergy - 1;
    const newTimestamp = brainProfile.brainEnergy >= brainProfile.maxBrainEnergy ? now : brainProfile.lastEnergyTimestamp;

    brainProfile = {
      ...brainProfile,
      brainEnergy: nextEnergy,
      lastEnergyTimestamp: newTimestamp,
    };

    buildings.brainProfile = brainProfile;

    await tx.character.update({
      where: { id: character.id },
      data: { buildings },
    });

    const { timeToNextSec } = syncEnergyProfile(brainProfile);

    return {
      success: true,
      profile: {
        ...brainProfile,
        timeToNextSec,
      },
    };
  });

  return result;
}

export async function submitBrainGameResult(
  userId: string,
  gameId: string,
  score: number,
  metrics: GameMetrics = {}
) {
  try {
    const session = await auth();
    const activeUserId = session?.user?.id || userId;
    if (!activeUserId) throw new Error("Unauthorized");

    const result = await prisma.$transaction(async (tx) => {
      const character = await tx.character.findUnique({
        where: { userId: activeUserId },
      });
      if (!character) throw new Error("Character not found");

      let buildings: any = character.buildings || {};
      if (typeof buildings === "string") {
        try {
          buildings = JSON.parse(buildings);
        } catch (e) {
          buildings = {};
        }
      }

      let brainProfile = buildings.brainProfile || {
        brainXp: 0,
        brainLevel: 1,
        brainRank: "Novice Mind",
        brainEnergy: 10,
        maxBrainEnergy: 10,
        lastEnergyTimestamp: Date.now(),
        dailyScore: 0,
        personalBests: {},
      };

      // 1. Sync energy before computing game result
      const { updatedProfile } = syncEnergyProfile(brainProfile);
      brainProfile = updatedProfile;

      const currentPb = brainProfile.personalBests?.[gameId] || 0;
      const isNewPb = score > currentPb;
      const newPb = Math.max(currentPb, score);

      const diffLevel = (metrics.difficulty || 1) >= 3 ? "hard" : (metrics.difficulty || 1) >= 2 ? "medium" : "easy";
      const earnedBrainXp = calculateGameBrainXp(score, diffLevel, isNewPb);

      const oldLevel = getBrainLevelFromXp(brainProfile.brainXp || 0);
      let newTotalXp = Math.max(0, (brainProfile.brainXp || 0) + earnedBrainXp);
      let newLevel = getBrainLevelFromXp(newTotalXp);

      // Bounds check: Max 1 level drop / Max 1 level gain per game
      if (newLevel < oldLevel - 1) {
        newLevel = oldLevel - 1;
        newTotalXp = Math.max(newTotalXp, getXpRequiredForBrainLevel(newLevel));
      }
      if (newLevel > oldLevel + 1) {
        newLevel = oldLevel + 1;
        newTotalXp = Math.min(newTotalXp, getXpRequiredForBrainLevel(newLevel + 1) - 1);
      }

      const newRank = getRankForLevel(newLevel);

      brainProfile = {
        ...brainProfile,
        brainXp: newTotalXp,
        brainLevel: newLevel,
        brainRank: newRank,
        dailyScore: Math.max(0, (brainProfile.dailyScore || 0) + (earnedBrainXp > 0 ? Math.floor(score / 10) : 0)),
        personalBests: {
          ...(brainProfile.personalBests || {}),
          [gameId]: newPb,
        },
      };

      buildings.brainProfile = brainProfile;

      await tx.character.update({
        where: { id: character.id },
        data: { buildings },
      });

      const { timeToNextSec } = syncEnergyProfile(brainProfile);

      return {
        brainProfile: {
          ...brainProfile,
          timeToNextSec,
        },
        earnedBrainXp,
      };
    });

    const generalXp = Math.floor(Math.max(0, result.earnedBrainXp) * 0.5);
    const coins = Math.floor(Math.max(0, result.earnedBrainXp) * 0.25);

    try {
      const { QuestEngine } = await import("@/lib/services/quest-engine");
      await QuestEngine.emit({ userId: activeUserId, type: "BRAIN_GAME_PLAYED", value: 1 });
    } catch (qErr) {
      console.error("QuestEngine event emission error on brain game result:", qErr);
    }

    return {
      success: true,
      brainXpEarned: result.earnedBrainXp,
      profile: result.brainProfile,
    };
  } catch (error) {
    console.error("[BrainActions] Error submitting game result:", error);
    return { success: false, error: "Failed to process brain game score" };
  }
}
