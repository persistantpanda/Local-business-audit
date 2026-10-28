import { formatAddress } from "../audit/nap";
import { DEMO_BUSINESSES } from "./demo-data";
import type { BusinessDataProvider, BusinessSearchResult } from "./types";

function toResult(b: (typeof DEMO_BUSINESSES)[number]): BusinessSearchResult {
  return {
    id: b.id,
    provider: "demo",
    name: b.input.business.name,
    category: b.input.business.category,
    addressLine: formatAddress(b.input.business.address),
    summary: b.summary,
    isDemo: true,
  };
}

export const demoProvider: BusinessDataProvider = {
  id: "demo",
  label: "Demonstration data",
  isAvailable: () => true,

  async search(query) {
    const q = query.trim().toLowerCase();
    const matches = q
      ? DEMO_BUSINESSES.filter(({ input: { business: b } }) =>
          [b.name, b.category, b.address.city].some((field) => field.toLowerCase().includes(q)),
        )
      : DEMO_BUSINESSES;
    return matches.map(toResult);
  },

  async getAuditInput(businessId) {
    const found = DEMO_BUSINESSES.find((b) => b.id === businessId);
    // Return a deep copy so callers can never mutate the shared fixtures.
    return found ? structuredClone(found.input) : null;
  },
};
