import type { Database } from "bun:sqlite";
import type { BunRequest } from "bun";
import type { SessionUser } from "@smt/shared/api-types";
import type { Config } from "../config";
import { error, json } from "../http/responses";
import { SESSION_SECONDS, signToken } from "./token";
import { findByEmail } from "./users.repository";
import { validateLogin } from "./validate-login";

// Verified when the email is unknown, so that path costs the same as a wrong password (no user enumeration by timing).
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=2,p=1$wdGgjEgwOqxF03MG4Hh10BtDcNianr6dGXviUYG5rVM$NyO8mAZyhUCR9tlBfnT0r9VP8J3Yh4tbwHDnizhBXZo";

export function authRoutes(db: Database, config: Config, now: () => Date) {
  return {
    "/api/login": {
      POST: async (req: BunRequest) => {
        // Malformed JSON is a client error: treat it as an empty body so validation reports each field.
        const body: unknown = await req.json().catch(() => null);
        const result = validateLogin(body);
        if (!result.ok) {
          return error(400, "validation", "Invalid login request", result.errors);
        }
        const { email, password } = result.value;
        const user = findByEmail(db, email);
        const passwordMatches = await Bun.password.verify(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !passwordMatches) {
          return error(401, "invalid_credentials", "Email or password is incorrect");
        }
        const session: SessionUser = { email: user.email };
        req.cookies.set("session", await signToken(session, config.jwtSecret, now()), {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: SESSION_SECONDS,
        });
        return json(session);
      },
    },
  };
}
