export interface LoginLimits {
  maxFailures: number;
  windowMs: number;
  /** Most clients tracked at once, so memory stays bounded. */
  maxClients: number;
}

export type LimitCheck = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Counts failed logins per client in a fixed window that starts at the first failure (ADR-003). Pure apart from
 * its own Map; the caller passes the time, so the window is testable without waiting.
 */
export function createLoginLimiter(limits: LoginLimits) {
  const failures = new Map<string, { count: number; windowStart: number }>();

  // An entry whose window has passed is as good as none; drop it when we see it.
  const current = (client: string, now: Date) => {
    const entry = failures.get(client);
    if (entry && now.getTime() - entry.windowStart >= limits.windowMs) {
      failures.delete(client);
      return undefined;
    }
    return entry;
  };

  return {
    check(client: string, now: Date): LimitCheck {
      const entry = current(client, now);
      if (!entry || entry.count < limits.maxFailures) return { allowed: true };
      const msLeft = entry.windowStart + limits.windowMs - now.getTime();
      return { allowed: false, retryAfterSeconds: Math.ceil(msLeft / 1000) };
    },
    fail(client: string, now: Date): void {
      const entry = current(client, now);
      if (entry) {
        entry.count++;
        return;
      }
      failures.set(client, { count: 1, windowStart: now.getTime() });
      // Bounded memory: past the cap, forget the oldest client (Map keeps insertion order).
      if (failures.size > limits.maxClients) {
        const oldest = failures.keys().next().value;
        if (oldest !== undefined) failures.delete(oldest);
      }
    },
    succeed(client: string): void {
      failures.delete(client);
    },
  };
}
