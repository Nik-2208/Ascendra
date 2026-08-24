"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getInventory() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  let inventory = await prisma.inventory.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { item: true }
      }
    }
  });

  if (!inventory) {
    inventory = await prisma.inventory.create({
      data: { userId: session.user.id },
      include: {
        items: {
          include: { item: true }
        }
      }
    });
  }

  return inventory;
}

export async function equipItemAction(inventoryItemId: string, equip: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const invItem = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: { inventory: true, item: true }
  });

  if (!invItem || invItem.inventory.userId !== userId) {
    throw new Error("Item not found or unauthorized");
  }

  const result = await prisma.$transaction(async (tx) => {
    // If equipping a weapon or shield, unequip previous equipped items in same category
    if (equip) {
      const isWeapon = invItem.item.name.toLowerCase().includes("sword") || invItem.item.name.toLowerCase().includes("blade");
      const isShield = invItem.item.name.toLowerCase().includes("shield");
      
      const siblingEquipped = await tx.inventoryItem.findMany({
        where: { 
          inventoryId: invItem.inventoryId, 
          isEquipped: true,
          id: { not: inventoryItemId }
        },
        include: { item: true }
      });

      for (const sib of siblingEquipped) {
        const sibWeapon = sib.item.name.toLowerCase().includes("sword") || sib.item.name.toLowerCase().includes("blade");
        const sibShield = sib.item.name.toLowerCase().includes("shield");
        
        if ((isWeapon && sibWeapon) || (isShield && sibShield)) {
          // Unequip sibling first
          await tx.inventoryItem.update({
            where: { id: sib.id },
            data: { isEquipped: false }
          });
          // Decrement stats modifier
          const character = await tx.character.findUnique({
            where: { userId },
            include: { stats: true }
          });
          if (character?.stats) {
            await tx.characterStats.update({
              where: { characterId: character.id },
              data: {
                strength: sibWeapon ? { decrement: sib.item.value } : undefined,
                defense: sibShield ? { decrement: sib.item.value } : undefined
              }
            });
          }
        }
      }
    }

    await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { isEquipped: equip }
    });

    const character = await tx.character.findUnique({
      where: { userId },
      include: { stats: true }
    });

    if (character?.stats) {
      const modifier = equip ? invItem.item.value : -invItem.item.value;
      const isSword = invItem.item.name.toLowerCase().includes("sword") || invItem.item.name.toLowerCase().includes("blade");
      
      if (isSword) {
        await tx.characterStats.update({
          where: { characterId: character.id },
          data: { strength: { increment: modifier } }
        });
      } else {
        await tx.characterStats.update({
          where: { characterId: character.id },
          data: { defense: { increment: modifier } }
        });
      }
    }

    return { success: true };
  });

  return result;
}

export async function consumeItemAction(inventoryItemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const invItem = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: { inventory: true, item: true }
  });

  if (!invItem || invItem.inventory.userId !== userId) {
    throw new Error("Item not found or unauthorized");
  }

  if (invItem.item.type !== "CONSUMABLE") {
    throw new Error("This item cannot be consumed.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Reduce quantity
    if (invItem.quantity > 1) {
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: { decrement: 1 } }
      });
    } else {
      await tx.inventoryItem.delete({
        where: { id: inventoryItemId }
      });
    }

    // 2. Grant rewards/XP based on item
    const itemName = invItem.item.name.toLowerCase();
    let xpGranted = 0;
    let energyRestored = 0;
    let effectMessage = "";

    if (itemName.includes("energy")) {
      xpGranted = 50;
      energyRestored = 100;
      effectMessage = "Energy Restored & +50 XP";
    } else if (itemName.includes("elixir") || itemName.includes("focus")) {
      xpGranted = 150;
      effectMessage = "Focused Focus Multiplier Activated & +150 XP";
    } else {
      xpGranted = 30;
      effectMessage = "Tasted delightful! +30 XP";
    }

    const { LevelService } = await import("@/lib/services/level-service");
    await LevelService.awardXP(userId, xpGranted, tx);

    return { success: true, effectMessage, xpGranted, energyRestored };
  });

  return result;
}

