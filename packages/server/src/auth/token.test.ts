import { describe, expect, it } from "bun:test";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { signToken } from "./token";

const secret = "test-secret";
const now = new Date("2026-10-13T09:00:00Z");
const nowSeconds = now.getTime() / 1000;

describe("signToken", () => {
  it("signs an HS256 token with the email that expires 8 hours after now", async () => {
    const token = await signToken({ email: "hr@acme.test" }, secret, now);

    expect(decodeProtectedHeader(token).alg).toBe("HS256");
    expect(decodeJwt(token)).toEqual({ email: "hr@acme.test", iat: nowSeconds, exp: nowSeconds + 8 * 60 * 60 });
  });
});
