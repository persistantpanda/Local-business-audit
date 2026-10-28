"use client";

import Link from "next/link";
import { useSavedReports } from "@/lib/client/report-storage";
import { DemoBadge, Pill } from "../ui/pill";
import { scoreColor } from "./labels";

export function SavedReports() {
  const reports = useSavedReports();

  if (reports === null) return <p className="mt-8 text-sm text-slate-500">Loading…</p>;

  if (reports.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-medium text-slate-800">No saved reports yet</p>
        <p className="mt-1 text-sm text-slate-500">Reports you run will appear here.</p>
        <Link href="/audit/new" className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">
          Start an audit
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 grid gap-3">
      {reports.map((r) => (
        <li key={r.id}>
          <Link href={`/reports/${r.id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-200 hover:shadow-sm">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold tabular-nums text-white"
              style={{ background: r.overall.score === null ? "var(--color-unknown)" : scoreColor(r.overall.score) }}
            >
              {r.overall.score ?? "—"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-slate-900">{r.business.name}</div>
              <div className="mt-0.5 text-sm text-slate-500">
                {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {r.business.category}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {r.isDemo && <DemoBadge />}
              {r.overall.status === "preliminary" && <Pill className="bg-warn-soft text-warn">Preliminary</Pill>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
