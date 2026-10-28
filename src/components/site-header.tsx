import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            LB
          </span>
          <span className="hidden sm:inline">Local Business Audit</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/reports" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            Saved reports
          </Link>
          <Link href="/audit/new" className="rounded-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700">
            New audit
          </Link>
        </nav>
      </div>
    </header>
  );
}
