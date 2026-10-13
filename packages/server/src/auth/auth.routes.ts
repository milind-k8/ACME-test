import type { Database } from "bun:sqlite";
import type { BunRequest, Server } from "bun";
import { API_ROUTES } from "@smt/shared/api-routes";
import type { SessionUser } from "@smt/shared/api-types";
import { ERROR_CODES } from "@smt/shared/error-codes";
import type { Config } from "../config";
import { clientAddress } from "../http/client-address";
import { error, json } from "../http/responses";
import { withAuth } from "../http/with-auth";
import {
  AUTH_MESSAGES,
  DUMMY_PASSWORD_HASH,
  LOGIN_LIMITS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_SECONDS,
} from "./auth.constants";
import { createLoginLimiter } from "./login-limiter";
import { signToken } from "./token";
import { findByEmail } from "./users.repository";
import { validateLogin } from "./validate-login";

export function authRoutes(db: Database, config: Config, now: () => Date) {
  // One limiter per route table, so every test server starts clean.
  const limiter = createLoginLimiter(LOGIN_LIMITS);

  return {
    [API_ROUTES.login]: {
      POST: async (req: BunRequest, server: Server<undefined>) => {
        // Malformed JSON is a client error: treat it as an empty body so validation reports each field.
        const body: unknown = await req.json().catch(() => null);
        const result = validateLogin(body);
        if (!result.ok) {
          return error(400, ERROR_CODES.validation, AUTH_MESSAGES.invalidLoginRequest, result.errors);
        }
        // Checked before the password, so a limited client can't confirm a guess (not even the right one).
        const client = clientAddress(
          req.headers.get("X-Real-IP"),
          server.requestIP(req)?.address ?? null,
          config.trustProxy,
        );
        const limit = limiter.check(client, now());
        if (!limit.allowed) {
          const res = error(429, ERROR_CODES.tooManyAttempts, AUTH_MESSAGES.tooManyAttempts);
          res.headers.set("Retry-After", String(limit.retryAfterSeconds));
          return res;
        }
        const { email, password } = result.value;
        const user = findByEmail(db, email);
        const passwordMatches = await Bun.password.verify(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !passwordMatches) {
          limiter.fail(client, now());
          return error(401, ERROR_CODES.invalidCredentials, AUTH_MESSAGES.invalidCredentials);
        }
        limiter.succeed(client);
        const session: SessionUser = { email: user.email };
        req.cookies.set(SESSION_COOKIE_NAME, await signToken(session, config.jwtSecret, now()), {
          ...SESSION_COOKIE_OPTIONS,
          maxAge: SESSION_SECONDS,
        });
        return json(session);
      },
    },
    // Not behind withAuth: an expired session must still be able to clear its cookie.
    [API_ROUTES.logout]: {
      POST: (req: BunRequest) => {
        req.cookies.set(SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
        return new Response(null, { status: 204 });
      },
    },
    [API_ROUTES.me]: {
      GET: withAuth(config, now, (_req, user) => json(user)),
    },
  };
}
