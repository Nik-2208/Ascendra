"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BossService, getRandomTask } from "@/lib/services/boss-service";
import { revalidatePath } from "next/cache";

const SEED_BOSSES = [
  { id: "boss_dummy", name: "Training Dummy", description: "A simple wooden dummy in the village. Perfect for practice.", hp: 150, maxHp: 150, damage: 10, defense: 5, levelReq: 1, imageUrl: "/bosses/behemoth.png" },
  { id: "boss_plague", name: "Plague Beast", description: "A toxic mutant terrorizing the Health Kingdom.", hp: 250, maxHp: 250, damage: 20, defense: 10, levelReq: 3, imageUrl: "/bosses/titan.png" },
  { id: "boss_hydra", name: "Distraction Hydra", description: "A multi-headed beast growing new distractions for every head cut.", hp: 400, maxHp: 400, damage: 25, defense: 12, levelReq: 5, imageUrl: "/bosses/hydra.png" },
  { id: "boss_colossus", name: "Iron Colossus", description: "A giant metal golem challenging your strength in the arena.", hp: 650, maxHp: 650, damage: 45, defense: 25, levelReq: 8, imageUrl: "/bosses/golem.png" },
  { id: "boss_phantom", name: "Archivist Phantom", description: "A ghostly librarian protecting ancient forgotten secrets.", hp: 900, maxHp: 900, damage: 50, defense: 28, levelReq: 11, imageUrl: "/bosses/shade.png" },
  { id: "boss_titan", name: "Corporate Titan", description: "A towering figure representing stress and career burnout.", hp: 1250, maxHp: 1250, damage: 60, defense: 35, levelReq: 14, imageUrl: "/bosses/dragon.png" },
  { id: "boss_muse", name: "Chaos Muse", description: "A chaotic entity disrupting the creative flow of the forest.", hp: 1700, maxHp: 1700, damage: 70, defense: 40, levelReq: 17, imageUrl: "/bosses/block.png" },
  { id: "boss_wyrm", name: "Golden Wyrm", description: "A massive dragon hoarded with coins, testing your financial wisdom.", hp: 2200, maxHp: 2200, damage: 120, defense: 70, levelReq: 20, imageUrl: "/bosses/leviathan.png" },
  { id: "boss_diplomat", name: "Shadow Diplomat", description: "A mysterious figure trying to isolate the islands.", hp: 2800, maxHp: 2800, damage: 150, defense: 85, levelReq: 24, imageUrl: "/bosses/wraith.png" },
  { id: "boss_mastery", name: "Chronos", description: "The ultimate representation of your bad habits and past limitations.", hp: 4000, maxHp: 4000, damage: 300, defense: 180, levelReq: 30, imageUrl: "/bosses/former_self.png" }
];

export async function ensureBossesSeeded() {
  for (const b of SEED_BOSSES) {
    await prisma.boss.upsert({
      where: { id: b.id },
      create: b,
      update: b
    });
  }
}

export async function getScaledBossStats(boss: any, heroLevel: number) {
  return BossService.getScaledBossStats(boss, heroLevel);
}

async function resolveCharacterAndStats(userId: string) {
  let character = await prisma.character.findUnique({
    where: { userId },
    include: { stats: true }
  });

  if (!character) {
    character = await prisma.character.create({
      data: {
        userId,
        name: "Hero",
        class: "Novice",
        level: 1,
        xp: 0,
        stats: {
          create: {
            hp: 100, maxHp: 100, strength: 10, defense: 10,
            intelligence: 10, agility: 10, luck: 10
          }
        }
      },
      include: { stats: true }
    });
  } else if (!character.stats) {
    await prisma.characterStats.create({
      data: {
        characterId: character.id,
        hp: 100, maxHp: 100, strength: 10, defense: 10,
        intelligence: 10, agility: 10, luck: 10
      }
    });
    character = await prisma.character.findUnique({
      where: { userId },
      include: { stats: true }
    }) as any;
  }

  const moneyJar = await prisma.moneyJar.findUnique({ where: { userId } });
  if (!moneyJar) {
    await prisma.moneyJar.create({ data: { userId, coins: 100 } });
  }

  const inventory = await prisma.inventory.findUnique({ where: { userId } });
  if (!inventory) {
    await prisma.inventory.create({ data: { userId } });
  }

  return character;
}

export async function getActiveBoss(overrideBossId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", boss: null, bossProgress: null };
  }
  const userId = session.user.id;
  if (!userId) {
    return { error: "Unauthorized", boss: null, bossProgress: null };
  }

  await ensureBossesSeeded();

  return await BossService.getActiveBoss(userId, overrideBossId);
}

export async function attackBossAction(bossId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  await ensureBossesSeeded();

  const character = await resolveCharacterAndStats(userId);
  if (!character) throw new Error("Character not found");

  const combatRes = await BossService.attackBoss(userId, bossId, character.stats!.strength);

  try {
    const { QuestEngine } = await import("@/lib/services/quest-engine");
    await QuestEngine.emit({ userId, type: "BOSS_DAMAGE", value: combatRes.damageDealt });
    if (combatRes.isDefeated) {
      await QuestEngine.emit({ userId, type: "BOSS_VICTORY", value: 1 });
    }
  } catch (qErr) {
    console.error("QuestEngine event emission error on boss attack:", qErr);
  }

  return {
    success: combatRes.success,
    damageDealt: combatRes.damageDealt,
    bossHp: combatRes.bossHp,
    isDefeated: combatRes.isDefeated,
    isCrit: combatRes.isCrit,
    isDodge: combatRes.isDodge,
    levelUp: !!combatRes.rewards,
    newLevel: character.level
  };
}

export async function completeBossTaskAction(taskId: string, bossId: string, difficulty: "EASY" | "MEDIUM" | "HARD") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const result = await BossService.completeBossTask(userId, difficulty, taskId);
  const activeBossRes = await getActiveBoss();

  return {
    success: true,
    damageDealt: result.damageDealt,
    bossState: activeBossRes,
    newTask: result.newTask,
    coinsAwarded: (result as any).coinsAwarded,
    xpAwarded: (result as any).xpAwarded
  };
}

export async function toggleBossChallengeAction(bossId: string, enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  await BossService.toggleBossChallenge(userId, bossId, enabled);
  
  revalidatePath("/");
  revalidatePath("/life-map");
  revalidatePath("/urge-battle");
  revalidatePath("/boss-arena");

  return { success: true };
}

export async function fleeBossAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const result = await BossService.fleeBattle(userId);

  revalidatePath("/");
  revalidatePath("/life-map");
  revalidatePath("/urge-battle");
  revalidatePath("/boss-arena");

  return result;
}

export async function generateBossTasksAction(bossId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  await BossService.toggleBossChallenge(userId, bossId, true);
  await BossService.regenerateBossTasks(userId, bossId);

  revalidatePath("/");
  revalidatePath("/life-map");
  revalidatePath("/urge-battle");
  revalidatePath("/boss-arena");

  return { success: true };
}

export async function regenerateBossTasksAction(bossId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  await BossService.regenerateBossTasks(userId, bossId);

  revalidatePath("/");
  revalidatePath("/life-map");
  revalidatePath("/urge-battle");
  revalidatePath("/boss-arena");

  return { success: true };
}
