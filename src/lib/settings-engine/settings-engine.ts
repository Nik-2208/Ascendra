import { prisma } from "@/lib/prisma";

export interface AppSettingsV2 {
  version: 2;
  theme: "dark" | "light" | "system";
  soundEnabled: boolean;
  pushEnabled: boolean;
  soundVolume: number; // 0 to 100
  musicVolume: number; // 0 to 100
  hapticFeedback: boolean;
  autoSync: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettingsV2 = {
  version: 2,
  theme: "dark",
  soundEnabled: true,
  pushEnabled: true,
  soundVolume: 80,
  musicVolume: 60,
  hapticFeedback: true,
  autoSync: true,
  reducedMotion: false
};

export class SettingsEngine {
  /**
   * Get validated, self-healed settings for a user
   */
  static async getSettings(userId: string): Promise<AppSettingsV2> {
    try {
      const record = await prisma.userSettings.findUnique({
        where: { userId }
      });

      if (!record) {
        await this.initDefaults(userId);
        return { ...DEFAULT_APP_SETTINGS };
      }

      // Check and heal missing fields
      const theme = record.theme === "light" || record.theme === "system" ? record.theme : "dark";
      const soundEnabled = typeof record.soundEnabled === "boolean" ? record.soundEnabled : true;
      const pushEnabled = typeof record.pushEnabled === "boolean" ? record.pushEnabled : true;

      return {
        version: 2,
        theme,
        soundEnabled,
        pushEnabled,
        soundVolume: 80,
        musicVolume: 60,
        hapticFeedback: true,
        autoSync: true,
        reducedMotion: false
      };
    } catch (err) {
      console.error(`[SettingsEngine] Error retrieving settings for user ${userId}:`, err);
      return { ...DEFAULT_APP_SETTINGS };
    }
  }

  /**
   * Update user settings with validation and self-healing
   */
  static async updateSettings(userId: string, updates: Partial<AppSettingsV2>): Promise<AppSettingsV2> {
    const current = await this.getSettings(userId);
    const merged: AppSettingsV2 = {
      ...current,
      ...updates,
      version: 2
    };

    await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        theme: merged.theme,
        soundEnabled: merged.soundEnabled,
        pushEnabled: merged.pushEnabled
      },
      update: {
        theme: merged.theme,
        soundEnabled: merged.soundEnabled,
        pushEnabled: merged.pushEnabled
      }
    });

    return merged;
  }

  /**
   * Initialize default settings record
   */
  static async initDefaults(userId: string) {
    await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        theme: "dark",
        soundEnabled: true,
        pushEnabled: true
      },
      update: {}
    });
  }
}
