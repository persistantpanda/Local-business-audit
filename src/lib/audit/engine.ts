import { evaluateConversion } from "./evaluators/conversion";
import { evaluateGbp } from "./evaluators/gbp";
import { evaluateLocalSeo } from "./evaluators/local-seo";
import { evaluateNap } from "./evaluators/nap";
import { evaluatePhotosPresence } from "./evaluators/photos-presence";
import { evaluateReviews } from "./evaluators/reviews";
import { evaluateWebsite } from "./evaluators/website";
import { prioritizeRecommendations, scoreCategory, scoreOverall } from "./scoring";
import type { AuditInput, AuditReport, CategoryId, CategoryResult, CheckResult, DataSource, FactGroup } from "./types";

interface CategoryDefinition {
  id: CategoryId;
  name: string;
  description: string;
  weight: number;
  evaluate: (input: AuditInput) => CheckResult[];
  /** Fact groups this category reads, used to report data sources. */
  factGroups: FactGroup[];
  usesWebsite: boolean;
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: "gbp",
    name: "Google Business Profile",
    description: "How complete and actively managed the business's Google profile is.",
    weight: 20,
    evaluate: evaluateGbp,
    factGroups: ["gbp"],
    usesWebsite: false,
  },
  {
    id: "reviews",
    name: "Reviews & Reputation",
    description: "Rating, review volume, recency and how the business responds.",
    weight: 20,
    evaluate: evaluateReviews,
    factGroups: ["reviews"],
    usesWebsite: false,
  },
  {
    id: "website",
    name: "Website Quality",
    description: "Security, mobile-friendliness, speed and on-page basics of the homepage.",
    weight: 15,
    evaluate: evaluateWebsite,
    factGroups: [],
    usesWebsite: true,
  },
  {
    id: "local_seo",
    name: "Local SEO",
    description: "Signals that help the business appear in local and “near me” searches.",
    weight: 15,
    evaluate: evaluateLocalSeo,
    factGroups: ["listings"],
    usesWebsite: true,
  },
  {
    id: "nap",
    name: "Name, Address & Phone Consistency",
    description: "Whether business details match across the website and directory listings.",
    weight: 10,
    evaluate: evaluateNap,
    factGroups: ["listings"],
    usesWebsite: true,
  },
  {
    id: "photos_presence",
    name: "Photos & Online Presence",
    description: "Photo coverage and freshness, plus social media presence.",
    weight: 10,
    evaluate: evaluatePhotosPresence,
    factGroups: ["photos", "presence"],
    usesWebsite: false,
  },
  {
    id: "conversion",
    name: "Customer Conversion",
    description: "How easy it is for an interested visitor to call, book or get in touch.",
    weight: 10,
    evaluate: evaluateConversion,
    factGroups: ["gbp"],
    usesWebsite: true,
  },
];

function sourcesFor(def: CategoryDefinition, input: AuditInput): DataSource[] {
  const sources = new Set<DataSource>();
  for (const group of def.factGroups) {
    const source = input.sources[group];
    if (source) sources.add(source);
  }
  if (def.usesWebsite && input.website?.status === "scanned") sources.add(input.website.source);
  if (def.usesWebsite && input.website?.status === "none") sources.add(input.isDemo ? "demo" : "manual");
  return [...sources];
}

function notesFor(def: CategoryDefinition, input: AuditInput, checks: CheckResult[]): string[] {
  const notes: string[] = [];
  if (def.usesWebsite && input.website?.status === "scan_failed") {
    notes.push(`We could not scan ${input.website.url}: ${input.website.error}. Website-based checks were not scored.`);
  }
  if (checks.some((c) => c.status === "unknown")) {
    notes.push("Some checks lacked data, so this category is not scored. Provide the missing details and re-run the audit for a complete result.");
  }
  return notes;
}

export interface RunAuditOptions {
  id: string;
  now: Date;
}

export function runAudit(input: AuditInput, options: RunAuditOptions): AuditReport {
  const categories: CategoryResult[] = CATEGORIES.map((def) => {
    const checks = def.evaluate(input);
    const { status, score, coverage } = scoreCategory(checks);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      weight: def.weight,
      status,
      score,
      coverage,
      checks,
      dataSources: sourcesFor(def, input),
      notes: notesFor(def, input, checks),
    };
  });

  return {
    id: options.id,
    schemaVersion: 1,
    createdAt: options.now.toISOString(),
    business: input.business,
    isDemo: input.isDemo,
    overall: scoreOverall(categories),
    categories,
    recommendations: prioritizeRecommendations(categories),
  };
}
