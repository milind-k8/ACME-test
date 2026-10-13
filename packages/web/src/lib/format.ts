const LOCALE = "en-US";
const countryNames = new Intl.DisplayNames([LOCALE], { type: "region" });

// Stored amounts are integers in the currency's minor units; the currency itself says how many decimals that is.
function decimalsOf(currency: string): number {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(minor / 10 ** decimalsOf(currency));
}

/** Minor units as a plain decimal string for a form field ("85000.50"), built from digits, not float division. */
export function formatMajor(minor: number, currency: string): string {
  const decimals = decimalsOf(currency);
  if (decimals === 0) return String(minor);
  const digits = String(minor).padStart(decimals + 1, "0");
  return `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}

export function formatCountry(code: string): string {
  return countryNames.of(code) ?? code;
}
