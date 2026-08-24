interface LockEntry {
  expiresAt: number;
}

export class FailsafeGuard {
  private static locks: Map<string, LockEntry> = new Map();
  private static completedKeys: Map<string, { result: any; timestamp: number }> = new Map();

  /**
   * Acquire an in-memory execution lock for a key. Returns true if acquired.
   */
  static acquireLock(key: string, ttlMs = 5000): boolean {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      return false; // locked
    }

    this.locks.set(key, { expiresAt: now + ttlMs });
    return true;
  }

  /**
   * Release an acquired lock
   */
  static releaseLock(key: string) {
    this.locks.delete(key);
  }

  /**
   * Execute an operation with strict idempotency and concurrency locking
   */
  static async runIdempotent<T>(
    idempotencyKey: string,
    ttlMs: number,
    operation: () => Promise<T>
  ): Promise<T> {
    const cached = this.completedKeys.get(idempotencyKey);
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.result as T;
    }

    const acquired = this.acquireLock(idempotencyKey, ttlMs);
    if (!acquired) {
      throw new Error("Action is already in progress. Please wait a moment.");
    }

    try {
      const result = await operation();
      this.completedKeys.set(idempotencyKey, { result, timestamp: Date.now() });
      
      // Cleanup older entries periodically
      if (this.completedKeys.size > 1000) {
        const now = Date.now();
        for (const [k, v] of this.completedKeys.entries()) {
          if (now - v.timestamp > ttlMs * 2) {
            this.completedKeys.delete(k);
          }
        }
      }

      return result;
    } finally {
      this.releaseLock(idempotencyKey);
    }
  }
}
