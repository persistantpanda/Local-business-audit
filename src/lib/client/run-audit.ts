"use client";

import type { AuditReport } from "../audit/types";
import type { ManualAuditForm } from "../providers/manual";
import { saveReport, setMemoryReport } from "./report-storage";

export type AuditRequest = { source: "demo"; businessId: string } | { source: "manual"; data: ManualAuditForm };

export class AuditRequestError extends Error {
  constructor(
    message: string,
    public details: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/** Run an audit on the server and save the report in this browser. */
export async function requestAudit(body: AuditRequest): Promise<AuditReport> {
  let res: Response;
  try {
    res = await fetch("/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuditRequestError("We couldn't reach the server. Check your connection and try again.");
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.report) {
    throw new AuditRequestError(json?.error ?? "The audit could not be completed.", json?.details ?? []);
  }
  const report = json.report as AuditReport;
  setMemoryReport(report);
  saveReport(report);
  return report;
}
