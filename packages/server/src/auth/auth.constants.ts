export const SESSION_COOKIE_NAME = "session";

export const SESSION_SECONDS = 8 * 60 * 60;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
} as const;

// Verified when the email is unknown, so that path costs the same as a wrong password (no user enumeration by timing).
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=2,p=1$wdGgjEgwOqxF03MG4Hh10BtDcNianr6dGXviUYG5rVM$NyO8mAZyhUCR9tlBfnT0r9VP8J3Yh4tbwHDnizhBXZo";

export const AUTH_MESSAGES = {
  invalidCredentials: "Email or password is incorrect",
  invalidLoginRequest: "Invalid login request",
  unauthenticated: "Please log in",
  required: "is required",
  tooManyAttempts: "Too many login attempts. Try again in 15 minutes.",
} as const;

// ADR-003: failed logins per client before it has to wait, and for how long.
export const LOGIN_LIMITS = { maxFailures: 5, windowMs: 15 * 60_000, maxClients: 10_000 } as const;
