import type { SessionUser } from "@smt/shared/api-types";
import { SignJWT } from "jose";

export const SESSION_SECONDS = 8 * 60 * 60;

export function signToken(user: SessionUser, secret: string, now: Date): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(new Date(now.getTime() + SESSION_SECONDS * 1000))
    .sign(new TextEncoder().encode(secret));
}
