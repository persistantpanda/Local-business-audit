"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deleteReport, getMemoryReport, useSavedReports } from "@/lib/client/report-storage";
import { ReportView } from "./report-view";

export function ReportLoader() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const saved = useSavedReports();

  if (saved === null) return <p className="text-sm text-slate-500">Loading report…</p>;

  const report = saved.find((r) => r.id === id) ?? getMemoryReport(id);
  if (!report) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Report not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Reports are saved in the browser where they were created. It may have been deleted or created on another device.
        </p>
        <Link href="/audit/new" className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">
          Start a new audit
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/reports" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Saved reports
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this report? This can't be undone.")) {
                deleteReport(report.id);
                router.push("/reports");
              }
            }}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
      <ReportView report={report} />
    </>
  );
}
