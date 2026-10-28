import type { Metadata } from "next";
import { BusinessSearch } from "@/components/audit/business-search";

export const metadata: Metadata = { title: "New audit" };

export default function NewAuditPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Start a new audit</h1>
      <p className="mt-2 text-slate-600">Search for a business and select it to run an audit.</p>
      <BusinessSearch />
    </div>
  );
}
