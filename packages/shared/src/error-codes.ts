// The `error.code` values the API can return. Clients branch on these, never on messages.
export const ERROR_CODES = {
  validation: "validation",
  invalidCredentials: "invalid_credentials",
  unauthenticated: "unauthenticated",
  notFound: "not_found",
  internal: "internal",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
