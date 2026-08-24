// Client-side local cache manager with IndexedDB & LocalStorage fallback
// Features: TTL, LRU eviction, Compression for large payloads, Safe error handling

const DB_NAME = "life-rpg-os-cache";
const DB_VERSION = 1;
const STORE_NAME = "keyval";

// LZW Compression utilities for large JSON payloads (>10KB)
function compress(uncompressed: string): string {
  const dictionary: Record<string, number> = {};
  for (let i = 0; i < 256; i++) {
    dictionary[String.fromCharCode(i)] = i;
  }
  let word = "";
  const result: number[] = [];
  let dictSize = 256;
  for (let i = 0; i < uncompressed.length; i++) {
    const c = uncompressed.charAt(i);
    const wc = word + c;
    if (dictionary[wc] !== undefined) {
      word = wc;
    } else {
      result.push(dictionary[word]);
      dictionary[wc] = dictSize++;
      word = String(c);
    }
  }
  if (word !== "") {
    result.push(dictionary[word]);
  }
  return result.map(x => String.fromCharCode(x)).join("");
}

function decompress(compressed: string): string {
  if (!compressed) return "";
  const dictionary: string[] = [];
  for (let i = 0; i < 256; i++) {
    dictionary[i] = String.fromCharCode(i);
  }
  let dictSize = 256;
  let currChar = compressed.charAt(0);
  let oldPhrase = currChar;
  const result = [currChar];
  for (let i = 1; i < compressed.length; i++) {
    const code = compressed.charCodeAt(i);
    let phrase = "";
    if (dictionary[code] !== undefined) {
      phrase = dictionary[code];
    } else {
      if (code === dictSize) {
        phrase = oldPhrase + currChar;
      } else {
        return "";
      }
    }
    result.push(phrase);
    currChar = phrase.charAt(0);
    dictionary[dictSize++] = oldPhrase + currChar;
    oldPhrase = phrase;
  }
  return result.join("");
}

interface CacheItem<T> {
  value: T;
  expiry: number; // timestamp
  lastAccess: number; // timestamp for LRU
  compressed: boolean;
}

export class LocalCacheManager {
  private static db: IDBDatabase | null = null;

  private static isClient(): boolean {
    return typeof window !== "undefined";
  }

  // Safely get IndexedDB reference
  private static async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Set cache entry. Primary is IndexedDB, fallback is LocalStorage.
   */
  static async set<T>(key: string, value: T, ttlMs = 1000 * 60 * 60): Promise<void> {
    if (!this.isClient()) return;

    const expiry = Date.now() + ttlMs;
    const itemStr = JSON.stringify(value);
    const shouldCompress = itemStr.length > 10240; // >10KB
    
    const storeItem: CacheItem<any> = {
      value: shouldCompress ? compress(itemStr) : value,
      expiry,
      lastAccess: Date.now(),
      compressed: shouldCompress,
    };

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const req = store.put(storeItem, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      
      // Attempt background cleanup on success to keep quota healthy
      this.backgroundCleanup();
    } catch (err) {
      console.warn("[LocalCacheManager] IndexedDB set failed, falling back to LocalStorage:", err);
      // Fallback
      try {
        window.localStorage.setItem(`cache:${key}`, JSON.stringify(storeItem));
      } catch (lsErr) {
        console.error("[LocalCacheManager] LocalStorage full or disabled:", lsErr);
        // Evict expired or LRU from LocalStorage
        this.evictLocalStorageLRU();
      }
    }
  }

  /**
   * Get cache entry. Primary is IndexedDB, fallback is LocalStorage.
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!this.isClient()) return null;

    try {
      const db = await this.getDB();
      const item = await new Promise<CacheItem<any> | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (item) {
        // Expired check
        if (Date.now() > item.expiry) {
          await this.delete(key);
          return null;
        }

        // Update last access for LRU
        this.updateAccessTime(key, item);

        if (item.compressed) {
          return JSON.parse(decompress(item.value as string));
        }
        return item.value as T;
      }
    } catch (err) {
      console.warn("[LocalCacheManager] IndexedDB get failed, trying LocalStorage fallback:", err);
    }

    // LocalStorage fallback
    try {
      const localItem = window.localStorage.getItem(`cache:${key}`);
      if (localItem) {
        const item = JSON.parse(localItem) as CacheItem<any>;
        if (Date.now() > item.expiry) {
          window.localStorage.removeItem(`cache:${key}`);
          return null;
        }
        if (item.compressed) {
          return JSON.parse(decompress(item.value as string));
        }
        return item.value as T;
      }
    } catch (err) {
      console.error("[LocalCacheManager] LocalStorage read failed:", err);
    }

    return null;
  }

  /**
   * Delete entry
   */
  static async delete(key: string): Promise<void> {
    if (!this.isClient()) return;

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // LocalStorage
      window.localStorage.removeItem(`cache:${key}`);
    }
  }

  /**
   * Update last access timestamp in background
   */
  private static async updateAccessTime(key: string, item: CacheItem<any>): Promise<void> {
    try {
      const db = await this.getDB();
      item.lastAccess = Date.now();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(item, key);
    } catch (err) {
      // No-op
    }
  }

  /**
   * Evict least recently used item from LocalStorage when full
   */
  private static evictLocalStorageLRU() {
    try {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("cache:")) {
          const val = window.localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val) as CacheItem<any>;
            if (parsed.lastAccess < oldestTime) {
              oldestTime = parsed.lastAccess;
              oldestKey = key;
            }
          }
        }
      }

      if (oldestKey) {
        window.localStorage.removeItem(oldestKey);
        console.warn("[LocalCacheManager] Evicted LocalStorage cache item to free space:", oldestKey);
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Clean up expired entries in background
   */
  private static async backgroundCleanup() {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      
      const openCursor = store.openCursor();
      openCursor.onsuccess = (event) => {
        const cursor = (event.target as any).result;
        if (cursor) {
          const item = cursor.value as CacheItem<any>;
          if (Date.now() > item.expiry) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (err) {
      // Ignore
    }
  }
}
