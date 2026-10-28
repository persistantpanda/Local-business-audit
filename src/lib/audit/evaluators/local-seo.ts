import { makeCheck, siteAccess, siteCheck, unknownCheck } from "../checks";
import type { AuditInput, CheckResult } from "../types";

/** Directories and platforms that matter most for local search in the US. */
export const MAJOR_DIRECTORIES = [
  "Google Business Profile",
  "Apple Business Connect",
  "Bing Places",
  "Yelp",
  "Facebook",
  "Better Business Bureau",
  "Nextdoor",
  "Angi",
  "Yellow Pages",
  "Foursquare",
  "TripAdvisor",
] as const;

const TITLE_CITY = {
  id: "seo_title_city",
  label: "City named in page title",
  weight: 2,
  recommendation: {
    title: "Include your city in the homepage title",
    description: "Adding the city or service area to the title tag helps you rank for “near me” and “[service] in [city]” searches.",
    impact: "high",
    effort: "low",
  },
} as const;

const CITY_CONTENT = {
  id: "seo_city_content",
  label: "Location mentioned on the homepage",
  weight: 1,
  recommendation: {
    title: "Mention your location and service area on the homepage",
    description: "State the city and neighborhoods you serve in the page text, ideally alongside your full address.",
    impact: "medium",
    effort: "low",
  },
} as const;

const SCHEMA = {
  id: "seo_local_schema",
  label: "Local business structured data",
  weight: 2,
  recommendation: {
    title: "Add LocalBusiness structured data",
    description:
      "Schema.org LocalBusiness markup tells search engines your name, address, phone, hours and category in a machine-readable way. Many website builders offer it as a setting or plugin.",
    impact: "medium",
    effort: "medium",
  },
} as const;

const SERVICE_KEYWORD = {
  id: "seo_service_keyword",
  label: "Main service named in title or heading",
  weight: 1.5,
  recommendation: {
    title: "Name your main service in the title and heading",
    description: "Customers search for the service, not the business name. Make sure your core service appears in the page title and main heading.",
    impact: "medium",
    effort: "low",
  },
} as const;

const DIRECTORY_COVERAGE = {
  id: "seo_directory_coverage",
  label: "Presence on major directories",
  weight: 2,
  recommendation: {
    title: "Get listed on the major local directories",
    description:
      "Claim free listings on Apple Business Connect, Bing Places, Yelp, Facebook and industry-specific directories. Consistent listings reinforce your local relevance.",
    impact: "medium",
    effort: "medium",
  },
} as const;

const STOPWORDS = new Set(["and", "the", "for", "with", "services", "service", "shop", "store", "company"]);

/**
 * Word stems from the category, e.g. "Plumbing Contractor" → ["plum", "cont"].
 * Three-letter words ("Gym", "Spa") are kept whole so short categories can be checked.
 */
export function categoryStems(category: string): string[] {
  return category
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map((w) => w.slice(0, 4));
}

function mentionsCategory(text: string, category: string): boolean {
  const words = text.toLowerCase().split(/[^a-z]+/);
  const stems = categoryStems(category);
  return stems.some((stem) => words.some((w) => w.startsWith(stem)));
}

export function evaluateLocalSeo(input: AuditInput): CheckResult[] {
  const access = siteAccess(input);
  const city = input.business.address.city.toLowerCase();

  const directoryCheck = (() => {
    if (!input.listings) return unknownCheck(DIRECTORY_COVERAGE, "Directory listing information was not provided.");
    const sources = new Set(input.listings.map((l) => l.source.toLowerCase()));
    const found = MAJOR_DIRECTORIES.filter((d) => sources.has(d.toLowerCase()));
    const detail = found.length
      ? `Listed on ${found.length} major ${found.length === 1 ? "directory" : "directories"}: ${found.join(", ")}.`
      : "No listings on major directories were identified.";
    return makeCheck(DIRECTORY_COVERAGE, found.length >= 4 ? "pass" : found.length >= 2 ? "warn" : "fail", detail);
  })();

  return [
    siteCheck(TITLE_CITY, access, (s) =>
      s.title && s.title.toLowerCase().includes(city)
        ? makeCheck(TITLE_CITY, "pass", `The title mentions ${input.business.address.city}.`)
        : makeCheck(TITLE_CITY, "fail", `The title does not mention ${input.business.address.city}.`),
    ),
    siteCheck(CITY_CONTENT, access, (s) =>
      s.mentionsCity
        ? makeCheck(CITY_CONTENT, "pass", `The homepage mentions ${input.business.address.city}.`)
        : makeCheck(CITY_CONTENT, "fail", `The homepage does not mention ${input.business.address.city}.`),
    ),
    siteCheck(SCHEMA, access, (s) =>
      s.hasLocalBusinessSchema
        ? makeCheck(SCHEMA, "pass", "LocalBusiness structured data was found.")
        : makeCheck(SCHEMA, "fail", "No LocalBusiness structured data was found."),
    ),
    siteCheck(SERVICE_KEYWORD, access, (s) => {
      if (!categoryStems(input.business.category).length) {
        return unknownCheck(SERVICE_KEYWORD, "The business category is too general to check.");
      }
      const text = [s.title ?? "", ...s.h1Text].join(" ");
      return mentionsCategory(text, input.business.category)
        ? makeCheck(SERVICE_KEYWORD, "pass", `The title or heading references “${input.business.category}”.`)
        : makeCheck(SERVICE_KEYWORD, "fail", `Neither the title nor the main heading references “${input.business.category}”.`);
    }),
    directoryCheck,
  ];
}
