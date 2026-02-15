/**
 * Per-email rate limiting to prevent email spam abuse.
 * Tracks email send attempts in memory per recipient address.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_WINDOW = 3;

const attempts = new Map<string, number[]>();

/**
 * Check if an email can be sent to the given address.
 * Returns true if allowed, false if rate limited.
 * Automatically records the attempt when allowed.
 */
export function checkEmailRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();

  // Filter to attempts within the current window
  const recent = (attempts.get(key) || []).filter(t => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    attempts.set(key, recent);
    return false;
  }

  recent.push(now);
  attempts.set(key, recent);
  return true;
}

// Periodic cleanup to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of attempts) {
    const valid = timestamps.filter(t => now - t < WINDOW_MS);
    if (valid.length === 0) {
      attempts.delete(key);
    } else {
      attempts.set(key, valid);
    }
  }
}, 5 * 60 * 1000);
