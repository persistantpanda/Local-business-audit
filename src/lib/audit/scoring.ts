import type {
  CategoryResult,
  CategoryStatus,
  CheckResult,
  CheckStatus,
  Effort,
  Impact,
  OverallResult,
  Priority,
  Recommendation,
} from "./types";

const EARNED: Record<Exclude<CheckStatus, "unknown">, number> = { pass: 1, warn: 0.5, fail: 0 };

export interface CategoryScore {
  status: CategoryStatus;
  score: number | null;
  coverage: number;
}

/**
 * A category is only scored when every one of its checks had data. Partially
 * evaluated categories keep their findings but receive no score, so missing
 * data can never inflate or deflate a result.
 */
export function scoreCategory(checks: CheckResult[]): CategoryScore {
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const known = checks.filter((c) => c.status !== "unknown");
  const knownWeight = known.reduce((sum, c) => sum + c.weight, 0);

  if (!checks.length || !known.length || totalWeight === 0) {
    return { status: "not_evaluated", score: null, coverage: 0 };
  }
  const coverage = knownWeight / totalWeight;
  if (known.length < checks.length) return { status: "partial", score: null, coverage };

  const earned = known.reduce((sum, c) => sum + c.weight * EARNED[c.status as keyof typeof EARNED], 0);
  return { status: "complete", score: Math.round((earned / totalWeight) * 100), coverage: 1 };
}

export function gradeFor(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs improvement";
  return "Poor";
}

/**
 * The overall score is a weighted average of *completed* categories only. If
 * any category is incomplete the result is labeled preliminary; if none are
 * complete there is no score at all.
 */
export function scoreOverall(categories: CategoryResult[]): OverallResult {
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  const complete = categories.filter((c) => c.status === "complete" && c.score !== null);
  const completeWeight = complete.reduce((sum, c) => sum + c.weight, 0);

  if (!complete.length || completeWeight === 0) {
    return {
      status: "insufficient_data",
      score: null,
      grade: null,
      completedCategories: 0,
      totalCategories: categories.length,
      coverage: 0,
    };
  }

  const score = Math.round(complete.reduce((sum, c) => sum + c.weight * (c.score as number), 0) / completeWeight);
  return {
    status: complete.length === categories.length ? "final" : "preliminary",
    score,
    grade: gradeFor(score),
    completedCategories: complete.length,
    totalCategories: categories.length,
    coverage: totalWeight ? completeWeight / totalWeight : 0,
  };
}

const IMPACT_POINTS: Record<Impact, number> = { high: 6, medium: 3.5, low: 1.5 };
const EFFORT_POINTS: Record<Effort, number> = { low: 1.5, medium: 0.75, high: 0 };
const STATUS_POINTS = { fail: 2, warn: 0.5 } as const;

export function priorityFor(score: number): Priority {
  if (score >= 10) return "critical";
  if (score >= 8) return "high";
  if (score >= 5.5) return "medium";
  return "low";
}

function computePriority(rec: Recommendation): void {
  // A fix that resolves several failed checks is worth more than one that resolves a single check.
  const breadth = Math.min(rec.affects.length - 1, 4) * 0.5;
  rec.priorityScore = IMPACT_POINTS[rec.impact] + STATUS_POINTS[rec.checkStatus] + EFFORT_POINTS[rec.effort] + breadth;
  rec.priority = priorityFor(rec.priorityScore);
}

/**
 * Collect recommendations from every failed or warning check (including
 * those in partially evaluated categories — the finding itself is real),
 * merge duplicates and order them by impact, severity, effort and breadth.
 */
export function prioritizeRecommendations(categories: CategoryResult[]): Recommendation[] {
  const merged = new Map<string, Recommendation>();

  for (const category of categories) {
    for (const check of category.checks) {
      const rec = check.recommendation;
      if (!rec || (check.status !== "fail" && check.status !== "warn")) continue;

      // Keyed by title so a shared fix (e.g. "launch a website") appears once.
      const existing = merged.get(rec.title);
      if (existing) {
        existing.affects.push(check.label);
        if (check.status === "fail") existing.checkStatus = "fail";
        continue;
      }

      merged.set(rec.title, {
        ...rec,
        id: `${category.id}:${check.id}`,
        categoryId: category.id,
        categoryName: category.name,
        checkStatus: check.status,
        priorityScore: 0,
        priority: "low",
        quickWin: rec.effort === "low" && rec.impact !== "low",
        affects: [check.label],
      });
    }
  }

  const recommendations = [...merged.values()];
  recommendations.forEach(computePriority);
  return recommendations.sort((a, b) => b.priorityScore - a.priorityScore || a.title.localeCompare(b.title));
}
