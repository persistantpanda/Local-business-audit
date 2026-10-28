import { formatAddress, formatPhone } from "@/lib/audit/nap";
import type { AuditReport, CategoryResult, CheckStatus, Recommendation } from "@/lib/audit/types";
import { DemoBadge, Pill } from "../ui/pill";
import { CATEGORY_STATUS, CHECK_STATUS, PRIORITY, SOURCE_LABEL, scoreColor } from "./labels";
import { ScoreRing } from "./score-ring";

const EFFORT_LABEL = { low: "Low effort", medium: "Moderate effort", high: "Significant effort" } as const;
const IMPACT_LABEL = { high: "High impact", medium: "Medium impact", low: "Low impact" } as const;

function countChecks(categories: CategoryResult[]): Record<CheckStatus, number> {
  const counts: Record<CheckStatus, number> = { pass: 0, warn: 0, fail: 0, unknown: 0 };
  for (const c of categories) for (const check of c.checks) counts[check.status] += 1;
  return counts;
}

function OverallStatusBanner({ report }: { report: AuditReport }) {
  const { overall } = report;
  if (overall.status === "final") {
    return (
      <p className="rounded-xl bg-pass-soft px-4 py-3 text-sm text-pass">
        <strong>Final score.</strong> All {overall.totalCategories} categories were fully evaluated.
      </p>
    );
  }
  if (overall.status === "preliminary") {
    return (
      <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
        <strong>Preliminary score.</strong> Based on {overall.completedCategories} of {overall.totalCategories} categories (
        {Math.round(overall.coverage * 100)}% of the audit). Categories with missing data are not scored and may change the
        result once completed.
      </p>
    );
  }
  return (
    <p className="rounded-xl bg-unknown-soft px-4 py-3 text-sm text-slate-700">
      <strong>Not enough data to score.</strong> No category had complete information. Add more details and run the audit
      again.
    </p>
  );
}

function RecommendationCard({ rec, index }: { rec: Recommendation; index?: number }) {
  return (
    <li className="print-break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {index !== undefined && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {index + 1}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-900">{rec.title}</h4>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill className={PRIORITY[rec.priority].pill}>{PRIORITY[rec.priority].label}</Pill>
            <Pill className="bg-slate-100 text-slate-700">{IMPACT_LABEL[rec.impact]}</Pill>
            <Pill className="bg-slate-100 text-slate-700">{EFFORT_LABEL[rec.effort]}</Pill>
            <Pill className="bg-brand-50 text-brand-700">{rec.categoryName}</Pill>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{rec.description}</p>
          {rec.affects.length > 1 && (
            <p className="mt-2 text-xs text-slate-500">Resolves: {rec.affects.join(" · ")}</p>
          )}
        </div>
      </div>
    </li>
  );
}

