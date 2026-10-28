import type { CheckResult, CheckStatus, RecommendationTemplate, WebsiteSignals, AuditInput } from "./types";

interface CheckSpec {
  id: string;
  label: string;
  weight: number;
  recommendation?: RecommendationTemplate;
}

export function makeCheck(spec: CheckSpec, status: CheckStatus, detail: string): CheckResult {
  return {
    id: spec.id,
    label: spec.label,
    weight: spec.weight,
    status,
    detail,
    // Recommendations only travel with checks that found a problem.
    recommendation: status === "warn" || status === "fail" ? spec.recommendation : undefined,
  };
}

export function unknownCheck(spec: CheckSpec, detail = "Not enough data to evaluate."): CheckResult {
  return makeCheck(spec, "unknown", detail);
}

/** Yes/no fact: true → pass, false → fail (or warn), undefined → unknown. */
export function booleanCheck(
  spec: CheckSpec,
  value: boolean | undefined,
  messages: { pass: string; fail: string; unknown?: string },
  failStatus: "fail" | "warn" = "fail",
): CheckResult {
  if (value === undefined) return unknownCheck(spec, messages.unknown);
  return value ? makeCheck(spec, "pass", messages.pass) : makeCheck(spec, failStatus, messages.fail);
}

/** Numeric fact graded against pass / warn thresholds (higher is better). */
export function thresholdCheck(
  spec: CheckSpec,
  value: number | undefined,
  thresholds: { pass: number; warn: number },
  describe: (value: number) => string,
  unknownMessage?: string,
): CheckResult {
  if (value === undefined || Number.isNaN(value)) return unknownCheck(spec, unknownMessage);
  const status: CheckStatus = value >= thresholds.pass ? "pass" : value >= thresholds.warn ? "warn" : "fail";
  return makeCheck(spec, status, describe(value));
}

/** Numeric fact where lower is better (e.g. days since last review). */
export function maxThresholdCheck(
  spec: CheckSpec,
  value: number | undefined,
  thresholds: { pass: number; warn: number },
  describe: (value: number) => string,
  unknownMessage?: string,
): CheckResult {
  if (value === undefined || Number.isNaN(value)) return unknownCheck(spec, unknownMessage);
  const status: CheckStatus = value <= thresholds.pass ? "pass" : value <= thresholds.warn ? "warn" : "fail";
  return makeCheck(spec, status, describe(value));
}

/** Shared by every website-dependent check so a missing site yields one recommendation. */
export const NO_WEBSITE_RECOMMENDATION: RecommendationTemplate = {
  title: "Launch a simple, mobile-friendly website",
  description:
    "Most customers look for a website before calling or visiting. Even a one-page site with services, service area, hours, phone number and photos builds trust, supports local search rankings and gives customers a way to contact you.",
  impact: "high",
  effort: "medium",
};

export type SiteAccess =
  | { kind: "scanned"; signals: WebsiteSignals }
  | { kind: "none" }
  | { kind: "unknown"; reason: string };

export function siteAccess(input: AuditInput): SiteAccess {
  const site = input.website;
  if (!site) return { kind: "unknown", reason: "Website information was not provided." };
  if (site.status === "none") return { kind: "none" };
  if (site.status === "scan_failed") {
    return { kind: "unknown", reason: `The website could not be scanned (${site.error}).` };
  }
  return { kind: "scanned", signals: site.signals };
}

/**
 * Evaluate a check that depends on website signals. A confirmed lack of a
 * website is a known failure; an unscanned website is unknown.
 */
export function siteCheck(
  spec: CheckSpec,
  access: SiteAccess,
  evaluate: (signals: WebsiteSignals) => CheckResult,
): CheckResult {
  if (access.kind === "none") {
    return makeCheck({ ...spec, recommendation: NO_WEBSITE_RECOMMENDATION }, "fail", "The business does not have a website.");
  }
  if (access.kind === "unknown") return unknownCheck(spec, access.reason);
  return evaluate(access.signals);
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
