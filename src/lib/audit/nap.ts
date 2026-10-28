import type { Address } from "./types";

/** Digits only, with a leading US/Canada country code removed. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

const NAME_NOISE = new Set(["the", "llc", "inc", "co", "corp", "corporation", "company", "ltd", "pllc", "pc"]);

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !NAME_NOISE.has(w))
    .join(" ");
}

const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  street: "st",
  avenue: "ave",
  av: "ave",
  road: "rd",
  drive: "dr",
  boulevard: "blvd",
  lane: "ln",
  court: "ct",
  place: "pl",
  parkway: "pkwy",
  highway: "hwy",
  circle: "cir",
  terrace: "ter",
  suite: "ste",
  unit: "ste",
  apartment: "apt",
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  northeast: "ne",
  northwest: "nw",
  southeast: "se",
  southwest: "sw",
  first: "1st",
  second: "2nd",
  third: "3rd",
};

export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/#\s*/g, " ste ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => ADDRESS_ABBREVIATIONS[w] ?? w)
    .join(" ");
}

export function formatAddress(a: Address): string {
  const street = [a.line1, a.line2].filter(Boolean).join(", ");
  const regionPostal = [a.region, a.postalCode].filter(Boolean).join(" ");
  return [street, a.city, regionPostal].filter(Boolean).join(", ");
}

export type MatchResult = "match" | "partial" | "mismatch";

export function compareName(canonical: string, listed: string): MatchResult {
  const a = normalizeName(canonical);
  const b = normalizeName(listed);
  if (a === b) return "match";
  if (a && b && (a.includes(b) || b.includes(a))) return "partial";
  return "mismatch";
}

export function comparePhone(canonical: string, listed: string): MatchResult {
  return normalizePhone(canonical) === normalizePhone(listed) ? "match" : "mismatch";
}

/**
 * Full match when the normalized addresses are identical. Partial when the
 * street line and city agree but other parts (suite, postal code) differ.
 */
export function compareAddress(canonical: Address, listed: string): MatchResult {
  const full = normalizeAddress(formatAddress(canonical));
  const candidate = normalizeAddress(listed);
  if (full === candidate) return "match";
  const street = normalizeAddress(canonical.line1);
  const city = normalizeAddress(canonical.city);
  const padded = ` ${candidate} `;
  if (padded.includes(` ${street} `) && padded.includes(` ${city} `)) return "partial";
  return "mismatch";
}

/** Format a 10-digit North American number for display. */
export function formatPhone(phone: string): string {
  const d = normalizePhone(phone);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone;
}
