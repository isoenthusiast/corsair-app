/**
 * In-memory sliding-window rate limiter.
 * Not suitable for multi-process deployments — use Redis for production.
 */

interface Bucket {
    timestamps: number[];
}

const store = new Map<string, Bucket>();

// Cleanup old entries every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
        bucket.timestamps = bucket.timestamps.filter(t => now - t < 60_000);
        if (bucket.timestamps.length === 0) store.delete(key);
    }
}, 60_000).unref();

/**
 * Check if a key has exceeded the rate limit.
 * @param key — unique identifier (e.g., IP or userId)
 * @param maxRequests — max requests allowed in the window
 * @param windowMs — time window in milliseconds (default 60s)
 * @returns { allowed: boolean, remaining: number, reset: number }
 */
export function checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number = 60_000,
): { allowed: boolean; remaining: number; reset: number } {
    const now = Date.now();
    let bucket = store.get(key);
    if (!bucket) {
        bucket = { timestamps: [] };
        store.set(key, bucket);
    }

    // Remove timestamps outside the window
    bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);

    const remaining = Math.max(0, maxRequests - bucket.timestamps.length);
    const allowed = remaining > 0;

    if (allowed) {
        bucket.timestamps.push(now);
    }

    return {
        allowed,
        remaining: allowed ? remaining - 1 : 0,
        reset: bucket.timestamps.length > 0
            ? Math.ceil((bucket.timestamps[0] + windowMs - now) / 1000)
            : 0,
    };
}
