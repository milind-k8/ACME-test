/**
 * A small LRU cache tagged with a data version (ADR-008). Any version change drops every entry, so a hit can only
 * come from data that hasn't changed since it was computed. A Map keeps insertion order: re-inserting on a hit makes
 * an entry the most recent, and the first key is the least recently used.
 */
export function createResponseCache<T>(maxEntries: number) {
  let version: string | null = null;
  const entries = new Map<string, T>();

  const sync = (current: string) => {
    if (current !== version) {
      entries.clear();
      version = current;
    }
  };

  return {
    get(current: string, key: string): T | undefined {
      sync(current);
      const value = entries.get(key);
      if (value !== undefined) {
        entries.delete(key);
        entries.set(key, value);
      }
      return value;
    },
    set(current: string, key: string, value: T): void {
      sync(current);
      entries.set(key, value);
      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
    },
  };
}
