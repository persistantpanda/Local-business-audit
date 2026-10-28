import { describe, expect, it } from "vitest";
import { daysBetween, manualAuditSchema, manualToAuditInput, type ManualAuditForm } from "./manual";

const NOW = new Date("2026-10-28T15:00:00Z");

function form(overrides: Partial<ManualAuditForm> = {}): ManualAuditForm {
  return {
    business: {
      name: "Test Business",
      category: "Plumber",
      line1: "1 Main St",
      city: "Testville",
      region: "TS",
      phone: "(555) 555-0100",
      hasWebsite: "unknown",
    },
    gbp: {
      claimed: "unknown",
      primaryCategorySet: "unknown",
      additionalCategoriesCount: null,
      description: "unknown",
      hoursListed: "unknown",
      servicesListed: "unknown",
      postsLast30Days: null,
      websiteLinked: "unknown",
      actionLinkSet: "unknown",
    },
    reviews: { averageRating: null, totalReviews: null, reviewsLast90Days: null, responseRatePercent: null, lastReviewDate: null },
    photos: { totalPhotos: null, hasLogo: "unknown", hasCoverPhoto: "unknown", photosLast90Days: null },
    presence: { socialKnown: false, socialProfiles: [], postedToSocialLast30Days: "unknown" },
    listings: [],
    ...overrides,
  };
}

describe("manual entry", () => {
  it("leaves every unanswered group undefined instead of guessing", () => {
    const input = manualToAuditInput(manualAuditSchema.parse(form()), NOW);
    expect(input.gbp).toBeUndefined();
    expect(input.reviews).toBeUndefined();
    expect(input.photos).toBeUndefined();
    expect(input.presence).toBeUndefined();
    expect(input.listings).toBeUndefined();
    expect(input.website).toBeUndefined();
    expect(input.sources).toEqual({});
    expect(input.isDemo).toBe(false);
  });

  it("maps answers onto facts and computes review age", () => {
    const data = manualAuditSchema.parse(
      form({
        business: { ...form().business, hasWebsite: "no" },
        gbp: { ...form().gbp, claimed: "yes", hoursListed: "no", postsLast30Days: 0 },
        reviews: { ...form().reviews, averageRating: 4.6, lastReviewDate: "2026-10-18" },
        presence: { socialKnown: true, socialProfiles: [], postedToSocialLast30Days: "unknown" },
        listings: [{ source: "Other", otherSource: "Houzz", phone: "555-555-0100" }, { source: "Yelp" }],
      }),
    );
    const input = manualToAuditInput(data, NOW);
    expect(input.gbp).toEqual({ claimed: true, hoursListed: false, postsLast30Days: 0 });
    expect(input.reviews).toEqual({ averageRating: 4.6, daysSinceLastReview: 10 });
    expect(input.presence).toEqual({ socialProfiles: [] });
    expect(input.listings).toEqual([{ source: "Houzz", phone: "555-555-0100" }]);
    expect(input.website).toEqual({ status: "none" });
    expect(input.sources).toEqual({ gbp: "manual", reviews: "manual", presence: "manual", listings: "manual" });
  });

  it("requires a website address when the business says it has one", () => {
    const result = manualAuditSchema.safeParse(form({ business: { ...form().business, hasWebsite: "yes", website: "" } }));
    expect(result.success).toBe(false);
  });

  it("rejects incomplete phone numbers and out-of-range ratings", () => {
    expect(manualAuditSchema.safeParse(form({ business: { ...form().business, phone: "555-0100" } })).success).toBe(false);
    expect(manualAuditSchema.safeParse(form({ reviews: { ...form().reviews, averageRating: 6 } })).success).toBe(false);
  });

  it("ignores review dates in the future", () => {
    expect(daysBetween("2026-11-30", NOW)).toBeUndefined();
    expect(daysBetween("2026-10-28", NOW)).toBe(0);
  });
});
