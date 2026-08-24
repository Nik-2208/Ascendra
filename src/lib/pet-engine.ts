import type { Pet, PetTemplate, PetMood } from "@/types";

export const PET_TEMPLATES: PetTemplate[] = [
  {
    id: "pet_dragon",
    name: "Crimson Whelpling",
    description: "A fierce little dragon that inspires courage.",
    baseEmoji: "🐉",
    evolutions: [
      { stage: 0, emoji: "🥚", requiredLevel: 0 },
      { stage: 1, emoji: "🐉", requiredLevel: 5 },
      { stage: 2, emoji: "🔥", requiredLevel: 15 },
    ],
    bonuses: { statBoost: "strength", xpMultiplier: 1.1 },
  },
  {
    id: "pet_owl",
    name: "Wisdom Owl",
    description: "An ancient companion that accelerates learning.",
    baseEmoji: "🦉",
    evolutions: [
      { stage: 0, emoji: "🥚", requiredLevel: 0 },
      { stage: 1, emoji: "🦉", requiredLevel: 5 },
      { stage: 2, emoji: "🧙", requiredLevel: 15 },
    ],
    bonuses: { statBoost: "knowledge", xpMultiplier: 1.15 },
  },
  {
    id: "pet_wolf",
    name: "Shadow Wolf",
    description: "A loyal companion that keeps you on track.",
    baseEmoji: "🐺",
    evolutions: [
      { stage: 0, emoji: "🥚", requiredLevel: 0 },
      { stage: 1, emoji: "🐺", requiredLevel: 5 },
      { stage: 2, emoji: "🌑", requiredLevel: 15 },
    ],
    bonuses: { statBoost: "discipline", xpMultiplier: 1.1 },
  },
  {
    id: "pet_cat",
    name: "Lucky Fortune Cat",
    description: "Attracts wealth and good fortune.",
    baseEmoji: "🐱",
    evolutions: [
      { stage: 0, emoji: "🥚", requiredLevel: 0 },
      { stage: 1, emoji: "🐱", requiredLevel: 5 },
      { stage: 2, emoji: "💰", requiredLevel: 15 },
    ],
    bonuses: { statBoost: "finance", xpMultiplier: 1.12 },
  },
  {
    id: "pet_phoenix",
    name: "Ember Phoenix",
    description: "A bird of flame that protects your streaks.",
    baseEmoji: "🦅",
    evolutions: [
      { stage: 0, emoji: "🥚", requiredLevel: 0 },
      { stage: 1, emoji: "🦅", requiredLevel: 5 },
      { stage: 2, emoji: "🔥", requiredLevel: 15 },
    ],
    bonuses: { statBoost: "health", xpMultiplier: 1.08 },
  },
];

export function getEvolutionEmoji(template: PetTemplate, stage: number): string {
  const evo = template.evolutions.find(e => e.stage === stage);
  return evo?.emoji || template.baseEmoji;
}

export function calculatePetMood(lastInteraction: Date | null): PetMood {
  if (!lastInteraction) return "neutral";
  const hoursSince = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);
  if (hoursSince < 12) return "happy";
  if (hoursSince < 36) return "neutral";
  return "sad";
}

export function petXpForNextLevel(currentLevel: number): number {
  return Math.floor(50 * Math.pow(1.3, currentLevel));
}
