import { describe, expect, it } from "bun:test";
import { base64url, decodeJwt, decodeProtectedHeader, SignJWT } from "jose";
import { signToken, verifyToken } from "./token";

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

describe("verifyToken", () => {
  it("returns the user for a token it signed", async () => {
    const token = await signToken({ email: "hr@acme.test" }, secret, now);

    expect(await verifyToken(token, secret, now)).toEqual({ email: "hr@acme.test" });
  });

  const encode = (value: object) => base64url.encode(JSON.stringify(value));
  const claims = { email: "hr@acme.test", iat: nowSeconds, exp: nowSeconds + 8 * 60 * 60 };
  const rejected: [string, () => Promise<string>, Date][] = [
    ["is not a JWT", () => Promise.resolve("not-a-token"), now],
    [
      "has a tampered payload",
      async () => {
        const [header, , signature] = (await signToken({ email: "hr@acme.test" }, secret, now)).split(".");
        return `${header ?? ""}.${encode({ ...claims, email: "attacker@evil.test" })}.${signature ?? ""}`;
      },
      now,
    ],
    ["was signed with a different secret", () => signToken({ email: "hr@acme.test" }, "other-secret", now), now],
    ["uses alg none", () => Promise.resolve(`${encode({ alg: "none" })}.${encode(claims)}.`), now],
    [
      "uses an algorithm other than HS256",
      () => new SignJWT(claims).setProtectedHeader({ alg: "HS512" }).sign(new TextEncoder().encode(secret)),
      now,
    ],
    [
      "has no email claim",
      () =>
        new SignJWT({ iat: nowSeconds, exp: claims.exp }).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode(secret)),
      now,
    ],
    [
      "is more than 8 hours old",
      () => signToken({ email: "hr@acme.test" }, secret, now),
      new Date(now.getTime() + (8 * 60 * 60 + 1) * 1000),
    ],
  ];

  it.each(rejected)("returns null when the token %s", async (_case, makeToken, at) => {
    expect(await verifyToken(await makeToken(), secret, at)).toBeNull();
  });
});
