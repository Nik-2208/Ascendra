import { z } from "zod";

// ---- Stat Names ----

export const StatNameSchema = z.enum([
  "strength",
  "focus",
  "discipline",
  "knowledge",
  "health",
  "creativity",
  "charisma",
  "wisdom",
  "finance",
  "relationships",
]);

// ---- Quest Schemas ----

export const QuestTypeSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "story",
  "side",
  "seasonal",
  "guild",
]);

export const QuestDifficultySchema = z.enum([
  "easy",
  "medium",
  "hard",
  "epic",
  "legendary",
]);

export const QuestPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const CreateQuestSchema = z.object({
  title: z.string().min(1, "Quest title is required").max(200, "Title too long"),
  description: z.string().max(1000).default(""),
  type: QuestTypeSchema.default("daily"),
  difficulty: QuestDifficultySchema.default("medium"),
  priority: QuestPrioritySchema.default("medium"),
  stat: StatNameSchema.default("discipline"),
  estimatedMinutes: z.number().min(1).max(480).default(30),
  bossId: z.string().nullable().default(null),
  dueDate: z.date().nullable().default(null),
});

export type CreateQuestInput = z.infer<typeof CreateQuestSchema>;

// ---- Boss Schemas ----

export const CreateBossSchema = z.object({
  name: z.string().min(1, "Boss name required").max(100),
  description: z.string().max(500).default(""),
  lore: z.string().max(2000).default(""),
  maxHP: z.number().min(100).max(100000).default(1000),
  linkedStats: z.array(StatNameSchema).min(1),
  weaknesses: z.array(StatNameSchema).default([]),
});

export type CreateBossInput = z.infer<typeof CreateBossSchema>;

// ---- Character Schemas ----

export const CharacterSettingsSchema = z.object({
  sound: z.boolean().default(true),
  currency: z.string().min(1).max(5).default("₹"),
  timezone: z.string().default("Asia/Kolkata"),
});

export const OnboardingSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(30, "Name too long"),
  className: z.enum(["warrior", "scholar", "ranger", "merchant", "monk"]),
  avatar: z.string().min(1),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

// ---- Streak Schemas ----

export const CreateStreakSchema = z.object({
  name: z.string().min(1).max(100),
  stat: StatNameSchema,
});

export type CreateStreakInput = z.infer<typeof CreateStreakSchema>;

// ---- Money Jar Schemas ----

export const AddMoneyJarTransactionSchema = z.object({
  amount: z.number().min(0.01, "Amount must be positive"),
  reason: z.string().min(1).max(200),
});

export type AddMoneyJarTransactionInput = z.infer<typeof AddMoneyJarTransactionSchema>;

// ---- Pet Schemas ----

export const NamePetSchema = z.object({
  name: z.string().min(1, "Name required").max(20, "Too long"),
});

// ---- Settings Schemas ----

export const UpdateSettingsSchema = z.object({
  sound: z.boolean().optional(),
  currency: z.string().min(1).max(5).optional(),
  timezone: z.string().optional(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;

// ---- Task Schemas ----
export const TaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().max(1000).nullable().optional(),
  dueDate: z.union([z.string(), z.date()]).nullable().optional(),
  dueTime: z.string().max(20).nullable().optional(),
  priority: z.enum(["Low", "Medium", "High"]),
  category: z.string().max(50).nullable().optional(),
  repeat: z.enum(["None", "Daily", "Weekly", "Monthly"]),
  notes: z.string().max(1000).nullable().optional(),
});

export type TaskInput = z.infer<typeof TaskSchema>;