export async function sellItemAction(inventoryItemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const invItem = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: { inventory: true, item: true }
  });

  if (!invItem || invItem.inventory.userId !== userId) {
    throw new Error("Item not found or unauthorized");
  }

  const sellPrice = Math.max(1, Math.floor(invItem.item.value / 2));

  const result = await prisma.$transaction(async (tx) => {
    // 1. Remove or decrement quantity
    if (invItem.quantity > 1) {
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: { decrement: 1 } }
      });
    } else {
      await tx.inventoryItem.delete({
        where: { id: inventoryItemId }
      });
    }

    // 2. Refund Gold
    await tx.moneyJar.update({
      where: { userId },
      data: { coins: { increment: sellPrice } }
    });

    return { success: true, sellPrice };
  });

  return result;
}

export async function openChestAction(inventoryItemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const invItem = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: { inventory: true, item: true }
  });

  if (!invItem || invItem.inventory.userId !== userId) {
    throw new Error("Item not found or unauthorized");
  }

  const itemName = invItem.item.name.toLowerCase();
  if (!itemName.includes("chest")) {
    throw new Error("This item is not a chest.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Consume the chest
    if (invItem.quantity > 1) {
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: { decrement: 1 } }
      });
    } else {
      await tx.inventoryItem.delete({
        where: { id: inventoryItemId }
      });
    }

    // 2. Calculate Loot Table rolls
    let goldReward = 0;
    let xpReward = 0;
    let spawnedItemName = "";
    let spawnedItemId = "";

    if (itemName.includes("wooden")) {
      goldReward = Math.floor(Math.random() * 50) + 20; // 20 - 70 GP
      xpReward = Math.floor(Math.random() * 30) + 10;   // 10 - 40 XP
      if (Math.random() < 0.2) {
        spawnedItemId = "consumable_energy_potion";
        spawnedItemName = "Consumable Energy Potion";
      }
    } else if (itemName.includes("golden") || itemName.includes("rare")) {
      goldReward = Math.floor(Math.random() * 200) + 100; // 100 - 300 GP
      xpReward = Math.floor(Math.random() * 100) + 50;   // 50 - 150 XP
      if (Math.random() < 0.35) {
        spawnedItemId = "wooden_practice_sword";
        spawnedItemName = "Wooden Practice Sword";
      }
    } else {
      // Epic/Legendary/Mythic chest
      goldReward = Math.floor(Math.random() * 1000) + 500; // 500 - 1500 GP
      xpReward = Math.floor(Math.random() * 500) + 200;   // 200 - 700 XP
      if (Math.random() < 0.5) {
        spawnedItemId = "iron_blade_of_productivity";
        spawnedItemName = "Iron Blade of Productivity";
      }
    }

    // 3. Grant gold and XP
    await tx.moneyJar.update({
      where: { userId },
      data: { coins: { increment: goldReward } }
    });

    const { LevelService } = await import("@/lib/services/level-service");
    await LevelService.awardXP(userId, xpReward, tx);

    // 4. Add spawned item to inventory if rolled
    if (spawnedItemId) {
      // Check if target item template exists in DB
      let itemTemplate = await tx.item.findUnique({ where: { id: spawnedItemId } });
      if (!itemTemplate) {
        itemTemplate = await tx.item.create({
          data: {
            id: spawnedItemId,
            name: spawnedItemName,
            description: "A mysterious treasure rolled from a chest.",
            type: spawnedItemId.includes("potion") ? "CONSUMABLE" : "EQUIPMENT",
            rarity: spawnedItemId.includes("blade") ? "Rare" : "Common",
            value: spawnedItemId.includes("blade") ? 250 : 50
          }
        });
      }

      const existingInvItem = await tx.inventoryItem.findFirst({
        where: { inventoryId: invItem.inventoryId, itemId: spawnedItemId }
      });

      if (existingInvItem) {
        await tx.inventoryItem.update({
          where: { id: existingInvItem.id },
          data: { quantity: { increment: 1 } }
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            inventoryId: invItem.inventoryId,
            itemId: spawnedItemId,
            quantity: 1
          }
        });
      }
    }

    return {
      success: true,
      goldReward,
      xpReward,
      spawnedItemName
    };
  });

  return result;
}
