import "server-only";

type Task<T> = () => Promise<T>;

export interface WriteOptions {
  resource?: string;
  priority?: "HIGH" | "LOW";
  isCompaction?: boolean;
}

// Global store to persist across Next.js dev hot-reloads
const globalStore = globalThis as unknown as {
  activeLocks: Map<string, Promise<any>>;
  activeCompactions: Map<string, Promise<any>>;
  invalidationDebouncers: Map<string, NodeJS.Timeout>;
};

if (!globalStore.activeLocks) {
  globalStore.activeLocks = new Map();
}
if (!globalStore.activeCompactions) {
  globalStore.activeCompactions = new Map();
}
if (!globalStore.invalidationDebouncers) {
  globalStore.invalidationDebouncers = new Map();
}

export class WriteManager {
  private static get activeLocks() {
    return globalStore.activeLocks;
  }

  private static get activeCompactions() {
    return globalStore.activeCompactions;
  }

  private static get invalidationDebouncers() {
    return globalStore.invalidationDebouncers;
  }

  /**
   * Run a task with exponential backoff retries.
   */
  private static async runWithRetry<T>(task: Task<T>, retries = 3, delay = 100): Promise<T> {
    try {
      return await task();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isTransient = 
        errMsg.includes("Compaction failed") ||
        errMsg.includes("Persisting failed") ||
        errMsg.includes("Only a single write operation") ||
        errMsg.includes("lock") ||
        errMsg.includes("busy") ||
        errMsg.includes("P2028"); // Prisma transaction timeout

      if (retries <= 0 || !isTransient) throw error;

      console.warn(
        `[WriteManager] Transient write error encountered. Retrying in ${delay}ms. Retries left: ${retries}. Error: ${errMsg}`
      );
      
      // Jitter
      const jitter = Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      return WriteManager.runWithRetry(task, retries - 1, delay * 2);
    }
  }

  /**
   * Enqueue a database write or transaction to execute sequentially per resource.
   */
  static async enqueue<T>(task: Task<T>, options?: WriteOptions): Promise<T> {
    const resource = options?.resource || "default_db";
    const priority = options?.priority || "HIGH";
    const isCompaction = options?.isCompaction || false;

    // Reuse ongoing compaction if requested and one is active
    if (isCompaction) {
      const activeCompaction = WriteManager.activeCompactions.get(resource);
      if (activeCompaction) {
        return activeCompaction as Promise<T>;
      }
    }

    const currentLock = WriteManager.activeLocks.get(resource) || Promise.resolve();

    const taskPromise = (async () => {
      // High-priority tasks execute, low-priority tasks yield slightly to interactive requests
      if (priority === "LOW") {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return WriteManager.runWithRetry(task);
    })();

    // Chain the lock sequentially per resource
    const nextLock = currentLock.then(() => taskPromise).catch(() => {});
    WriteManager.activeLocks.set(resource, nextLock);

    // If this is a compaction, track it
    if (isCompaction) {
      WriteManager.activeCompactions.set(resource, taskPromise);
      taskPromise.finally(() => {
        WriteManager.activeCompactions.delete(resource);
      });
    }

    return taskPromise;
  }

  /**
   * Coalesce repeated cache invalidations by debouncing them.
   */
  static coalesceInvalidation(key: string, invalidationTask: () => void, delay = 100) {
    const existing = WriteManager.invalidationDebouncers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      try {
        invalidationTask();
      } catch (error) {
        console.error(`[WriteManager] Error executing invalidation for key ${key}:`, error);
      } finally {
        WriteManager.invalidationDebouncers.delete(key);
      }
    }, delay);

    WriteManager.invalidationDebouncers.set(key, timer);
  }
}

export const WriteCoordinator = WriteManager;
