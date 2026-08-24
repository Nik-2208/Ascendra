import "server-only";
import { prisma } from "@/lib/prisma";

export class NotificationService {
  /**
   * Centralized method to create database-persisted notifications
   */
  static async send(
    userId: string,
    title: string,
    message: string,
    type: string = "SYSTEM",
    tx: any = prisma
  ) {
    try {
      const notification = await tx.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          isRead: false
        }
      });

      // Evict paths globally to push updates to clients in real-time

      return notification;
    } catch (error) {
      console.error("[NotificationService] Failed to record notification:", error);
      return null;
    }
  }

  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  static async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }
}
