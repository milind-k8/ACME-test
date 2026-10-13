// Error codes the client produces itself, when there is no API error body to read.
export const CLIENT_ERROR_CODES = {
  network: "network",
  unknown: "unknown",
} as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];

export const API_MESSAGES = {
  network: "Can't reach the server. Check your connection.",
  unknown: "Something went wrong. Please try again.",
} as const;
