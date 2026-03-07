/**
 * Simple in-memory rate limiter using a sliding window counter.
 *
 * Each key (e.g. a share token) gets a window with a count. If the count
 * exceeds the limit within the window, the request is rejected.
 *
 * Tradeoffs:
 * - Resets on server restart (acceptable for abuse prevention)
 * - Single-instance only (swap for Redis/Upstash if scaling horizontally)
 * - Periodically cleans up expired entries to avoid memory leaks
 */

interface WindowEntry {
  count: number;
  windowStart: number;
}

interface RateLimiterOptions {
  /** Max requests allowed per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export class RateLimiter {
  private windows = new Map<string, WindowEntry>();
  private readonly limit: number;
  private readonly windowMs: number;
  private lastCleanup = Date.now();
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 min

  constructor(options: RateLimiterOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
  }

  /**
   * Check if a key is allowed to proceed.
   * Returns { allowed: true } or { allowed: false, retryAfterMs }.
   */
  check(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
    this.cleanupIfNeeded();

    const now = Date.now();
    const entry = this.windows.get(key);

    // No existing window — start a fresh one
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return { allowed: true };
    }

    // Within the window — check count
    if (entry.count >= this.limit) {
      const retryAfterMs = this.windowMs - (now - entry.windowStart);
      return { allowed: false, retryAfterMs };
    }

    entry.count++;
    return { allowed: true };
  }

  /** Remove expired entries to prevent memory leaks */
  private cleanupIfNeeded() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupIntervalMs) return;

    this.lastCleanup = now;
    for (const [key, entry] of this.windows) {
      if (now - entry.windowStart >= this.windowMs) {
        this.windows.delete(key);
      }
    }
  }
}

// --- Shared action rate limiter instances ---

/** Rate limit song additions: 50 per token per hour */
export const sharedAddLimiter = new RateLimiter({
  limit: 50,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/** Rate limit song removals: 50 per token per hour */
export const sharedRemoveLimiter = new RateLimiter({
  limit: 50,
  windowMs: 60 * 60 * 1000,
});

/** Rate limit reorders: 100 per token per hour (reorders happen more often) */
export const sharedReorderLimiter = new RateLimiter({
  limit: 100,
  windowMs: 60 * 60 * 1000,
});

/** Rate limit Spotify searches: 30 per IP per minute */
export const spotifySearchLimiter = new RateLimiter({
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
});
