import { describe, expect, it } from "vitest";
import { gradeFor, prioritizeRecommendations, scoreCategory, scoreOverall } from "./scoring";
import type { CategoryResult, CheckResult } from "./types";

function check(status: CheckResult["status"], weight = 1, withRec = true): CheckResult {
  return {
    id: `c-${Math.random()}`,
    label: "Check",
    status,
    weight,
    detail: "",
    recommendation: withRec && (status === "fail" || status === "warn")
      ? { title: `Fix ${status}`, description: "", impact: "high", effort: "low" }
      : undefined,
  };
}

function category(id: CategoryResult["id"], weight: number, checks: CheckResult[]): CategoryResult {
  const s = scoreCategory(checks);
  return { id, name: id, description: "", weight, checks, dataSources: [], notes: [], ...s };
}

describe("scoreCategory", () => {
  it("scores pass=1, warn=0.5, fail=0 weighted", () => {
    expect(scoreCategory([check("pass", 2), check("warn", 1), check("fail", 1)])).toEqual({
      status: "complete",
      score: 63, // (2 + 0.5) / 4
      coverage: 1,
    });
  });

  it("does not score a category with any unknown check", () => {
    const result = scoreCategory([check("pass", 3), check("unknown", 1)]);
    expect(result).toEqual({ status: "partial", score: null, coverage: 0.75 });
  });

  it("is not evaluated when every check is unknown or there are no checks", () => {
    expect(scoreCategory([check("unknown")]).status).toBe("not_evaluated");
    expect(scoreCategory([]).status).toBe("not_evaluated");
  });
});

describe("scoreOverall", () => {
  it("averages only completed categories by weight", () => {
    const result = scoreOverall([
      category("gbp", 20, [check("pass")]), // 100
      category("reviews", 20, [check("fail")]), // 0
      category("website", 10, [check("unknown")]),
    ]);
    expect(result.status).toBe("preliminary");
    expect(result.score).toBe(50);
    expect(result.completedCategories).toBe(2);
    expect(result.coverage).toBeCloseTo(0.8);
  });

  it("is final only when everything is complete", () => {
    expect(scoreOverall([category("gbp", 20, [check("pass")])]).status).toBe("final");
  });
});

describe("gradeFor", () => {
  it("maps scores to grade bands", () => {
    expect(gradeFor(95)).toBe("Excellent");
    expect(gradeFor(75)).toBe("Good");
    expect(gradeFor(60)).toBe("Fair");
    expect(gradeFor(40)).toBe("Needs improvement");
    expect(gradeFor(10)).toBe("Poor");
  });
});

describe("prioritizeRecommendations", () => {
  it("ranks failures above warnings and skips passes and unknowns", () => {
    const recs = prioritizeRecommendations([
      category("gbp", 20, [check("warn"), check("fail"), check("pass"), check("unknown")]),
    ]);
    expect(recs.map((r) => r.title)).toEqual(["Fix fail", "Fix warn"]);
    expect(recs[0].priority).toBe("high");
  });
});
