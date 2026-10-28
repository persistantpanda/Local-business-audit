"use client";

import { useSyncExternalStore } from "react";
import type { AuditReport } from "../audit/types";

/**
 * MVP persistence: reports are saved in this browser only. Replace with a
 * server-side store (database + accounts) before reports need to be shared
 * across devices or users.
 */
const STORAGE_KEY = "lba.reports.v1";
const CHANGE_EVENT = "lba:reports-changed";
const MAX_REPORTS = 50;

const EMPTY: AuditReport[] = [];
let cachedRaw: string | null = null;
let cachedReports: AuditReport[] = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): AuditReport[] {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((r) => r && r.schemaVersion === 1 && typeof r.id === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}

function snapshot(): AuditReport[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedReports = parse(raw);
  }
  return cachedReports;
}

function write(reports: AuditReport[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.slice(0, MAX_REPORTS)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    // Storage may be full or unavailable (e.g. some private browsing modes).
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Saved reports, newest first. `null` during server render / before hydration. */
export function useSavedReports(): AuditReport[] | null {
  return useSyncExternalStore<AuditReport[] | null>(subscribe, snapshot, () => null);
}

export function saveReport(report: AuditReport): boolean {
  const others = snapshot().filter((r) => r.id !== report.id);
  return write([report, ...others]);
}

export function deleteReport(id: string): void {
  write(snapshot().filter((r) => r.id !== id));
}

/** Fallback for when storage is unavailable: keep the latest report in memory. */
let memoryReport: AuditReport | null = null;
export function setMemoryReport(report: AuditReport): void {
  memoryReport = report;
}
export function getMemoryReport(id: string): AuditReport | null {
  return memoryReport?.id === id ? memoryReport : null;
}
