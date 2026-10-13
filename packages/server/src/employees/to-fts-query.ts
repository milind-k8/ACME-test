// User text never reaches MATCH as FTS syntax: each word becomes a quoted string ("" escapes a quote) with a prefix *.
export function toFtsQuery(q: string): string | null {
  const words = q.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  return words.map((word) => `"${word.replaceAll('"', '""')}"*`).join(" ");
}
