import type { Metadata } from "next";
import { ManualAuditFormView } from "@/components/audit/manual-audit-form";

export const metadata: Metadata = { title: "Manual audit" };

export default function ManualAuditPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Enter a business manually</h1>
      <p className="mt-2 text-slate-600">
        Fill in what you know. Only the business details are required — every other answer improves the completeness of
        the audit.
      </p>
      <ManualAuditFormView />
    </div>
  );
}
