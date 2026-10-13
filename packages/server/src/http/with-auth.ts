import type { BunRequest } from "bun";
import type { SessionUser } from "@smt/shared/api-types";
import type { Config } from "../config";
import { verifyToken } from "../auth/token";
import { error } from "./responses";

type AuthedHandler<Path extends string> = (req: BunRequest<Path>, user: SessionUser) => Response | Promise<Response>;

// The single gate for every protected route: no valid session cookie, no handler.
export function withAuth<Path extends string>(config: Config, now: () => Date, handler: AuthedHandler<Path>) {
  return async (req: BunRequest<Path>): Promise<Response> => {
    const user = await verifyToken(req.cookies.get("session") ?? "", config.jwtSecret, now());
    if (!user) return error(401, "unauthenticated", "Please log in");
    return handler(req, user);
  };
}
