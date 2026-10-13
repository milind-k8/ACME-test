const LOCALE = "en-US";
const countryNames = new Intl.DisplayNames([LOCALE], { type: "region" });

// Stored amounts are integers in the currency's minor units; the currency itself says how many decimals that is.
export function formatMoney(minor: number, currency: string): string {
  const format = new Intl.NumberFormat(LOCALE, { style: "currency", currency });
  const decimals = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(minor / 10 ** decimals);
}

export function formatCountry(code: string): string {
  return countryNames.of(code) ?? code;
}
