import { makeCheck, siteAccess, unknownCheck } from "../checks";
import { compareAddress, compareName, comparePhone, formatPhone, type MatchResult } from "../nap";
import type { AuditInput, CheckResult, Listing } from "../types";

const LISTING_RECOMMENDATION = {
  title: "Fix inconsistent business details on directory listings",
  description:
    "Update each listing so the business name, address and phone number match your Google Business Profile exactly. Inconsistent details confuse customers and weaken local search signals.",
  impact: "high",
  effort: "low",
} as const;

const WEBSITE_PHONE = {
  id: "nap_website_phone",
  label: "Phone number on website",
  weight: 1.5,
  recommendation: {
    title: "Show your primary phone number on the website",
    description: "Display the same phone number used on your Google Business Profile in the header or footer of every page.",
    impact: "high",
    effort: "low",
  },
} as const;

const DIRECTORY_LISTINGS = { id: "nap_directory_listings", label: "Directory listings", weight: 3 } as const;

function evaluateListing(input: AuditInput, listing: Listing, index: number): CheckResult {
  const spec = {
    id: `nap_listing_${index}`,
    label: `${listing.source} listing`,
    weight: 1,
    recommendation: LISTING_RECOMMENDATION,
  };
  const b = input.business;
  const results: { field: string; result: MatchResult }[] = [];
  if (listing.name) results.push({ field: "name", result: compareName(b.name, listing.name) });
  if (listing.address) results.push({ field: "address", result: compareAddress(b.address, listing.address) });
  if (listing.phone) results.push({ field: "phone", result: comparePhone(b.phone, listing.phone) });

  if (!results.length) return unknownCheck(spec, "No name, address or phone details were recorded for this listing.");

  const mismatched = results.filter((r) => r.result === "mismatch").map((r) => r.field);
  const partial = results.filter((r) => r.result === "partial").map((r) => r.field);
  const checked = results.map((r) => r.field).join(", ");

  if (mismatched.length) {
    return makeCheck(spec, "fail", `Does not match: ${mismatched.join(", ")}.${partial.length ? ` Minor differences: ${partial.join(", ")}.` : ""}`);
  }
  if (partial.length) return makeCheck(spec, "warn", `Minor differences in: ${partial.join(", ")}.`);
  return makeCheck(spec, "pass", `Consistent (${checked} checked).`);
}

export function evaluateNap(input: AuditInput): CheckResult[] {
  const checks: CheckResult[] = [];
  const access = siteAccess(input);

  if (access.kind === "scanned") {
    const phones = access.signals.phonesFound;
    if (!phones.length) {
      checks.push(makeCheck(WEBSITE_PHONE, "fail", "No phone number was found on the homepage."));
    } else if (phones.some((p) => comparePhone(input.business.phone, p) === "match")) {
      checks.push(makeCheck(WEBSITE_PHONE, "pass", `The homepage shows ${formatPhone(input.business.phone)}.`));
    } else {
      checks.push(
        makeCheck(
          WEBSITE_PHONE,
          "fail",
          `The homepage shows ${phones.map(formatPhone).join(", ")}, which does not match ${formatPhone(input.business.phone)}.`,
        ),
      );
    }
  } else if (access.kind === "unknown") {
    checks.push(unknownCheck(WEBSITE_PHONE, access.reason));
  }

  if (input.listings) {
    input.listings.forEach((listing, i) => checks.push(evaluateListing(input, listing, i)));
  } else {
    // Without listings the consistency picture is incomplete, so the category must not be scored.
    checks.push(unknownCheck(DIRECTORY_LISTINGS, "Directory listing details were not provided."));
  }

  return checks;
}
