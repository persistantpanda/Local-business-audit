import type { Metadata } from "next";
import { SavedReports } from "@/components/report/saved-reports";

export const metadata: Metadata = { title: "Saved reports" };

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Saved reports</h1>
      <p className="mt-2 text-sm text-slate-600">Reports are saved in this browser on this device.</p>
      <SavedReports />
    </div>
  );
}
