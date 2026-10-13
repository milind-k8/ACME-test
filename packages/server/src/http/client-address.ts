/**
 * Who a request comes from, for the login limiter. Behind our own proxy (Caddy) every connection comes from the
 * proxy, so the real client is the address the proxy appended to X-Forwarded-For: the last entry. Earlier entries
 * can be sent by the client itself, so they're never used. Without a trusted proxy the header is ignored entirely.
 */
export function clientAddress(
  forwardedFor: string | null,
  connectionAddress: string | null,
  trustProxy: boolean,
): string {
  if (trustProxy && forwardedFor) {
    const last = forwardedFor.split(",").at(-1)?.trim();
    if (last) return last;
  }
  return connectionAddress ?? "unknown";
}
