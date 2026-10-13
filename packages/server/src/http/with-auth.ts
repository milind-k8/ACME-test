import type { BunRequest } from "bun";
import type { SessionUser } from "@smt/shared/api-types";
import { ERROR_CODES } from "@smt/shared/error-codes";
import type { Config } from "../config";
import { AUTH_MESSAGES, SESSION_COOKIE_NAME } from "../auth/auth.constants";
import { verifyToken } from "../auth/token";
import { error } from "./responses";

type AuthedHandler<Path extends string> = (req: BunRequest<Path>, user: SessionUser) => Response | Promise<Response>;

// The single gate for every protected route: no valid session cookie, no handler.
export function withAuth<Path extends string>(config: Config, now: () => Date, handler: AuthedHandler<Path>) {
  return async (req: BunRequest<Path>): Promise<Response> => {
    const user = await verifyToken(req.cookies.get(SESSION_COOKIE_NAME) ?? "", config.jwtSecret, now());
    if (!user) return error(401, ERROR_CODES.unauthenticated, AUTH_MESSAGES.unauthenticated);
    return handler(req, user);
  };
}
