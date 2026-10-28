import { z } from "zod";
import type { AuditInput, GbpFacts, Listing, PhotoFacts, PresenceFacts, ReviewFacts } from "../audit/types";

/**
 * Manual entry: the user tells us what they know. Every answer can be left
 * as "unknown" (or blank) and is then excluded from scoring rather than
 * guessed.
 */

const triState = z.enum(["yes", "no", "unknown"]);
type TriState = z.infer<typeof triState>;

const text = (max: number) => z.string().trim().max(max);
const optionalCount = z.number().int().min(0).max(1_000_000).nullable();

export const SOCIAL_PLATFORMS = ["Facebook", "Instagram", "LinkedIn", "TikTok", "YouTube", "X (Twitter)", "Nextdoor", "Pinterest"] as const;

export const LISTING_SOURCES = [
  "Yelp",
  "Facebook",
  "Apple Business Connect",
  "Bing Places",
  "Better Business Bureau",
  "Nextdoor",
  "Angi",
  "Yellow Pages",
  "Foursquare",
  "TripAdvisor",
  "Other",
] as const;

export const manualAuditSchema = z.object({
  business: z.object({
    name: text(120).min(1, "Business name is required"),
    category: text(80).min(1, "Business category is required"),
    line1: text(160).min(1, "Street address is required"),
    line2: text(80).optional().default(""),
    city: text(80).min(1, "City is required"),
    region: text(40).min(1, "State is required"),
    postalCode: text(12).optional().default(""),
    phone: text(30).refine((p) => p.replace(/\D/g, "").length >= 10, "Enter a full phone number including area code"),
    hasWebsite: triState,
    website: text(300).optional().default(""),
  }).refine((b) => b.hasWebsite !== "yes" || b.website.length > 0, {
    message: "Enter the website address, or choose “No” or “Not sure”",
    path: ["website"],
  }),
  gbp: z.object({
    claimed: triState,
    primaryCategorySet: triState,
    additionalCategoriesCount: optionalCount,
    description: z.enum(["none", "short", "detailed", "unknown"]),
    hoursListed: triState,
    servicesListed: triState,
    postsLast30Days: optionalCount,
    websiteLinked: triState,
    actionLinkSet: triState,
  }),
  reviews: z.object({
    averageRating: z.number().min(1).max(5).nullable(),
    totalReviews: optionalCount,
    reviewsLast90Days: optionalCount,
    responseRatePercent: z.number().min(0).max(100).nullable(),
    lastReviewDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker for the most recent review")
      .nullable(),
  }),
  photos: z.object({
    totalPhotos: optionalCount,
    hasLogo: triState,
    hasCoverPhoto: triState,
    photosLast90Days: optionalCount,
  }),
  presence: z.object({
    socialKnown: z.boolean(),
    socialProfiles: z.array(z.enum(SOCIAL_PLATFORMS)).max(SOCIAL_PLATFORMS.length),
    postedToSocialLast30Days: triState,
  }),
  listings: z
    .array(
      z.object({
        source: z.enum(LISTING_SOURCES),
        otherSource: text(60).optional().default(""),
        name: text(120).optional().default(""),
        address: text(200).optional().default(""),
        phone: text(30).optional().default(""),
      }),
    )
    .max(12),
});

export type ManualAuditForm = z.input<typeof manualAuditSchema>;
export type ManualAuditData = z.output<typeof manualAuditSchema>;

function tri(value: TriState): boolean | undefined {
  return value === "unknown" ? undefined : value === "yes";
}

function num(value: number | null): number | undefined {
  return value === null ? undefined : value;
}

/** Drop undefined keys; return undefined when nothing at all is known. */
function compact<T extends object>(obj: T): T | undefined {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

export function daysBetween(isoDate: string, now: Date): number | undefined {
  const then = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(then)) return undefined;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((today - then) / 86_400_000);
  return days >= 0 ? days : undefined;
}

/**
 * Convert validated manual answers into engine input. The website is left
 * for the caller to scan (or mark as missing) because that requires network
 * access on the server.
 */
export function manualToAuditInput(data: ManualAuditData, now: Date): AuditInput {
  const b = data.business;

  const gbp = compact<GbpFacts>({
    claimed: tri(data.gbp.claimed),
    primaryCategorySet: tri(data.gbp.primaryCategorySet),
    additionalCategoriesCount: num(data.gbp.additionalCategoriesCount),
    description: data.gbp.description === "unknown" ? undefined : data.gbp.description,
    hoursListed: tri(data.gbp.hoursListed),
    servicesListed: tri(data.gbp.servicesListed),
    postsLast30Days: num(data.gbp.postsLast30Days),
    websiteLinked: tri(data.gbp.websiteLinked),
    actionLinkSet: tri(data.gbp.actionLinkSet),
  });

  const reviews = compact<ReviewFacts>({
    averageRating: num(data.reviews.averageRating),
    totalReviews: num(data.reviews.totalReviews),
    reviewsLast90Days: num(data.reviews.reviewsLast90Days),
    responseRatePercent: num(data.reviews.responseRatePercent),
    daysSinceLastReview: data.reviews.lastReviewDate ? daysBetween(data.reviews.lastReviewDate, now) : undefined,
  });

  const photos = compact<PhotoFacts>({
    totalPhotos: num(data.photos.totalPhotos),
    hasLogo: tri(data.photos.hasLogo),
    hasCoverPhoto: tri(data.photos.hasCoverPhoto),
    photosLast90Days: num(data.photos.photosLast90Days),
  });

  const presence = compact<PresenceFacts>({
    socialProfiles: data.presence.socialKnown ? [...data.presence.socialProfiles] : undefined,
    postedToSocialLast30Days: tri(data.presence.postedToSocialLast30Days),
  });

  const listings: Listing[] = data.listings
    .map((l) => ({
      source: l.source === "Other" ? l.otherSource || "Other directory" : l.source,
      name: l.name || undefined,
      address: l.address || undefined,
      phone: l.phone || undefined,
    }))
    .filter((l) => l.name || l.address || l.phone);

  return {
    isDemo: false,
    business: {
      name: b.name,
      category: b.category,
      address: { line1: b.line1, line2: b.line2 || undefined, city: b.city, region: b.region, postalCode: b.postalCode || undefined, country: "US" },
      phone: b.phone,
      website: b.hasWebsite === "yes" && b.website ? b.website : undefined,
    },
    gbp,
    reviews,
    photos,
    presence,
    listings: listings.length ? listings : undefined,
    website: b.hasWebsite === "no" ? { status: "none" } : undefined,
    sources: {
      ...(gbp && { gbp: "manual" as const }),
      ...(reviews && { reviews: "manual" as const }),
      ...(photos && { photos: "manual" as const }),
      ...(presence && { presence: "manual" as const }),
      ...(listings.length > 0 && { listings: "manual" as const }),
    },
  };
}
