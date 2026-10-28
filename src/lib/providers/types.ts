import type { AuditInput } from "../audit/types";

export type ProviderId = "demo" | "google_places";

export interface BusinessSearchResult {
  id: string;
  provider: ProviderId;
  name: string;
  category: string;
  addressLine: string;
  summary?: string;
  isDemo: boolean;
}

/**
 * A source of business data. Implementations must only return facts they
 * actually obtained — never placeholders or guesses — and leave everything
 * else undefined so the audit engine can mark it as unknown.
 */
export interface BusinessDataProvider {
  id: ProviderId;
  label: string;
  isAvailable(): boolean;
  search(query: string): Promise<BusinessSearchResult[]>;
  getAuditInput(businessId: string): Promise<AuditInput | null>;
}
