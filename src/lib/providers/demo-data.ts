import type { AuditInput, WebsiteSignals } from "../audit/types";

/**
 * DEMONSTRATION DATA — every business below is fictional.
 *
 * Names, addresses and figures are invented for product demos and testing.
 * Phone numbers use the reserved 555-01xx exchange and websites use the
 * reserved ".example" domain so they can never point at a real business.
 */

export interface DemoBusiness {
  id: string;
  summary: string;
  input: AuditInput;
}

const DEMO_CITY = "Port Alder";
const DEMO_REGION = "DS";

function site(partial: Partial<WebsiteSignals> & Pick<WebsiteSignals, "url">): WebsiteSignals {
  return {
    finalUrl: partial.url,
    statusCode: 200,
    responseTimeMs: 900,
    https: true,
    hasViewport: true,
    h1Count: 1,
    h1Text: [],
    hasTelLink: true,
    phonesFound: [],
    hasContactForm: true,
    hasEmailLink: true,
    hasLocalBusinessSchema: true,
    mentionsCity: true,
    imageCount: 10,
    imagesMissingAlt: 0,
    hasOpenGraph: true,
    hasMapEmbed: true,
    hasBookingLink: true,
    hasCallToAction: true,
    ...partial,
  };
}

export const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    id: "demo-harborview-plumbing",
    summary: "Residential plumbing service with a dated website and inconsistent listings.",
    input: {
      isDemo: true,
      business: {
        name: "Harborview Plumbing Co.",
        category: "Plumber",
        address: { line1: "418 Quay Street", line2: "Suite 2", city: DEMO_CITY, region: DEMO_REGION, postalCode: "00012", country: "US" },
        phone: "(555) 555-0142",
        website: "https://harborview-plumbing.example",
      },
      sources: { gbp: "demo", reviews: "demo", photos: "demo", presence: "demo", listings: "demo" },
      gbp: {
        claimed: true,
        primaryCategorySet: true,
        additionalCategoriesCount: 0,
        description: "short",
        hoursListed: true,
        servicesListed: false,
        postsLast30Days: 0,
        websiteLinked: true,
        actionLinkSet: false,
      },
      reviews: { averageRating: 4.3, totalReviews: 38, reviewsLast90Days: 3, responseRatePercent: 25, daysSinceLastReview: 41 },
      photos: { totalPhotos: 12, hasLogo: true, hasCoverPhoto: false, photosLast90Days: 0 },
      presence: { socialProfiles: ["Facebook"], postedToSocialLast30Days: false },
      listings: [
        { source: "Yelp", name: "Harborview Plumbing", address: "418 Quay St, Port Alder, DS 00012", phone: "555-555-0142" },
        { source: "Facebook", name: "Harborview Plumbing Co", address: "418 Quay Street Suite 2, Port Alder, DS 00012", phone: "(555) 555-0199" },
        { source: "Bing Places", name: "Harbor View Plumbing & Drain", address: "418 Quay St Ste 2, Port Alder, DS 00012", phone: "555.555.0142" },
      ],
      website: {
        status: "scanned",
        source: "demo",
        signals: site({
          url: "https://harborview-plumbing.example",
          https: false,
          finalUrl: "http://harborview-plumbing.example/",
          responseTimeMs: 3200,
          title: "Home",
          metaDescription: undefined,
          h1Count: 0,
          h1Text: [],
          hasTelLink: false,
          phonesFound: ["5555550142"],
          hasContactForm: false,
          hasEmailLink: true,
          hasLocalBusinessSchema: false,
          mentionsCity: true,
          imageCount: 14,
          imagesMissingAlt: 9,
          hasOpenGraph: false,
          hasMapEmbed: false,
          hasBookingLink: false,
          hasCallToAction: true,
        }),
      },
    },
  },
  {
    id: "demo-bluebird-bakery",
    summary: "Well-run neighborhood bakery and café with a strong online presence.",
    input: {
      isDemo: true,
      business: {
        name: "Bluebird Bakery & Café",
        category: "Bakery",
        address: { line1: "77 Larch Avenue", city: DEMO_CITY, region: DEMO_REGION, postalCode: "00014", country: "US" },
        phone: "(555) 555-0177",
        website: "https://bluebird-bakery.example",
      },
      sources: { gbp: "demo", reviews: "demo", photos: "demo", presence: "demo", listings: "demo" },
      gbp: {
        claimed: true,
        primaryCategorySet: true,
        additionalCategoriesCount: 2,
        description: "detailed",
        hoursListed: true,
        servicesListed: true,
        postsLast30Days: 4,
        websiteLinked: true,
        actionLinkSet: true,
      },
      reviews: { averageRating: 4.7, totalReviews: 212, reviewsLast90Days: 19, responseRatePercent: 64, daysSinceLastReview: 3 },
      photos: { totalPhotos: 86, hasLogo: true, hasCoverPhoto: true, photosLast90Days: 11 },
      presence: { socialProfiles: ["Instagram", "Facebook"], postedToSocialLast30Days: true },
      listings: [
        { source: "Yelp", name: "Bluebird Bakery & Cafe", address: "77 Larch Ave, Port Alder, DS 00014", phone: "555-555-0177" },
        { source: "Facebook", name: "Bluebird Bakery and Café", address: "77 Larch Avenue, Port Alder, DS 00014", phone: "(555) 555-0177" },
        { source: "Apple Business Connect", name: "Bluebird Bakery & Café", address: "77 Larch Ave, Port Alder, DS 00014", phone: "+1 555 555 0177" },
        { source: "TripAdvisor", name: "Bluebird Bakery", address: "77 Larch Ave, Port Alder, DS", phone: "555-555-0177" },
      ],
      website: {
        status: "scanned",
        source: "demo",
        signals: site({
          url: "https://bluebird-bakery.example",
          finalUrl: "https://bluebird-bakery.example/",
          responseTimeMs: 640,
          title: "Bluebird Bakery & Café | Fresh Bread & Pastries in Port Alder",
          metaDescription: "Neighborhood bakery and café in Port Alder baking sourdough, croissants and celebration cakes daily. Order online for pickup.",
          h1Text: ["Port Alder's neighborhood bakery"],
          phonesFound: ["5555550177"],
          imageCount: 24,
          imagesMissingAlt: 1,
          hasContactForm: false,
          hasEmailLink: true,
        }),
      },
    },
  },
  {
    id: "demo-summit-dental",
    summary: "Family dental practice with incomplete data — demonstrates a preliminary score.",
    input: {
      isDemo: true,
      business: {
        name: "Summit Family Dental",
        category: "Dentist",
        address: { line1: "1200 Ridgeline Drive", line2: "Suite 140", city: DEMO_CITY, region: DEMO_REGION, postalCode: "00018", country: "US" },
        phone: "(555) 555-0120",
        website: "https://summit-family-dental.example",
      },
      // Photos, social presence and directory listings were not collected.
      sources: { gbp: "demo", reviews: "demo" },
      gbp: {
        claimed: true,
        primaryCategorySet: true,
        additionalCategoriesCount: 1,
        description: "detailed",
        hoursListed: true,
        servicesListed: true,
        postsLast30Days: 1,
        websiteLinked: true,
        actionLinkSet: true,
      },
      reviews: { averageRating: 4.8, totalReviews: 96, reviewsLast90Days: 7, responseRatePercent: 91, daysSinceLastReview: 9 },
      website: {
        status: "scanned",
        source: "demo",
        signals: site({
          url: "https://summit-family-dental.example",
          finalUrl: "https://summit-family-dental.example/",
          responseTimeMs: 1100,
          title: "Summit Family Dental",
          metaDescription: "Gentle family and cosmetic dentistry. New patients welcome — book your visit online today.",
          h1Text: ["Welcome to Summit Family Dental"],
          phonesFound: ["5555550120"],
          hasLocalBusinessSchema: false,
          mentionsCity: true,
          imageCount: 8,
          imagesMissingAlt: 2,
        }),
      },
    },
  },
  {
    id: "demo-oak-iron-fitness",
    summary: "Independent gym with no website and an under-managed Google profile.",
    input: {
      isDemo: true,
      business: {
        name: "Oak & Iron Fitness",
        category: "Gym",
        address: { line1: "9 Foundry Lane", city: DEMO_CITY, region: DEMO_REGION, postalCode: "00016", country: "US" },
        phone: "(555) 555-0109",
      },
      sources: { gbp: "demo", reviews: "demo", photos: "demo", presence: "demo", listings: "demo" },
      gbp: {
        claimed: true,
        primaryCategorySet: true,
        additionalCategoriesCount: 0,
        description: "none",
        hoursListed: false,
        servicesListed: false,
        postsLast30Days: 0,
        websiteLinked: false,
        actionLinkSet: false,
      },
      reviews: { averageRating: 3.9, totalReviews: 14, reviewsLast90Days: 1, responseRatePercent: 0, daysSinceLastReview: 118 },
      photos: { totalPhotos: 4, hasLogo: false, hasCoverPhoto: true, photosLast90Days: 0 },
      presence: { socialProfiles: ["Instagram"], postedToSocialLast30Days: true },
      listings: [
        { source: "Yelp", name: "Oak and Iron Fitness", address: "9 Foundry Ln, Port Alder, DS 00016", phone: "555-555-0109" },
        { source: "Facebook", name: "Oak & Iron Gym", address: "11 Foundry Lane, Port Alder, DS 00016", phone: "555-555-0109" },
      ],
      website: { status: "none" },
    },
  },
];
