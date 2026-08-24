import "server-only";
import { prisma } from "@/lib/prisma";

export type ChronicleType =
  | "GENERAL"
  | "QUEST"
  | "TASK"
  | "BOSS"
  | "BATTLE"
  | "WORLD"
  | "VILLAGE"
  | "BRAIN"
  | "CAMPAIGN"
  | "RESILIENCE"
  | "SETTINGS"
  | "ECONOMY"
  | "PURCHASE"
  | "ACHIEVEMENT"
  | "PET"
  | "MASTERY"
  | "LEVEL_UP"
  | "REWARD"
  | "SKILL"
  | "POMODORO"
  | "STOPWATCH"
  | "BACKUP"
  | "SYSTEM";

export class ChroniclesService {
  /**
   * Log a new chronicle entry for a user
   */
  static async createEntry(
    userId: string,
    type: ChronicleType | string,
    title: string,
    content: string
  ) {
    try {
      return await prisma.chronicle.create({
        data: {
          userId,
          type: type || "GENERAL",
          title,
          content,
        },
      });
    } catch (error) {
      console.error("[ChroniclesService] Error creating chronicle entry:", error);
      return null;
    }
  }

  /**
   * Get chronicle entries with pagination, search, category, and date filtering
   */
  static async getEntries(
    userId: string,
    options: {
      type?: string;
      search?: string;
      dateRange?: "all" | "today" | "week" | "month";
      page?: number;
      limit?: number;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (options.type && options.type !== "ALL") {
      where.type = options.type;
    }

    if (options.dateRange && options.dateRange !== "all") {
      const now = new Date();
      let startDate = new Date();
      if (options.dateRange === "today") {
        startDate.setHours(0, 0, 0, 0);
      } else if (options.dateRange === "week") {
        startDate.setDate(now.getDate() - 7);
      } else if (options.dateRange === "month") {
        startDate.setDate(now.getDate() - 30);
      }
      where.timestamp = { gte: startDate };
    }

    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: "insensitive" } },
        { content: { contains: options.search, mode: "insensitive" } },
        { type: { contains: options.search, mode: "insensitive" } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        prisma.chronicle.findMany({
          where,
          orderBy: { timestamp: "desc" },
          skip,
          take: limit,
        }),
        prisma.chronicle.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("[ChroniclesService] Error fetching chronicle entries:", error);
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  /**
   * Clears all chronicle history for a user
   */
  static async clearEntries(userId: string) {
    try {
      await prisma.chronicle.deleteMany({ where: { userId } });
      return true;
    } catch (error) {
      console.error("[ChroniclesService] Error clearing chronicle entries:", error);
      return false;
    }
  }
}
