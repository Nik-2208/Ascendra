"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EconomyService } from "@/lib/services/economy-service";
import { ItemType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Rich item definitions to seed if the shop is empty
// Rich item definitions to seed if the shop is empty (5x rebalanced economy)
const SHOP_SEED_ITEMS = [
  { name: "Wooden Sword", description: "A basic training sword.", type: ItemType.EQUIPMENT, rarity: "Common", value: 250 },
  { name: "Iron Blade", description: "A sturdy sword for adventurers.", type: ItemType.EQUIPMENT, rarity: "Uncommon", value: 750 },
  { name: "Steel Broadsword", description: "A heavy, deadly weapon.", type: ItemType.EQUIPMENT, rarity: "Rare", value: 2250 },
  { name: "Leather Shield", description: "Provides basic defense.", type: ItemType.EQUIPMENT, rarity: "Common", value: 200 },
  { name: "Iron Kite Shield", description: "A reliable shield.", type: ItemType.EQUIPMENT, rarity: "Uncommon", value: 700 },
  { name: "Minor Health Potion", description: "Restores 25 HP.", type: ItemType.CONSUMABLE, rarity: "Common", value: 100 },
  { name: "Major Health Potion", description: "Restores 100 HP.", type: ItemType.CONSUMABLE, rarity: "Uncommon", value: 375 },
  { name: "Elixir of Strength", description: "Temporarily boosts strength.", type: ItemType.CONSUMABLE, rarity: "Rare", value: 600 },
  { name: "Iron Ore", description: "Useful for crafting.", type: ItemType.MATERIAL, rarity: "Common", value: 50 },
  { name: "Gold Ore", description: "A rare and valuable material.", type: ItemType.MATERIAL, rarity: "Uncommon", value: 250 },
  { name: "Dragon Scale", description: "An incredibly rare crafting component.", type: ItemType.MATERIAL, rarity: "Epic", value: 2500 },
  { name: "Wooden Chest", description: "Contains random common loot.", type: ItemType.CONSUMABLE, rarity: "Common", value: 500 },
  { name: "Golden Chest", description: "Contains rare loot.", type: ItemType.CONSUMABLE, rarity: "Rare", value: 1500 },
  { name: "Legendary Chest", description: "Contains epic and legendary items.", type: ItemType.CONSUMABLE, rarity: "Epic", value: 5000 },
  { name: "Iron Key", description: "Opens common locked chests.", type: ItemType.MATERIAL, rarity: "Common", value: 125 },
  { name: "Golden Key", description: "Opens golden chests.", type: ItemType.MATERIAL, rarity: "Rare", value: 500 },
  { name: "Adventurer's Cloak", description: "A stylish cosmetic cloak.", type: ItemType.COSMETIC, rarity: "Uncommon", value: 1250 },
  { name: "Crown of the King", description: "A majestic cosmetic crown.", type: ItemType.COSMETIC, rarity: "Legendary", value: 25000 },
  { name: "Ring of Focus", description: "Boosts XP from Pomodoro sessions.", type: ItemType.EQUIPMENT, rarity: "Epic", value: 6000 },
  { name: "Boots of Swiftness", description: "Increases agility.", type: ItemType.EQUIPMENT, rarity: "Rare", value: 3000 }
];

export async function getShopItems() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // 1. Seed items if none exist
  const count = await prisma.item.count();
  if (count === 0) {
    for (const item of SHOP_SEED_ITEMS) {
      await prisma.item.create({ data: item });
    }
  } else {
    // Auto-migrate existing items if seeded prior to 5x rebalance
    for (const seedItem of SHOP_SEED_ITEMS) {
      const existing = await prisma.item.findFirst({ where: { name: seedItem.name } });
      if (existing && existing.value < seedItem.value) {
        await prisma.item.update({
          where: { id: existing.id },
          data: { value: seedItem.value }
        });
      }
    }
  }

  // 2. Fetch all items
  const allItems = await prisma.item.findMany({
    orderBy: { value: 'asc' }
  });

  // 3. Load or generate user-specific shop rotation
  let shopState = await prisma.shopState.findUnique({
    where: { userId }
  });

  const now = new Date();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const shouldRefresh = !shopState || (now.getTime() - shopState.lastRefreshed.getTime() >= ONE_DAY);

  if (shouldRefresh) {
    // Prevent duplicate refreshes using a random seed or transaction
    const shuffled = [...allItems];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedIds = shuffled.slice(0, 8).map(item => item.id).join(",");

    shopState = await prisma.shopState.upsert({
      where: { userId },
      create: {
        userId,
        lastRefreshed: now,
        itemIds: selectedIds
      },
      update: {
        lastRefreshed: now,
        itemIds: selectedIds
      }
    });
  }

  if (!shopState) throw new Error("Failed to initialize shop state.");

  const activeIds = shopState.itemIds.split(",");
  const shopItems = allItems.filter(item => activeIds.includes(item.id));
  
  return {
    items: shopItems,
    lastRefreshed: shopState.lastRefreshed.toISOString(),
    nextRefreshAt: new Date(shopState.lastRefreshed.getTime() + ONE_DAY).toISOString()
  };
}

export async function forceRefreshShopAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Fetch all items
  const allItems = await prisma.item.findMany({
    orderBy: { value: 'asc' }
  });

  const shuffled = [...allItems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selectedIds = shuffled.slice(0, 8).map(item => item.id).join(",");

  const now = new Date();
  await prisma.shopState.upsert({
    where: { userId },
    create: {
      userId,
      lastRefreshed: now,
      itemIds: selectedIds
    },
    update: {
      lastRefreshed: now,
      itemIds: selectedIds
    }
  });

  revalidatePath("/shop");
  return { success: true };
}

export async function purchaseItemAction(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const response = await EconomyService.purchaseItem(userId, itemId);
  
  if (response.success) {
    try {
      const { QuestEngine } = await import("@/lib/services/quest-engine");
      await QuestEngine.emit({ userId, type: "MERCHANT_PURCHASE", value: 1 });
    } catch (qErr) {
      console.error("QuestEngine event emission error on merchant purchase:", qErr);
    }
    revalidatePath("/shop");
    revalidatePath("/inventory");
  }

  return response;
}
