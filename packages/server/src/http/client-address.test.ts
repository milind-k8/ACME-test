import { describe, expect, it } from "bun:test";
import { clientAddress } from "./client-address";

describe("clientAddress", () => {
  it("behind a trusted proxy, is the last X-Forwarded-For entry (the one the proxy added)", () => {
    expect(clientAddress("1.1.1.1, 2.2.2.2", "172.18.0.3", true)).toBe("2.2.2.2");
    expect(clientAddress(" 9.9.9.9 ", "172.18.0.3", true)).toBe("9.9.9.9");
  });

  it("without a trusted proxy, ignores the header, so a client can't choose its own address", () => {
    expect(clientAddress("1.1.1.1", "203.0.113.7", false)).toBe("203.0.113.7");
  });

  it("falls back to the connection address, then to 'unknown'", () => {
    expect(clientAddress(null, "203.0.113.7", true)).toBe("203.0.113.7");
    expect(clientAddress(" , ", null, true)).toBe("unknown");
  });
});
