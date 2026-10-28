/**
 * Core domain types for the audit engine.
 *
 * The engine is deliberately framework-free: it receives "facts" about a
 * business (each optional — absent means *unknown*, never assumed) and
 * produces a scored report. Facts may come from demonstration data, manual
 * entry, an automated website scan, or (later) the Google Places API.
 */

export type DataSource = "demo" | "manual" | "website_scan" | "google_places";

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
}

export interface BusinessIdentity {
  name: string;
  category: string;
  address: Address;
  phone: string;
  website?: string;
}

export type DescriptionQuality = "none" | "short" | "detailed";

export interface GbpFacts {
  claimed?: boolean;
  primaryCategorySet?: boolean;
  additionalCategoriesCount?: number;
  description?: DescriptionQuality;
  hoursListed?: boolean;
  servicesListed?: boolean;
  postsLast30Days?: number;
  websiteLinked?: boolean;
  /** Booking, ordering, quote or appointment link configured on the profile. */
  actionLinkSet?: boolean;
}

export interface ReviewFacts {
  averageRating?: number;
  totalReviews?: number;
  reviewsLast90Days?: number;
  /** 0–100 */
  responseRatePercent?: number;
  daysSinceLastReview?: number;
}

export interface PhotoFacts {
  totalPhotos?: number;
  hasLogo?: boolean;
  hasCoverPhoto?: boolean;
  photosLast90Days?: number;
}

export interface PresenceFacts {
  socialProfiles?: string[];
  postedToSocialLast30Days?: boolean;
}

/** How the business appears on a third-party directory or platform. */
export interface Listing {
  source: string;
  name?: string;
  address?: string;
  phone?: string;
}

/** Signals extracted from a business website by the analyzer. */
export interface WebsiteSignals {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  https: boolean;
  title?: string;
  metaDescription?: string;
  hasViewport: boolean;
  h1Count: number;
  h1Text: string[];
  hasTelLink: boolean;
  phonesFound: string[];
  hasContactForm: boolean;
  hasEmailLink: boolean;
  hasLocalBusinessSchema: boolean;
  mentionsCity: boolean;
  imageCount: number;
  imagesMissingAlt: number;
  hasOpenGraph: boolean;
  hasMapEmbed: boolean;
  hasBookingLink: boolean;
  hasCallToAction: boolean;
}

export type WebsiteState =
  | { status: "none" }
  | { status: "scanned"; signals: WebsiteSignals; source: DataSource }
  | { status: "scan_failed"; url: string; error: string };

export interface AuditInput {
  business: BusinessIdentity;
  isDemo: boolean;
  gbp?: GbpFacts;
  reviews?: ReviewFacts;
  photos?: PhotoFacts;
  presence?: PresenceFacts;
  listings?: Listing[];
  /** undefined = we don't know whether the business has a website. */
  website?: WebsiteState;
  /** Where each group of facts came from, for transparency in the report. */
  sources: Partial<Record<FactGroup, DataSource>>;
}

export type FactGroup = "gbp" | "reviews" | "photos" | "presence" | "listings";

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type CategoryId =
  | "gbp"
  | "website"
  | "local_seo"
  | "reviews"
  | "nap"
  | "photos_presence"
  | "conversion";

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";
export type Impact = "high" | "medium" | "low";
export type Effort = "low" | "medium" | "high";

export interface RecommendationTemplate {
  title: string;
  description: string;
  impact: Impact;
  effort: Effort;
}

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  weight: number;
  recommendation?: RecommendationTemplate;
}

export type CategoryStatus = "complete" | "partial" | "not_evaluated";

export interface CategoryResult {
  id: CategoryId;
  name: string;
  description: string;
  weight: number;
  status: CategoryStatus;
  /** 0–100, only present when status is "complete". */
  score: number | null;
  /** Share of check weight that had data, 0–1. */
  coverage: number;
  checks: CheckResult[];
  dataSources: DataSource[];
  notes: string[];
}

export type Priority = "critical" | "high" | "medium" | "low";

export interface Recommendation extends RecommendationTemplate {
  id: string;
  categoryId: CategoryId;
  categoryName: string;
  checkStatus: Exclude<CheckStatus, "pass" | "unknown">;
  priority: Priority;
  priorityScore: number;
  quickWin: boolean;
  /** Labels of the checks this recommendation addresses. */
  affects: string[];
}

export type OverallStatus = "final" | "preliminary" | "insufficient_data";

export interface OverallResult {
  status: OverallStatus;
  score: number | null;
  grade: string | null;
  completedCategories: number;
  totalCategories: number;
  /** Share of total category weight that was fully evaluated, 0–1. */
  coverage: number;
}

export interface AuditReport {
  id: string;
  schemaVersion: 1;
  createdAt: string;
  business: BusinessIdentity;
  isDemo: boolean;
  overall: OverallResult;
  categories: CategoryResult[];
  recommendations: Recommendation[];
}