function CategorySummaryCard({ category }: { category: CategoryResult }) {
  const status = CATEGORY_STATUS[category.status];
  const issues = category.checks.filter((c) => c.status === "fail" || c.status === "warn").length;
  return (
    <a
      href={`#cat-${category.id}`}
      className="print-break-inside-avoid block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{category.name}</h3>
        <span className="text-lg font-bold tabular-nums" style={{ color: category.score === null ? "var(--color-unknown)" : scoreColor(category.score) }}>
          {category.score === null ? "—" : category.score}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        {category.score !== null ? (
          <div className="h-full rounded-full" style={{ width: `${category.score}%`, background: scoreColor(category.score) }} />
        ) : (
          <div className="h-full rounded-full bg-slate-300" style={{ width: `${Math.round(category.coverage * 100)}%` }} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <Pill className={status.pill}>{status.label}</Pill>
        <span>{category.status === "not_evaluated" ? "No data" : `${issues} ${issues === 1 ? "issue" : "issues"} found`}</span>
      </div>
    </a>
  );
}

function CategoryDetail({ category }: { category: CategoryResult }) {
  const status = CATEGORY_STATUS[category.status];
  return (
    <section id={`cat-${category.id}`} className="print-break-inside-avoid scroll-mt-20 rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{category.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{category.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Pill className={status.pill}>{status.label}</Pill>
          <span className="text-2xl font-bold tabular-nums" style={{ color: category.score === null ? "var(--color-unknown)" : scoreColor(category.score) }}>
            {category.score === null ? "—" : `${category.score}`}
            {category.score !== null && <span className="text-sm font-medium text-slate-400">/100</span>}
          </span>
        </div>
      </header>

      <ul className="divide-y divide-slate-100">
        {category.checks.map((check) => {
          const s = CHECK_STATUS[check.status];
          return (
            <li key={check.id} className="flex gap-3 px-4 py-3 sm:px-5">
              <span aria-hidden className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${s.pill}`}>
                {s.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-slate-900">{check.label}</span>
                  <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                </div>
                <p className="mt-0.5 break-words text-sm text-slate-600">{check.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {(category.notes.length > 0 || category.dataSources.length > 0) && (
        <footer className="space-y-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">
          {category.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          {category.dataSources.length > 0 && (
            <p>Data source: {category.dataSources.map((s) => SOURCE_LABEL[s]).join(", ")}</p>
          )}
        </footer>
      )}
    </section>
  );
}

export function ReportView({ report }: { report: AuditReport }) {
  const counts = countChecks(report.categories);
  const top = report.recommendations.slice(0, 3);
  const rest = report.recommendations.slice(3);
  const quickWins = report.recommendations.filter((r) => r.quickWin).slice(0, 5);
  const b = report.business;
  const auditDate = new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <article className="space-y-8">
      {report.isDemo && (
        <p className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <strong>Demonstration report.</strong> This business and all of its data are fictional and exist only to show how
          the audit works.
        </p>
      )}

      {/* Summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Online presence audit</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{b.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{b.category}</span>
              {report.isDemo && <DemoBadge />}
            </div>
            <dl className="mt-4 grid gap-1 text-sm text-slate-600">
              <div>
                <dt className="sr-only">Address</dt>
                <dd>{formatAddress(b.address)}</dd>
              </div>
              <div>
                <dt className="sr-only">Phone</dt>
                <dd>{formatPhone(b.phone)}</dd>
              </div>
              {b.website && (
                <div>
                  <dt className="sr-only">Website</dt>
                  <dd className="break-all">{b.website}</dd>
                </div>
              )}
              <div className="text-xs text-slate-400">Audited {auditDate}</div>
            </dl>
          </div>

          <div className="flex items-center gap-5 md:flex-col md:items-center md:gap-2">
            <ScoreRing score={report.overall.score} label={report.overall.status === "preliminary" ? "Preliminary" : "Score"} />
            <div className="md:text-center">
              <div className="text-lg font-semibold text-slate-900">{report.overall.grade ?? "Not scored"}</div>
              <div className="text-xs text-slate-500">out of 100</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <OverallStatusBanner report={report} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["fail", "warn", "pass", "unknown"] as const).map((s) => (
            <div key={s} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">{s === "fail" ? "Issues" : s === "warn" ? "Needs work" : s === "pass" ? "Passed" : "Unknown"}</dt>
              <dd className={`text-2xl font-bold tabular-nums ${CHECK_STATUS[s].text}`}>{counts[s]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Priorities */}
      {top.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Top priorities</h2>
          <p className="mt-1 text-sm text-slate-500">The changes likely to make the biggest difference, in order.</p>
          <ol className="mt-4 grid gap-3">
            {top.map((rec, i) => (
              <RecommendationCard key={rec.id} rec={rec} index={i} />
            ))}
          </ol>
        </section>
      )}

      {quickWins.length > 0 && (
        <section className="print-break-inside-avoid rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <h2 className="text-base font-bold text-brand-900">Quick wins</h2>
          <p className="mt-1 text-sm text-brand-700">Meaningful improvements that take little time or money.</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-800">
            {quickWins.map((r) => (
              <li key={r.id} className="flex gap-2">
                <span aria-hidden className="text-brand-600">→</span>
                {r.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Category overview */}
      <section>
        <h2 className="text-lg font-bold text-slate-900">Category scores</h2>
        <p className="mt-1 text-sm text-slate-500">Only categories with complete data receive a score.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {report.categories.map((c) => (
            <CategorySummaryCard key={c.id} category={c} />
          ))}
        </div>
      </section>

      {rest.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">All other recommendations</h2>
          <ol className="mt-4 grid gap-3">
            {rest.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </ol>
        </section>
      )}

      {/* Details */}
      <section>
        <h2 className="text-lg font-bold text-slate-900">Detailed findings</h2>
        <div className="mt-4 space-y-4">
          {report.categories.map((c) => (
            <CategoryDetail key={c.id} category={c} />
          ))}
        </div>
      </section>

      <section className="print-break-inside-avoid rounded-2xl bg-slate-100 p-5 text-xs leading-relaxed text-slate-600">
        <h2 className="text-sm font-semibold text-slate-800">How this audit works</h2>
        <p className="mt-2">
          Each category is made up of weighted checks. A check passes, needs work, has an issue, or is unknown when we
          don&apos;t have the data to judge it. A category is scored only when every check has data, and the overall score is
          a weighted average of scored categories only. When any category is incomplete, the overall score is labeled
          preliminary. Website checks review the homepage as delivered by the server; they don&apos;t measure full page
          rendering speed. Recommendations are ranked by expected impact, severity and effort.
        </p>
      </section>
    </article>
  );
}
