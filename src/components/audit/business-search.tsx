"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AuditRequestError, requestAudit } from "@/lib/client/run-audit";
import type { BusinessSearchResult } from "@/lib/providers/types";
import { DemoBadge } from "../ui/pill";

type SearchState = { status: "loading" } | { status: "ready"; results: BusinessSearchResult[] } | { status: "error" };

export function BusinessSearch() {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/businesses?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((json: { results: BusinessSearchResult[] }) => setSearch({ status: "ready", results: json.results }))
        .catch((err: unknown) => {
          if ((err as Error).name !== "AbortError") setSearch({ status: "error" });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const results = search.status === "ready" ? search.results : [];
  const selected = results.find((r) => r.id === selectedId) ?? null;

  async function runAudit() {
    if (!selected) return;
    setRunning(true);
    setRunError(null);
    try {
      const report = await requestAudit({ source: "demo", businessId: selected.id });
      router.push(`/reports/${report.id}`);
    } catch (err) {
      setRunError(err instanceof AuditRequestError ? err.message : "The audit could not be completed.");
      setRunning(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          Business name, category or city
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. bakery, plumbing, Port Alder"
          autoComplete="off"
          className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
        <p className="mt-2 text-xs text-slate-500">
          Search currently covers fictional demonstration businesses. Live Google search will be added in a future
          release.
        </p>
      </div>

      <div aria-live="polite">
        {search.status === "loading" && <p className="text-sm text-slate-500">Searching…</p>}
        {search.status === "error" && (
          <p className="rounded-xl bg-fail-soft px-4 py-3 text-sm text-fail">Search is unavailable right now. Please try again.</p>
        )}
        {search.status === "ready" && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="font-medium text-slate-800">No matching businesses</p>
            <p className="mt-1 text-sm text-slate-500">You can still audit any business by entering its details manually.</p>
          </div>
        )}
        {results.length > 0 && (
          <ul className="grid gap-3" role="listbox" aria-label="Search results">
            {results.map((r) => {
              const isSelected = r.id === selectedId;
              return (
                <li key={r.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : r.id)}
                    className={`w-full rounded-xl border bg-white p-4 text-left transition ${
                      isSelected ? "border-brand-500 ring-4 ring-brand-100" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{r.name}</div>
                        <div className="mt-0.5 text-sm text-slate-600">
                          {r.category} · {r.addressLine}
                        </div>
                        {r.summary && <p className="mt-2 text-sm text-slate-500">{r.summary}</p>}
                      </div>
                      {r.isDemo && <DemoBadge />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        {runError && <p className="mb-3 rounded-lg bg-fail-soft px-3 py-2 text-sm text-fail">{runError}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {selected ? (
              <>
                Selected: <strong className="text-slate-900">{selected.name}</strong>
              </>
            ) : (
              "Select a business to continue."
            )}
          </p>
          <button
            type="button"
            onClick={runAudit}
            disabled={!selected || running}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {running ? "Running audit…" : "Run audit"}
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-slate-600">
        Can&apos;t find the business?{" "}
        <Link href="/audit/manual" className="font-semibold text-brand-600 hover:underline">
          Enter its details manually
        </Link>
      </p>
    </div>
  );
}
