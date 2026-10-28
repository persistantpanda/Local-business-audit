import type { CategoryStatus, CheckStatus, DataSource, Priority } from "@/lib/audit/types";

export const CHECK_STATUS: Record<CheckStatus, { label: string; pill: string; text: string; icon: string }> = {
  pass: { text: "text-pass", label: "Pass", pill: "bg-pass-soft text-pass", icon: "✓" },
  warn: { text: "text-warn", label: "Needs work", pill: "bg-warn-soft text-warn", icon: "!" },
  fail: { text: "text-fail", label: "Issue", pill: "bg-fail-soft text-fail", icon: "✕" },
  unknown: { text: "text-unknown", label: "Unknown", pill: "bg-unknown-soft text-unknown", icon: "?" },
};

export const CATEGORY_STATUS: Record<CategoryStatus, { label: string; pill: string }> = {
  complete: { label: "Complete", pill: "bg-pass-soft text-pass" },
  partial: { label: "Incomplete — not scored", pill: "bg-warn-soft text-warn" },
  not_evaluated: { label: "Not evaluated", pill: "bg-unknown-soft text-unknown" },
};

export const PRIORITY: Record<Priority, { label: string; pill: string }> = {
  critical: { label: "Fix first", pill: "bg-fail text-white" },
  high: { label: "High", pill: "bg-fail-soft text-fail" },
  medium: { label: "Medium", pill: "bg-warn-soft text-warn" },
  low: { label: "Low", pill: "bg-unknown-soft text-unknown" },
};

export const SOURCE_LABEL: Record<DataSource, string> = {
  demo: "Demonstration data",
  manual: "Provided by you",
  website_scan: "Automated website scan",
  google_places: "Google Places",
};

export function scoreColor(score: number): string {
  if (score >= 75) return "var(--color-pass)";
  if (score >= 50) return "var(--color-warn)";
  return "var(--color-fail)";
}
