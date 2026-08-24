"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPets() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return await prisma.pet.findMany({
    where: { userId: session.user.id },
    include: { stats: true }
  });
}

export async function equipPetAction(petId: string, equip: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // If equipping, unequip all others first
  if (equip) {
    await prisma.pet.updateMany({
      where: { userId: session.user.id, isEquipped: true },
      data: { isEquipped: false }
    });
  }

  await prisma.pet.update({
    where: { id: petId },
    data: { isEquipped: equip }
  });

  return { success: true };
}

export async function feedPetAction(petId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: { stats: true }
  });

  if (!pet || pet.userId !== session.user.id) throw new Error("Unauthorized");

  const stats = pet.stats;
  if (!stats) throw new Error("Pet stats missing");

  // Needs item logic ideally, but for now simple increment
  await prisma.petStats.update({
    where: { id: stats.id },
    data: { 
      hunger: Math.min(100, stats.hunger + 20),
      happiness: Math.min(100, stats.happiness + 5)
    }
  });

  return { success: true };
}
