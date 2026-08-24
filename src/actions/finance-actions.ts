"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

async function requireAuth(userId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error("Unauthorized");
  }
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "General";
  if (trimmed.toUpperCase() === "UPI") return "UPI";
  // Title Case
  return trimmed
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const DEFAULT_WALLETS = ["Cash", "Bank", "UPI", "Credit Card", "Savings"];

const DEFAULT_CATEGORIES = [
  { name: "Food", type: "EXPENSE" },
  { name: "Transport", type: "EXPENSE" },
  { name: "Shopping", type: "EXPENSE" },
  { name: "Bills", type: "EXPENSE" },
  { name: "Entertainment", type: "EXPENSE" },
  { name: "Health", type: "EXPENSE" },
  { name: "Education", type: "EXPENSE" },
  { name: "Salary", type: "INCOME" },
  { name: "Investment", type: "INCOME" },
  { name: "Gift", type: "INCOME" },
  { name: "Travel", type: "EXPENSE" },
  { name: "Other", type: "EXPENSE" }
];

export async function getFinanceDataAction(userId: string) {
  await requireAuth(userId);
  try {
    // 1. Wallets
    let wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    });

    if (wallets.length === 0) {
      await prisma.wallet.createMany({
        data: DEFAULT_WALLETS.map(name => ({
          userId,
          name,
          balance: 0.0
        }))
      });
      wallets = await prisma.wallet.findMany({
        where: { userId },
        orderBy: { name: "asc" }
      });
    }

    // 2. Categories
    let personalCategories = await prisma.personalCategory.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    });

    if (personalCategories.length === 0) {
      await prisma.personalCategory.createMany({
        data: DEFAULT_CATEGORIES.map(cat => ({
          userId,
          name: cat.name,
          type: cat.type
        }))
      });
      personalCategories = await prisma.personalCategory.findMany({
        where: { userId },
        orderBy: { name: "asc" }
      });
    }

    // 3. Transactions
    const transactions = await prisma.personalTransaction.findMany({
      where: { userId },
      include: {
        wallet: true,
        toWallet: true,
        category: true
      },
      orderBy: { date: "desc" }
    });

    // 4. Budgets
    const budgets = await prisma.personalBudget.findMany({
      where: { userId },
      include: {
        category: true
      }
    });

    return {
      success: true,
      wallets,
      personalCategories,
      transactions,
      budgets
    };
  } catch (error) {
    console.error("Error in getFinanceDataAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function addTransactionAction(
  userId: string,
  data: {
    amount: number;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    categoryName?: string;
    note?: string;
    date?: string;
    walletName: string;
    toWalletName?: string;
  }
) {
  await requireAuth(userId);
  try {
    const schema = z.object({
      amount: z.number().positive("Amount must be positive"),
      type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
      categoryName: z.string().optional().nullable(),
      note: z.string().optional().nullable(),
      date: z.string().optional(),
      walletName: z.string().min(1, "Wallet name is required"),
      toWalletName: z.string().optional().nullable()
    });

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    const val = parsed.data;
    const txDate = val.date ? new Date(val.date) : new Date();

    const normWallet = normalizeName(val.walletName);
    const normToWallet = val.toWalletName ? normalizeName(val.toWalletName) : null;
    const normCategory = val.categoryName ? normalizeName(val.categoryName) : "Other";

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve source wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId_name: { userId, name: normWallet } }
      });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, name: normWallet, balance: 0.0 }
        });
      }

      // 2. Resolve destination wallet (if transfer)
      let toWallet = null;
      if (val.type === "TRANSFER") {
        if (!normToWallet) throw new Error("Destination wallet name required for transfers");
        toWallet = await tx.wallet.findUnique({
          where: { userId_name: { userId, name: normToWallet } }
        });
        if (!toWallet) {
          toWallet = await tx.wallet.create({
            data: { userId, name: normToWallet, balance: 0.0 }
          });
        }
      }

      // 3. Resolve category (if not transfer)
      let category = null;
      if (val.type !== "TRANSFER") {
        const catType = val.type === "INCOME" ? "INCOME" : "EXPENSE";
        category = await tx.personalCategory.findUnique({
          where: { userId_name_type: { userId, name: normCategory, type: catType } }
        });
        if (!category) {
          category = await tx.personalCategory.create({
            data: { userId, name: normCategory, type: catType }
          });
        }
      }

      // 4. Create transaction
      const transaction = await tx.personalTransaction.create({
        data: {
          userId,
          amount: val.amount,
          type: val.type,
          categoryId: category ? category.id : null,
          note: val.note || null,
          date: txDate,
          walletId: wallet.id,
          toWalletId: toWallet ? toWallet.id : null
        }
      });

      // 5. Update balances
      if (val.type === "INCOME") {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: val.amount } }
        });
      } else if (val.type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: val.amount } }
        });
      } else if (val.type === "TRANSFER" && toWallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: val.amount } }
        });
        await tx.wallet.update({
          where: { id: toWallet.id },
          data: { balance: { increment: val.amount } }
        });
      }

      return transaction;
    });

    revalidatePath("/money-jar");
    return { success: true, transaction: result };
  } catch (error) {
    console.error("Error in addTransactionAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function editTransactionAction(
  userId: string,
  transactionId: string,
  data: {
    amount: number;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    categoryName?: string;
    note?: string;
    date?: string;
    walletName: string;
    toWalletName?: string;
  }
) {
  await requireAuth(userId);
  try {
    const schema = z.object({
      amount: z.number().positive("Amount must be positive"),
      type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
      categoryName: z.string().optional().nullable(),
      note: z.string().optional().nullable(),
      date: z.string().optional(),
      walletName: z.string().min(1, "Wallet name is required"),
      toWalletName: z.string().optional().nullable()
    });

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    const val = parsed.data;
    const normWallet = normalizeName(val.walletName);
    const normToWallet = val.toWalletName ? normalizeName(val.toWalletName) : null;
    const normCategory = val.categoryName ? normalizeName(val.categoryName) : "Other";

    const result = await prisma.$transaction(async (tx) => {
      const existingTx = await tx.personalTransaction.findUnique({
        where: { id: transactionId }
      });
      if (!existingTx || existingTx.userId !== userId) {
        throw new Error("Transaction not found");
      }

      // 1. REVERSE old transaction effects
      if (existingTx.type === "INCOME") {
        await tx.wallet.update({
          where: { id: existingTx.walletId },
          data: { balance: { decrement: existingTx.amount } }
        });
      } else if (existingTx.type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: existingTx.walletId },
          data: { balance: { increment: existingTx.amount } }
        });
      } else if (existingTx.type === "TRANSFER") {
        await tx.wallet.update({
          where: { id: existingTx.walletId },
          data: { balance: { increment: existingTx.amount } }
        });
        if (existingTx.toWalletId) {
          await tx.wallet.update({
            where: { id: existingTx.toWalletId },
            data: { balance: { decrement: existingTx.amount } }
          });
        }
      }

      // 2. RESOLVE new Wallet & Category by Name
      let wallet = await tx.wallet.findUnique({
        where: { userId_name: { userId, name: normWallet } }
      });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, name: normWallet, balance: 0.0 }
        });
      }

      let toWallet = null;
      if (val.type === "TRANSFER") {
        if (!normToWallet) throw new Error("Destination wallet name required for transfers");
        toWallet = await tx.wallet.findUnique({
          where: { userId_name: { userId, name: normToWallet } }
        });
        if (!toWallet) {
          toWallet = await tx.wallet.create({
            data: { userId, name: normToWallet, balance: 0.0 }
          });
        }
      }

      let category = null;
      if (val.type !== "TRANSFER") {
        const catType = val.type === "INCOME" ? "INCOME" : "EXPENSE";
        category = await tx.personalCategory.findUnique({
          where: { userId_name_type: { userId, name: normCategory, type: catType } }
        });
        if (!category) {
          category = await tx.personalCategory.create({
            data: { userId, name: normCategory, type: catType }
          });
        }
      }

      // 3. APPLY new transaction effects
      if (val.type === "INCOME") {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: val.amount } }
        });
      } else if (val.type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: val.amount } }
        });
      } else if (val.type === "TRANSFER" && toWallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: val.amount } }
        });
        await tx.wallet.update({
          where: { id: toWallet.id },
          data: { balance: { increment: val.amount } }
        });
      }

      // 4. UPDATE transaction record
      const updated = await tx.personalTransaction.update({
        where: { id: transactionId },
        data: {
          amount: val.amount,
          type: val.type,
          categoryId: category ? category.id : null,
          note: val.note || null,
          date: val.date ? new Date(val.date) : existingTx.date,
          walletId: wallet.id,
          toWalletId: toWallet ? toWallet.id : null
        }
      });

      return updated;
    });

    revalidatePath("/money-jar");
    return { success: true, transaction: result };
  } catch (error) {
    console.error("Error in editTransactionAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteTransactionAction(userId: string, transactionId: string) {
  await requireAuth(userId);
  try {
    await prisma.$transaction(async (tx) => {
      const existingTx = await tx.personalTransaction.findUnique({
        where: { id: transactionId }
      });
      if (!existingTx || existingTx.userId !== userId) {
        throw new Error("Transaction not found");
      }

      // Reverse balance effects
      if (existingTx.type === "INCOME") {
        await tx.wallet.update({
          where: { id: existingTx.walletId },
          data: { balance: { decrement: existingTx.amount } }
        });
      } else if (existingTx.type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: existingTx.walletId },
          data: { balance: { increment: existingTx.amount } }
        });
      } else if (existingTx.type === "TRANSFER") {
        await tx.wallet.update({
          where: { id: existingTx.walletId },
          data: { balance: { increment: existingTx.amount } }
        });
        if (existingTx.toWalletId) {
          await tx.wallet.update({
            where: { id: existingTx.toWalletId },
            data: { balance: { decrement: existingTx.amount } }
          });
        }
      }

      // Delete record
      await tx.personalTransaction.delete({
        where: { id: transactionId }
      });
    });

    revalidatePath("/money-jar");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteTransactionAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateBudgetAction(
  userId: string,
  categoryName: string,
  amount: number,
  month: number,
  year: number
) {
  await requireAuth(userId);
  try {
    const schema = z.object({
      categoryName: z.string().min(1, "Category is required"),
      amount: z.number().nonnegative("Budget must be positive"),
      month: z.number().min(1).max(12),
      year: z.number().min(2000).max(2100)
    });

    const parsed = schema.safeParse({ categoryName, amount, month, year });
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    const normCategoryName = normalizeName(categoryName);

    const result = await prisma.$transaction(async (tx) => {
      // Find or create category
      let category = await tx.personalCategory.findUnique({
        where: { userId_name_type: { userId, name: normCategoryName, type: "EXPENSE" } }
      });
      if (!category) {
        category = await tx.personalCategory.create({
          data: { userId, name: normCategoryName, type: "EXPENSE" }
        });
      }

      // Upsert budget limit
      const budget = await tx.personalBudget.upsert({
        where: {
          userId_categoryId_month_year: {
            userId,
            categoryId: category.id,
            month,
            year
          }
        },
        create: {
          userId,
          categoryId: category.id,
          amount,
          month,
          year
        },
        update: {
          amount
        }
      });

      return budget;
    });

    revalidatePath("/money-jar");
    return { success: true, budget: result };
  } catch (error) {
    console.error("Error in updateBudgetAction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function addPersonalCategoryAction(
  userId: string,
  name: string,
  type: "INCOME" | "EXPENSE"
) {
  await requireAuth(userId);
  try {
    const schema = z.object({
      name: z.string().min(1, "Category name is required"),
      type: z.enum(["INCOME", "EXPENSE"])
    });

    const parsed = schema.safeParse({ name, type });
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    const normCategory = normalizeName(name);

    const category = await prisma.personalCategory.create({
      data: {
        userId,
        name: normCategory,
        type: parsed.data.type
      }
    });

    revalidatePath("/money-jar");
    return { success: true, category };
  } catch (error) {
    console.error("Error in addPersonalCategoryAction:", error);
    return { success: false, error: (error as Error).message };
  }
}
