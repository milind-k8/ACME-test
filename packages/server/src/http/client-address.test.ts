import { describe, expect, it } from "bun:test";
import { clientAddress } from "./client-address";

describe("clientAddress", () => {
  it("behind our proxy, is the X-Real-IP it sets (the client address it worked out)", () => {
    expect(clientAddress("198.51.100.4", "172.18.0.3", true)).toBe("198.51.100.4");
    expect(clientAddress(" 198.51.100.4 ", "172.18.0.3", true)).toBe("198.51.100.4");
  });

  it("without a trusted proxy, ignores the header, so a client can't choose its own address", () => {
    expect(clientAddress("1.1.1.1", "203.0.113.7", false)).toBe("203.0.113.7");
  });

  it("falls back to the connection address, then to 'unknown'", () => {
    expect(clientAddress(null, "203.0.113.7", true)).toBe("203.0.113.7");
    expect(clientAddress("  ", "203.0.113.7", true)).toBe("203.0.113.7");
    expect(clientAddress(null, null, true)).toBe("unknown");
  });
});
