import type { NewEmployee } from "@smt/shared/api-types";
import { SEED_COUNTRIES, SEED_JOBS } from "./data";
import { createRandom } from "./random";

function minorUnitsPerMajor(currency: string): number {
  const digits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  return 10 ** digits;
}

const FIRST_HIRE = Date.UTC(2010, 0, 1);
const LAST_HIRE = Date.UTC(2026, 8, 30);
const DAY_MS = 86_400_000;
const MAX_NAME_ATTEMPTS = 1_000;

export function generateEmployees(count: number, seed: number): NewEmployee[] {
  const random = createRandom(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random.next() * items.length)] as T;
  const usedNames = new Set<string>();

  // Draws country and name together until the full name is new, so a country whose names run out yields to another.
  function pickPerson() {
    for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
      const country = pick(SEED_COUNTRIES);
      const firstName = pick(country.firstNames);
      const lastName = pick(country.lastNames);
      const fullName = `${firstName} ${lastName}`;
      if (usedNames.has(fullName)) continue;
      usedNames.add(fullName);
      return { country, firstName, lastName };
    }
    throw new Error(`Not enough distinct names in seed/data.ts for ${String(count)} employees`);
  }

  return Array.from({ length: count }, (_, index) => {
    const { country, firstName, lastName } = pickPerson();
    const job = pick(SEED_JOBS);
    // ±20% around the job's base, rounded to a whole thousand like a real offer.
    const spread = 0.8 + random.next() * 0.4;
    const salaryMajor = Math.round((job.baseUsd * country.payMultiplier * spread) / 1000) * 1000;
    const hireDay = Math.floor(random.next() * ((LAST_HIRE - FIRST_HIRE) / DAY_MS + 1));
    return {
      employeeNumber: `E${String(index + 1).padStart(5, "0")}`,
      firstName,
      lastName,
      country: country.code,
      currency: country.currency,
      jobTitle: job.title,
      department: job.department,
      salaryMinor: salaryMajor * minorUnitsPerMajor(country.currency),
      hiredAt: new Date(FIRST_HIRE + hireDay * DAY_MS).toISOString().slice(0, 10),
    };
  });
}
