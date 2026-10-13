/**
 * Who a request comes from, for the login limiter. Our proxy (Caddy) works out the client address, trusting only
 * proxies on private networks in front of it, and sends it as X-Real-IP, replacing any X-Real-IP the client sent.
 * The API trusts that header only with TRUST_PROXY=true; otherwise it uses the connection address.
 */
export function clientAddress(realIp: string | null, connectionAddress: string | null, trustProxy: boolean): string {
  const fromProxy = trustProxy ? realIp?.trim() : undefined;
  return fromProxy || connectionAddress || "unknown";
}
