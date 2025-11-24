/**
 * Simple in-memory request cache for API calls
 * Prevents duplicate requests and caches responses
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class RequestCache {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly DEFAULT_TTL = 30000; // 30 seconds

  /**
   * Get cached data or execute request
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    // Check if request is already pending (deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Create new request
    const request = fetcher().then((data) => {
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      });
      // Remove from pending
      this.pendingRequests.delete(key);
      return data;
    }).catch((error) => {
      // Remove from pending on error
      this.pendingRequests.delete(key);
      throw error;
    });

    // Track pending request
    this.pendingRequests.set(key, request);

    return request;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const requestCache = new RequestCache();

// Cleanup expired entries every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.cleanup();
  }, 60000);
}

