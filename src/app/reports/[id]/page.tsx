import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportLoader } from "@/components/report/report-loader";

export const metadata: Metadata = { title: "Audit report" };

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading report…</p>}>
        <ReportLoader />
      </Suspense>
    </div>
  );
}
