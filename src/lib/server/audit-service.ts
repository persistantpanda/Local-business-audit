import "server-only";

import { randomUUID } from "node:crypto";
import { runAudit } from "../audit/engine";
import type { AuditInput, AuditReport } from "../audit/types";
import { demoProvider } from "../providers/demo";
import { manualToAuditInput, type ManualAuditData } from "../providers/manual";
import { analyzeHtml } from "../website/analyze";
import { fetchPage } from "../website/fetch-page";

export async function auditDemoBusiness(businessId: string, now = new Date()): Promise<AuditReport | null> {
  const input = await demoProvider.getAuditInput(businessId);
  return input ? runAudit(input, { id: randomUUID(), now }) : null;
}

/** Scan the business website (if any) and attach the results to the input. */
export async function attachWebsiteScan(input: AuditInput): Promise<AuditInput> {
  const url = input.business.website;
  if (!url || input.website) return input;

  const page = await fetchPage(url);
  if (!page.ok) return { ...input, website: { status: "scan_failed", url, error: page.error } };

  const signals = analyzeHtml(page.html, {
    url,
    finalUrl: page.finalUrl,
    statusCode: page.statusCode,
    responseTimeMs: page.responseTimeMs,
    city: input.business.address.city,
  });
  return { ...input, website: { status: "scanned", signals, source: "website_scan" } };
}

export async function auditManualBusiness(data: ManualAuditData, now = new Date()): Promise<AuditReport> {
  const input = await attachWebsiteScan(manualToAuditInput(data, now));
  return runAudit(input, { id: randomUUID(), now });
}
