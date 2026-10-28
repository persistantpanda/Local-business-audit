import { booleanCheck, makeCheck, NO_WEBSITE_RECOMMENDATION, thresholdCheck, unknownCheck } from "../checks";
import type { AuditInput, CheckResult } from "../types";

const CLAIMED = {
  id: "gbp_claimed",
  label: "Profile claimed and verified",
  weight: 3,
  recommendation: {
    title: "Claim and verify your Google Business Profile",
    description:
      "An unclaimed profile can be edited by anyone and can't respond to reviews or post updates. Claim it at business.google.com and complete verification.",
    impact: "high",
    effort: "low",
  },
} as const;

const PRIMARY_CATEGORY = {
  id: "gbp_primary_category",
  label: "Primary category set",
  weight: 3,
  recommendation: {
    title: "Choose the most specific primary category",
    description:
      "Your primary category is one of the strongest signals Google uses to decide which searches you appear in. Pick the most specific category that matches your core service.",
    impact: "high",
    effort: "low",
  },
} as const;

const ADDITIONAL_CATEGORIES = {
  id: "gbp_additional_categories",
  label: "Additional categories",
  weight: 1,
  recommendation: {
    title: "Add relevant secondary categories",
    description: "Secondary categories help you show up for related services you offer. Add the ones that genuinely apply.",
    impact: "medium",
    effort: "low",
  },
} as const;

const DESCRIPTION = {
  id: "gbp_description",
  label: "Business description",
  weight: 1.5,
  recommendation: {
    title: "Write a complete business description",
    description:
      "Use most of the 750 available characters to explain what you do, who you serve and where. Mention your main services and service area naturally.",
    impact: "medium",
    effort: "low",
  },
} as const;

const HOURS = {
  id: "gbp_hours",
  label: "Business hours listed",
  weight: 2,
  recommendation: {
    title: "Publish accurate business hours",
    description:
      "Customers frequently check hours before visiting or calling. Missing hours lead to lost visits and can reduce visibility for “open now” searches.",
    impact: "high",
    effort: "low",
  },
} as const;

const SERVICES = {
  id: "gbp_services",
  label: "Services or products listed",
  weight: 1,
  recommendation: {
    title: "List your services or products",
    description: "Listing services (with short descriptions and prices where possible) helps customers and Google understand exactly what you offer.",
    impact: "medium",
    effort: "low",
  },
} as const;

const POSTS = {
  id: "gbp_posts",
  label: "Recent profile posts",
  weight: 1,
  recommendation: {
    title: "Post updates to your profile regularly",
    description: "Share offers, events, new work or seasonal tips at least twice a month to show customers the business is active.",
    impact: "medium",
    effort: "medium",
  },
} as const;

const WEBSITE_LINK = {
  id: "gbp_website_link",
  label: "Website linked from profile",
  weight: 2,
  recommendation: {
    title: "Link your website from your profile",
    description: "A website link gives searchers an easy next step and connects your profile to your site's authority.",
    impact: "high",
    effort: "low",
  },
} as const;

export function evaluateGbp(input: AuditInput): CheckResult[] {
  const gbp = input.gbp;
  const specs = [CLAIMED, PRIMARY_CATEGORY, ADDITIONAL_CATEGORIES, DESCRIPTION, HOURS, SERVICES, POSTS, WEBSITE_LINK];
  if (!gbp) return specs.map((s) => unknownCheck(s, "Google Business Profile details were not provided."));

  if (gbp.claimed === false) {
    // Nothing else on the profile can be managed until it is claimed.
    return [makeCheck(CLAIMED, "fail", "The profile is not claimed, so the business cannot manage it.")];
  }

  const descriptionCheck = (() => {
    switch (gbp.description) {
      case undefined:
        return unknownCheck(DESCRIPTION);
      case "detailed":
        return makeCheck(DESCRIPTION, "pass", "A detailed description is in place.");
      case "short":
        return makeCheck(DESCRIPTION, "warn", "The description is short (under about 250 characters).");
      case "none":
        return makeCheck(DESCRIPTION, "fail", "No business description is set.");
    }
  })();

  return [
    booleanCheck(CLAIMED, gbp.claimed, {
      pass: "The profile is claimed and managed by the business.",
      fail: "The profile is not claimed.",
    }),
    booleanCheck(PRIMARY_CATEGORY, gbp.primaryCategorySet, {
      pass: "A primary category is set.",
      fail: "No primary category is set.",
    }),
    thresholdCheck(ADDITIONAL_CATEGORIES, gbp.additionalCategoriesCount, { pass: 1, warn: 0 }, (n) =>
      n > 0 ? `${n} additional ${n === 1 ? "category" : "categories"} set.` : "No additional categories set.",
    ),
    descriptionCheck,
    booleanCheck(HOURS, gbp.hoursListed, { pass: "Business hours are listed.", fail: "Business hours are missing." }),
    booleanCheck(SERVICES, gbp.servicesListed, {
      pass: "Services or products are listed.",
      fail: "No services or products are listed.",
    }),
    thresholdCheck(POSTS, gbp.postsLast30Days, { pass: 2, warn: 1 }, (n) =>
      n === 0 ? "No posts in the last 30 days." : `${n} ${n === 1 ? "post" : "posts"} in the last 30 days.`,
    ),
    booleanCheck(
      // With no website there is nothing to link; the fix is to build one.
      input.website?.status === "none" ? { ...WEBSITE_LINK, recommendation: NO_WEBSITE_RECOMMENDATION } : WEBSITE_LINK,
      gbp.websiteLinked,
      { pass: "The profile links to a website.", fail: "The profile does not link to a website." },
    ),
  ];
}
