import "server-only";
import { prisma } from "@/lib/prisma";

export class BackupService {
  /**
   * Safely serializes data including Date, Map, Set, BigInt, and Decimal.
   */
  private static serialize(data: any): string {
    return JSON.stringify(data, (key, value) => {
      if (value instanceof Map) {
        return { _type: "Map", value: Array.from(value.entries()) };
      }
      if (value instanceof Set) {
        return { _type: "Set", value: Array.from(value.values()) };
      }
      if (typeof value === "bigint") {
        return { _type: "BigInt", value: value.toString() };
      }
      return value;
    });
  }

  /**
   * Safely deserializes data including Date, Map, Set, BigInt.
   */
  private static deserialize(jsonStr: string): any {
    return JSON.parse(jsonStr, (key, value) => {
      if (value && typeof value === "object" && value._type) {
        if (value._type === "Map") return new Map(value.value);
        if (value._type === "Set") return new Set(value.value);
        if (value._type === "BigInt") return BigInt(value.value);
      }
      // Check if string matches ISO Date format
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
        return new Date(value);
      }
      return value;
    });
  }

  /**
   * Safely calls findMany on a dynamic model name, catching undefined objects gracefully.
   */
  private static async safeFindMany(modelName: string, query: any): Promise<any[]> {
    try {
      const model = (prisma as any)[modelName];
      if (model && typeof model.findMany === "function") {
        return await model.findMany(query);
      }
      console.warn(`[BackupService] Model "${modelName}" not found or findMany is not a function. Skipping.`);
      return [];
    } catch (e) {
      console.error(`[BackupService] Failed to query model "${modelName}":`, e);
      return [];
    }
  }

  /**
   * Safely calls findUnique on a dynamic model name, catching undefined objects gracefully.
   */
  private static async safeFindUnique(modelName: string, query: any): Promise<any | null> {
    try {
      const model = (prisma as any)[modelName];
      if (model && typeof model.findUnique === "function") {
        return await model.findUnique(query);
      }
      console.warn(`[BackupService] Model "${modelName}" not found or findUnique is not a function. Skipping.`);
      return null;
    } catch (e) {
      console.error(`[BackupService] Failed to query model "${modelName}":`, e);
      return null;
    }
  }

  /**
   * Exports all user progress as one comprehensive JSON string.
   */
  static async exportBackup(userId: string): Promise<string> {
    const [
      settings,
      character,
      quests,
      questProgresses,
      bossProgress,
      inventory,
      moneyJar,
      transactions,
      wallets,
      personalCategories,
      personalTransactions,
      personalBudgets,
      purchases,
      pets,
      achievements,
      streaks,
      schedules,
      seasonPasses,
      insights,
      conversations,
      notifications,
      analytics,
      tasks,
      focusSessions,
      chronicles,
      shopState,
      masteries,
      worldRegions
    ] = await Promise.all([
      this.safeFindUnique("userSettings", { where: { userId } }),
      this.safeFindUnique("character", {
        where: { userId },
        include: { stats: true, skills: true }
      }),
      this.safeFindMany("quest", { where: { creatorId: userId } }),
      this.safeFindMany("questProgress", { where: { userId } }),
      this.safeFindUnique("bossProgress", { where: { userId } }),
      this.safeFindUnique("inventory", {
        where: { userId },
        include: { items: true }
      }),
      this.safeFindUnique("moneyJar", { where: { userId } }),
      this.safeFindMany("transaction", { where: { userId } }),
      this.safeFindMany("wallet", { where: { userId } }),
      this.safeFindMany("personalCategory", { where: { userId } }),
      this.safeFindMany("personalTransaction", { where: { userId } }),
      this.safeFindMany("personalBudget", { where: { userId } }),
      this.safeFindMany("purchase", { where: { userId } }),
      this.safeFindMany("pet", {
        where: { userId },
        include: { stats: true }
      }),
      this.safeFindMany("achievementProgress", { where: { userId } }),
      this.safeFindMany("streak", { where: { userId } }),
      this.safeFindMany("schedule", {
        where: { userId },
        include: { events: true }
      }),
      this.safeFindMany("seasonPass", { where: { userId } }),
      // Handle potential casing mismatches (e.g. aIInsight vs aiInsight)
      this.safeFindMany("aIInsight", { where: { userId } }).then(res => res.length ? res : this.safeFindMany("aiInsight", { where: { userId } })),
      this.safeFindMany("aIConversation", { where: { userId } }).then(res => res.length ? res : this.safeFindMany("aiConversation", { where: { userId } })),
      this.safeFindMany("notification", { where: { userId } }),
      this.safeFindMany("analyticsEvent", { where: { userId } }),
      this.safeFindMany("task", { where: { userId } }),
      this.safeFindMany("focusSession", { where: { userId } }),
      this.safeFindMany("chronicle", { where: { userId } }),
      this.safeFindUnique("shopState", { where: { userId } }),
      this.safeFindMany("skillMastery", { where: { userId } }),
      this.safeFindMany("worldRegion", { where: { userId } })
    ]);

    const payload = {
      schemaVersion: "2.0.0",
      timestamp: new Date().toISOString(),
      userId,
      settings,
      character,
      quests,
      questProgresses,
      bossProgress,
      inventory,
      moneyJar,
      transactions,
      wallets,
      personalCategories,
      personalTransactions,
      personalBudgets,
      purchases,
      pets,
      achievements,
      streaks,
      schedules,
      seasonPasses,
      insights,
      conversations,
      notifications,
      analytics,
      tasks,
      focusSessions,
      chronicles,
      shopState,
      masteries,
      worldRegions
    };

    return this.serialize(payload);
  }

  /**
   * Validates and restores user state atomically from an exported string.
   */
  static async importBackup(userId: string, backupStr: string): Promise<boolean> {
    try {
      let payload: any;
      if (backupStr.trim().startsWith("{")) {
        payload = this.deserialize(backupStr);
      } else {
        // Fallback for version 1.0.0 Base64 XOR format
        const xorJson = Buffer.from(backupStr, "base64").toString("binary");
        const key = "AscendraBackupSecret";
        let rawJson = "";
        for (let i = 0; i < xorJson.length; i++) {
          rawJson += String.fromCharCode(xorJson.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        payload = JSON.parse(rawJson);
        payload.schemaVersion = "1.0.0";
      }

      if (!payload || (!payload.schemaVersion && !payload.version)) throw new Error("Invalid backup format");

      await prisma.$transaction(async (tx) => {
        // Safe delete runner
        const safeDelete = async (modelName: string, query: any) => {
          const model = (tx as any)[modelName];
          if (model && typeof model.deleteMany === "function") {
            await model.deleteMany(query);
          }
        };

        // 1. Delete all current tables relating to this user safely
        await safeDelete("skill", { where: { character: { userId } } });
        await safeDelete("characterStats", { where: { character: { userId } } });
        await safeDelete("character", { where: { userId } });
        await safeDelete("questProgress", { where: { userId } });
        await safeDelete("quest", { where: { creatorId: userId } });
        await safeDelete("bossProgress", { where: { userId } });
        await safeDelete("inventoryItem", { where: { inventory: { userId } } });
        await safeDelete("inventory", { where: { userId } });
        await safeDelete("transaction", { where: { userId } });
        await safeDelete("personalBudget", { where: { userId } });
        await safeDelete("personalTransaction", { where: { userId } });
        await safeDelete("personalCategory", { where: { userId } });
        await safeDelete("wallet", { where: { userId } });
        await safeDelete("purchase", { where: { userId } });
        await safeDelete("petStats", { where: { pet: { userId } } });
        await safeDelete("pet", { where: { userId } });
        await safeDelete("achievementProgress", { where: { userId } });
        await safeDelete("streak", { where: { userId } });
        await safeDelete("calendarEvent", { where: { schedule: { userId } } });
        await safeDelete("schedule", { where: { userId } });
        await safeDelete("seasonPass", { where: { userId } });
        
        await safeDelete("aIInsight", { where: { userId } });
        await safeDelete("aiInsight", { where: { userId } });
        await safeDelete("aIConversation", { where: { userId } });
        await safeDelete("aiConversation", { where: { userId } });
        
        await safeDelete("notification", { where: { userId } });
        await safeDelete("analyticsEvent", { where: { userId } });
        await safeDelete("task", { where: { userId } });
        await safeDelete("focusSession", { where: { userId } });
        await safeDelete("chronicle", { where: { userId } });
        await safeDelete("shopState", { where: { userId } });
        await safeDelete("skillMastery", { where: { userId } });
        await safeDelete("worldRegion", { where: { userId } });
        await safeDelete("userSettings", { where: { userId } });
        await safeDelete("moneyJar", { where: { userId } });

        // Helper to check if model exists for creation
        const hasModel = (name: string) => {
          return (tx as any)[name] !== undefined;
        };

        // 2. Rebuild Settings
        if (payload.settings && hasModel("userSettings")) {
          await tx.userSettings.create({
            data: {
              userId,
              theme: payload.settings.theme || "dark",
              soundEnabled: payload.settings.soundEnabled ?? true,
              pushEnabled: payload.settings.pushEnabled ?? true
            }
          });
        }

        // 3. Rebuild Character & Stats
        if (payload.character && hasModel("character")) {
          const char = await tx.character.create({
            data: {
              userId,
              name: payload.character.name,
              class: payload.character.class,
              level: payload.character.level,
              xp: payload.character.xp,
              prestige: payload.character.prestige || 0,
              villageLevel: payload.character.villageLevel || 1,
              villageHealth: payload.character.villageHealth ?? 100,
              rebirths: payload.character.rebirths || 0,
              buildings: payload.character.buildings
            }
          });

          if (payload.character.stats && hasModel("characterStats")) {
            await tx.characterStats.create({
              data: {
                characterId: char.id,
                hp: payload.character.stats.hp,
                maxHp: payload.character.stats.maxHp,
                strength: payload.character.stats.strength,
                defense: payload.character.stats.defense,
                intelligence: payload.character.stats.intelligence,
                agility: payload.character.stats.agility,
                luck: payload.character.stats.luck
              }
            });
          }

          // Rebuild Skills
          if (Array.isArray(payload.character.skills) && hasModel("skill")) {
            for (const sk of payload.character.skills) {
              await tx.skill.create({
                data: {
                  characterId: char.id,
                  skillNodeId: sk.skillNodeId,
                  level: sk.level || 1
                }
              });
            }
          }
        }

        // 4. Money Jar
        if (payload.moneyJar && hasModel("moneyJar")) {
          await tx.moneyJar.create({
            data: {
              userId,
              coins: payload.moneyJar.coins || 0,
              gems: payload.moneyJar.gems || 0,
              vaultCoins: payload.moneyJar.vaultCoins || 0,
              vaultHighest: payload.moneyJar.vaultHighest || 0,
              realMoneySaved: payload.moneyJar.realMoneySaved || 0,
              realMoneyGoal: payload.moneyJar.realMoneyGoal || 10000,
              currency: payload.moneyJar.currency || "USD"
            }
          });
        }

        // 5. Wallets & Transactions
        if (Array.isArray(payload.wallets) && hasModel("wallet")) {
          for (const w of payload.wallets) {
            await tx.wallet.create({
              data: {
                userId,
                name: w.name,
                balance: w.balance || 0.0
              }
            });
          }
        }

        if (Array.isArray(payload.personalCategories) && hasModel("personalCategory")) {
          for (const c of payload.personalCategories) {
            await tx.personalCategory.create({
              data: {
                userId,
                name: c.name,
                type: c.type
              }
            });
          }
        }

        // Map Category IDs for transactions
        const dbCategories = hasModel("personalCategory") ? await tx.personalCategory.findMany({ where: { userId } }) : [];
        const categoryMap = new Map(dbCategories.map(c => [`${c.name}-${c.type}`, c.id]));

        const dbWallets = hasModel("wallet") ? await tx.wallet.findMany({ where: { userId } }) : [];
        const walletMap = new Map(dbWallets.map(w => [w.name, w.id]));

        if (Array.isArray(payload.personalTransactions) && hasModel("personalTransaction")) {
          for (const pt of payload.personalTransactions) {
            const catKey = pt.category ? `${pt.category.name}-${pt.category.type}` : null;
            const categoryId = catKey ? categoryMap.get(catKey) : null;
            const walletId = walletMap.get(pt.wallet?.name) || "";
            const toWalletId = pt.toWallet ? walletMap.get(pt.toWallet.name) : null;

            if (walletId) {
              await tx.personalTransaction.create({
                data: {
                  userId,
                  amount: pt.amount,
                  type: pt.type,
                  categoryId,
                  note: pt.note,
                  date: pt.date ? new Date(pt.date) : new Date(),
                  walletId,
                  toWalletId
                }
              });
            }
          }
        }

        if (Array.isArray(payload.personalBudgets) && hasModel("personalBudget")) {
          for (const b of payload.personalBudgets) {
            const catKey = b.category ? `${b.category.name}-${b.category.type}` : null;
            const categoryId = catKey ? categoryMap.get(catKey) : null;
            if (categoryId) {
              await tx.personalBudget.create({
                data: {
                  userId,
                  amount: b.amount,
                  month: b.month,
                  year: b.year,
                  categoryId
                }
              });
            }
          }
        }

        // 6. Quests & Tasks
        if (Array.isArray(payload.tasks) && hasModel("task")) {
          for (const t of payload.tasks) {
            await tx.task.create({
              data: {
                id: t.id,
                userId,
                title: t.title,
                description: t.description,
                dueDate: t.dueDate ? new Date(t.dueDate) : null,
                dueTime: t.dueTime,
                priority: t.priority,
                category: t.category,
                repeat: t.repeat,
                notes: t.notes,
                completed: t.completed,
                completedAt: t.completedAt ? new Date(t.completedAt) : null,
                order: t.order || 0
              }
            });
          }
        }

        if (Array.isArray(payload.quests) && hasModel("quest")) {
          for (const q of payload.quests) {
            await tx.quest.create({
              data: {
                id: q.id,
                title: q.title,
                description: q.description,
                type: q.type,
                xpReward: q.xpReward,
                coinReward: q.coinReward,
                isGlobal: q.isGlobal,
                creatorId: userId,
                taskId: q.taskId
              }
            });
          }
        }

        if (Array.isArray(payload.questProgresses) && hasModel("questProgress")) {
          for (const qp of payload.questProgresses) {
            await tx.questProgress.create({
              data: {
                userId,
                questId: qp.questId,
                status: qp.status,
                progress: qp.progress,
                target: qp.target,
                completedAt: qp.completedAt ? new Date(qp.completedAt) : null
              }
            });
          }
        }

        // 7. General Transactions & Purchases
        if (Array.isArray(payload.transactions) && hasModel("transaction")) {
          for (const txItem of payload.transactions) {
            await tx.transaction.create({
              data: {
                userId,
                amount: txItem.amount,
                currency: txItem.currency,
                type: txItem.type,
                source: txItem.source,
                note: txItem.note,
                date: txItem.date ? new Date(txItem.date) : new Date()
              }
            });
          }
        }

        if (Array.isArray(payload.purchases) && hasModel("purchase")) {
          for (const p of payload.purchases) {
            await tx.purchase.create({
              data: {
                userId,
                itemId: p.itemId,
                price: p.price,
                currency: p.currency
              }
            });
          }
        }

        // 8. Inventory Capacity & Items
        if (payload.inventory && hasModel("inventory")) {
          const inv = await tx.inventory.create({
            data: {
              userId,
              capacity: payload.inventory.capacity || 50
            }
          });

          if (Array.isArray(payload.inventory.items) && hasModel("inventoryItem")) {
            for (const item of payload.inventory.items) {
              await tx.inventoryItem.create({
                data: {
                  inventoryId: inv.id,
                  itemId: item.itemId,
                  quantity: item.quantity,
                  isEquipped: item.isEquipped
                }
              });
            }
          }
        }

        // 9. Bosses Battles
        if (payload.bossProgress && hasModel("bossProgress")) {
          await tx.bossProgress.create({
            data: {
              userId,
              dedicatedBossId: payload.bossProgress.dedicatedBossId,
              currentBossId: payload.bossProgress.currentBossId,
              currentRegionId: payload.bossProgress.currentRegionId,
              bossHP: payload.bossProgress.bossHP,
              maxHP: payload.bossProgress.maxHP,
              activeEasyTask: payload.bossProgress.activeEasyTask,
              activeMediumTask: payload.bossProgress.activeMediumTask,
              activeHardTask: payload.bossProgress.activeHardTask,
              completedTaskIds: payload.bossProgress.completedTaskIds,
              version: payload.bossProgress.version
            }
          });
        }

        // 10. Pets & Pet Stats
        if (Array.isArray(payload.pets) && hasModel("pet")) {
          for (const pet of payload.pets) {
            const p = await tx.pet.create({
              data: {
                userId,
                name: pet.name,
                species: pet.species,
                level: pet.level,
                xp: pet.xp,
                rarity: pet.rarity,
                equipment: pet.equipment,
                isEquipped: pet.isEquipped
              }
            });

            if (pet.stats && hasModel("petStats")) {
              await tx.petStats.create({
                data: {
                  petId: p.id,
                  hunger: pet.stats.hunger,
                  loyalty: pet.stats.loyalty,
                  happiness: pet.stats.happiness,
                  bonusType: pet.stats.bonusType,
                  bonusValue: pet.stats.bonusValue
                }
              });
            }
          }
        }

        // 11. Achievements Progress
        if (Array.isArray(payload.achievements) && hasModel("achievementProgress")) {
          for (const ach of payload.achievements) {
            await tx.achievementProgress.create({
              data: {
                userId,
                achievementId: ach.achievementId,
                progress: ach.progress,
                isUnlocked: ach.isUnlocked,
                unlockedAt: ach.unlockedAt ? new Date(ach.unlockedAt) : null
              }
            });
          }
        }

        // 12. Habits & Streaks
        if (Array.isArray(payload.streaks) && hasModel("streak")) {
          for (const str of payload.streaks) {
            await tx.streak.create({
              data: {
                userId,
                name: str.name,
                description: str.description,
                icon: str.icon,
                color: str.color,
                frequency: str.frequency,
                reminder: str.reminder,
                xpReward: str.xpReward,
                coinReward: str.coinReward,
                current: str.current,
                best: str.best,
                lastCheckin: str.lastCheckin ? new Date(str.lastCheckin) : new Date(),
                totalCompletions: str.totalCompletions || 0,
                isArchived: str.isArchived || false,
                isPaused: str.isPaused || false
              }
            });
          }
        }

        // 13. AI Conversations & Insights
        const isInsightModel = hasModel("aIInsight") || hasModel("aiInsight");
        const insightModelName = hasModel("aIInsight") ? "aIInsight" : "aiInsight";
        if (Array.isArray(payload.insights) && isInsightModel) {
          for (const ins of payload.insights) {
            await (tx as any)[insightModelName].create({
              data: {
                userId,
                title: ins.title,
                content: ins.content,
                type: ins.type
              }
            });
          }
        }

        const isConvModel = hasModel("aIConversation") || hasModel("aiConversation");
        const convModelName = hasModel("aIConversation") ? "aIConversation" : "aiConversation";
        if (Array.isArray(payload.conversations) && isConvModel) {
          for (const conv of payload.conversations) {
            await (tx as any)[convModelName].create({
              data: {
                userId,
                title: conv.title,
                messages: conv.messages
              }
            });
          }
        }

        // 14. Chronicles Log & Notifications
        if (Array.isArray(payload.chronicles) && hasModel("chronicle")) {
          for (const chron of payload.chronicles) {
            await tx.chronicle.create({
              data: {
                userId,
                title: chron.title,
                content: chron.content,
                type: chron.type,
                timestamp: chron.timestamp ? new Date(chron.timestamp) : new Date()
              }
            });
          }
        }

        if (Array.isArray(payload.notifications) && hasModel("notification")) {
          for (const n of payload.notifications) {
            await tx.notification.create({
              data: {
                userId,
                title: n.title,
                message: n.message,
                type: n.type,
                isRead: n.isRead
              }
            });
          }
        }

        // 15. Analytics, Shop State, World Regions & Masteries
        if (Array.isArray(payload.analytics) && hasModel("analyticsEvent")) {
          for (const an of payload.analytics) {
            await tx.analyticsEvent.create({
              data: {
                userId,
                eventType: an.eventType,
                payload: an.payload
              }
            });
          }
        }

        if (payload.shopState && hasModel("shopState")) {
          await tx.shopState.create({
            data: {
              userId,
              lastRefreshed: payload.shopState.lastRefreshed ? new Date(payload.shopState.lastRefreshed) : new Date(),
              itemIds: payload.shopState.itemIds
            }
          });
        }

        if (Array.isArray(payload.masteries) && hasModel("skillMastery")) {
          for (const m of payload.masteries) {
            await tx.skillMastery.create({
              data: {
                userId,
                category: m.category,
                xp: m.xp,
                level: m.level,
                points: m.points
              }
            });
          }
        }

        if (Array.isArray(payload.worldRegions) && hasModel("worldRegion")) {
          for (const wr of payload.worldRegions) {
            await tx.worldRegion.create({
              data: {
                userId,
                regionId: wr.regionId,
                unlocked: wr.unlocked,
                unlockedAt: wr.unlockedAt ? new Date(wr.unlockedAt) : null
              }
            });
          }
        }

        // 16. Schedules
        if (Array.isArray(payload.schedules) && hasModel("schedule")) {
          for (const s of payload.schedules) {
            const sch = await tx.schedule.create({
              data: {
                userId,
                name: s.name
              }
            });

            if (Array.isArray(s.events) && hasModel("calendarEvent")) {
              for (const ev of s.events) {
                await tx.calendarEvent.create({
                  data: {
                    scheduleId: sch.id,
                    title: ev.title,
                    description: ev.description,
                    startTime: new Date(ev.startTime),
                    endTime: new Date(ev.endTime),
                    isRecurring: ev.isRecurring,
                    recurrenceRule: ev.recurrenceRule
                  }
                });
              }
            }
          }
        }
      }, {
        timeout: 30000,
        maxWait: 10000
      });
      return true;
    } catch (err) {
      console.error("[BackupService] Restore failed:", err);
      return false;
    }
  }
}
