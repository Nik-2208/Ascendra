import "server-only";
import { prisma } from "@/lib/prisma";
import { ActionResponse, successResponse, errorResponse } from "@/lib/actions-utils";

export class EconomyService {
  /**
   * Purchases an item from the shop.
   * Ensures the user has enough currency and safely deducts it in a transaction.
   */
  static async purchaseItem(userId: string, itemId: string): Promise<ActionResponse<unknown>> {
    try {
      const { WriteCoordinator } = await import("./write-coordinator");
      return await WriteCoordinator.enqueue(async () => {
        return await prisma.$transaction(async (tx) => {
        // 1. Fetch Item and User MoneyJar
        const item = await tx.item.findUnique({ where: { id: itemId } });
        if (!item) throw new Error("Item not found");

        const moneyJar = await tx.moneyJar.findUnique({ where: { userId } });
        if (!moneyJar) throw new Error("Money jar not initialized");

        // 2. Validate sufficient funds
        if (moneyJar.coins < item.value) {
          throw new Error("Insufficient coins");
        }

        // 3. Deduct Currency
        await tx.moneyJar.update({
          where: { id: moneyJar.id },
          data: { coins: { decrement: item.value } }
        });

        // 4. Add to Inventory
        let inventory = await tx.inventory.findUnique({ where: { userId } });
        if (!inventory) {
           inventory = await tx.inventory.create({ data: { userId } });
        }

        const existingInvItem = await tx.inventoryItem.findUnique({
          where: { inventoryId_itemId: { inventoryId: inventory.id, itemId: item.id } }
        });

        if (existingInvItem) {
          await tx.inventoryItem.update({
            where: { id: existingInvItem.id },
            data: { quantity: { increment: 1 } }
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              inventoryId: inventory.id,
              itemId: item.id,
              quantity: 1
            }
          });
        }

        // 5. Log Purchase and Transaction
        await tx.purchase.create({
          data: {
            userId,
            itemId: item.id,
            price: item.value,
            currency: "COIN"
          }
        });

        await tx.transaction.create({
          data: {
            userId,
            amount: item.value,
            type: "SPEND",
            source: `SHOP_PURCHASE:${itemId}`
          }
        });

        return successResponse({
          purchasedItem: item.name,
          cost: item.value,
          remainingCoins: moneyJar.coins - item.value
        });
      });
    });
  } catch (error) {
      return errorResponse((error as Error).message || "Failed to purchase item");
    }
  }
}
