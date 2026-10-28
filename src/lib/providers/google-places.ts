import "server-only";

import type { BusinessDataProvider } from "./types";

/**
 * Google Places API (New) provider — NOT YET IMPLEMENTED.
 *
 * This is the integration point for live business data. It is disabled
 * unless both GOOGLE_PLACES_ENABLED=true and GOOGLE_PLACES_API_KEY are set
 * on the server. The key is only ever read here (a server-only module), is
 * never sent to the browser, and must never be prefixed with NEXT_PUBLIC_.
 *
 * Planned implementation:
 *  - search(): Text Search (New) — POST https://places.googleapis.com/v1/places:searchText
 *    with a minimal X-Goog-FieldMask (id, displayName, formattedAddress,
 *    primaryTypeDisplayName) to keep per-request costs low.
 *  - getAuditInput(): Place Details (New) for rating, userRatingCount,
 *    regularOpeningHours, websiteUri, nationalPhoneNumber, photos and
 *    editorialSummary, mapped onto GbpFacts / ReviewFacts / PhotoFacts.
 *    Facts the API does not expose (posts, owner response rate, claim
 *    status) stay undefined so the audit marks them unknown.
 *  - Cache responses according to Google's terms and add per-user quotas
 *    before enabling in production, since every call is billed.
 */
export const googlePlacesProvider: BusinessDataProvider = {
  id: "google_places",
  label: "Google Places",

  isAvailable() {
    return process.env.GOOGLE_PLACES_ENABLED === "true" && Boolean(process.env.GOOGLE_PLACES_API_KEY);
  },

  async search() {
    throw new Error("Google Places search is not implemented yet.");
  },

  async getAuditInput() {
    throw new Error("Google Places details are not implemented yet.");
  },
};
