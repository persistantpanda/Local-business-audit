import { describe, expect, it } from "vitest";
import { DEMO_BUSINESSES } from "../providers/demo-data";
import { runAudit } from "./engine";
import type { AuditInput } from "./types";

const NOW = new Date("2026-10-28T12:00:00Z");

function demo(id: string): AuditInput {
  const found = DEMO_BUSINESSES.find((b) => b.id === id);
  if (!found) throw new Error(`missing demo ${id}`);
  return structuredClone(found.input);
}

function audit(input: AuditInput) {
  return runAudit(input, { id: "test", now: NOW });
}

describe("runAudit", () => {
  it("produces a final score when every category has complete data", () => {
    const report = audit(demo("demo-bluebird-bakery"));
    expect(report.overall.status).toBe("final");
    expect(report.overall.completedCategories).toBe(7);
    expect(report.overall.coverage).toBe(1);
    expect(report.overall.score).toBeGreaterThanOrEqual(80);
    expect(report.categories.every((c) => c.status === "complete" && c.score !== null)).toBe(true);
  });

  it("labels the result preliminary and excludes incomplete categories from the score", () => {
    const report = audit(demo("demo-summit-dental"));
    expect(report.overall.status).toBe("preliminary");

    const byId = Object.fromEntries(report.categories.map((c) => [c.id, c]));
    expect(byId.photos_presence.status).toBe("not_evaluated");
    expect(byId.photos_presence.score).toBeNull();
    // The website phone matches, but listings are unknown, so NAP is not scored.
    expect(byId.nap.status).toBe("partial");
    expect(byId.nap.score).toBeNull();
    expect(byId.local_seo.status).toBe("partial");
    expect(byId.local_seo.score).toBeNull();

    const complete = report.categories.filter((c) => c.status === "complete");
    const expected = Math.round(
      complete.reduce((s, c) => s + c.weight * (c.score as number), 0) / complete.reduce((s, c) => s + c.weight, 0),
    );
    expect(report.overall.score).toBe(expected);
    expect(report.overall.completedCategories).toBe(complete.length);
    expect(report.overall.coverage).toBeLessThan(1);
  });

  it("treats a confirmed missing website as a known failure, not missing data", () => {
    const report = audit(demo("demo-oak-iron-fitness"));
    const website = report.categories.find((c) => c.id === "website")!;
    expect(website.status).toBe("complete");
    expect(website.score).toBe(0);
    expect(report.recommendations[0].title).toMatch(/website/i);
    expect(report.recommendations[0].priority).toBe("critical");
    // Website-dependent checks roll up into the single "launch a website" fix.
    expect(report.recommendations.some((r) => /tap-to-call|call to action|Link your website/.test(r.title))).toBe(false);
  });

  it("returns no score at all when nothing could be evaluated", () => {
    const input: AuditInput = {
      isDemo: false,
      business: demo("demo-bluebird-bakery").business,
      sources: {},
    };
    const report = audit(input);
    expect(report.overall.status).toBe("insufficient_data");
    expect(report.overall.score).toBeNull();
    expect(report.overall.grade).toBeNull();
    expect(report.categories.every((c) => c.score === null)).toBe(true);
    expect(report.recommendations).toHaveLength(0);
  });

  it("marks website checks unknown when a scan fails", () => {
    const input = demo("demo-bluebird-bakery");
    input.website = { status: "scan_failed", url: "https://x.example", error: "the domain name could not be found" };
    const report = audit(input);
    const website = report.categories.find((c) => c.id === "website")!;
    expect(website.status).toBe("not_evaluated");
    expect(website.notes.join(" ")).toMatch(/could not scan/);
    expect(report.overall.status).toBe("preliminary");
  });

  it("detects NAP inconsistencies in demo listings", () => {
    const report = audit(demo("demo-harborview-plumbing"));
    const nap = report.categories.find((c) => c.id === "nap")!;
    const facebook = nap.checks.find((c) => c.label === "Facebook listing")!;
    expect(facebook.status).toBe("fail");
    expect(facebook.detail).toMatch(/phone/);
    const merged = report.recommendations.find((r) => r.title.startsWith("Fix inconsistent"));
    expect(merged?.affects.length).toBeGreaterThan(1);
  });

  it("orders recommendations from highest to lowest priority", () => {
    const report = audit(demo("demo-harborview-plumbing"));
    const scores = report.recommendations.map((r) => r.priorityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(report.recommendations.some((r) => r.quickWin)).toBe(true);
  });

  it("only lists the claim check when the Google profile is unclaimed", () => {
    const input = demo("demo-bluebird-bakery");
    input.gbp = { claimed: false };
    const report = audit(input);
    const gbp = report.categories.find((c) => c.id === "gbp")!;
    expect(gbp.checks).toHaveLength(1);
    expect(gbp.score).toBe(0);
    expect(report.recommendations[0].title).toMatch(/Claim/);
  });

  it("does not mutate its input", () => {
    const input = demo("demo-harborview-plumbing");
    const snapshot = structuredClone(input);
    audit(input);
    expect(input).toEqual(snapshot);
  });
});

describe("service keyword check", () => {
  it.each(["Gym", "Spa", "Bar", "Pub"])("can fully score Local SEO for the short category %s", (category) => {
    const input = demo("demo-bluebird-bakery");
    input.business.category = category;
    const report = audit(input);
    expect(report.categories.find((c) => c.id === "local_seo")!.status).toBe("complete");
    expect(report.overall.status).toBe("final");
  });
});
