import type { SessionUser } from "@smt/shared/api-types";
import { errors, jwtVerify, SignJWT } from "jose";

export const SESSION_SECONDS = 8 * 60 * 60;

export function signToken(user: SessionUser, secret: string, now: Date): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(new Date(now.getTime() + SESSION_SECONDS * 1000))
    .sign(key(secret));
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function verifyToken(token: string, secret: string, now: Date): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"], currentDate: now });
    return typeof payload.email === "string" ? { email: payload.email } : null;
  } catch (err) {
    // Any bad token (malformed, tampered, wrong key or alg, expired) just means "not logged in".
    if (err instanceof errors.JOSEError) return null;
    throw err;
  }
}
