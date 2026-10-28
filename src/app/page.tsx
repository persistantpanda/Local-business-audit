import Link from "next/link";

const AREAS = [
  { title: "Google Business Profile", body: "Completeness, categories, hours, services, posts and links." },
  { title: "Reviews & reputation", body: "Rating, volume, recency, review pace and owner responses." },
  { title: "Website quality", body: "HTTPS, mobile layout, speed, titles, headings and image descriptions." },
  { title: "Local SEO", body: "Location signals, structured data, service keywords and directory coverage." },
  { title: "Name, address & phone", body: "Consistency of business details across the website and listings." },
  { title: "Photos & presence", body: "Photo coverage and freshness, plus social media activity." },
  { title: "Customer conversion", body: "Tap-to-call, contact forms, calls to action, booking and directions." },
];

const STEPS = [
  { n: 1, title: "Find the business", body: "Choose a demonstration business or enter details manually." },
  { n: 2, title: "Run the audit", body: "We check each area and scan the website when one is provided." },
  { n: 3, title: "Act on the report", body: "Get a scored, prioritized plan you can share with the business owner." },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-20">
          <p className="text-sm font-semibold text-brand-600">For local businesses and the people who help them grow</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            See exactly what&apos;s holding a local business back online.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Audit a business&apos;s Google profile, website, reviews, listings and more — then get a clear, prioritized list of
            fixes to win more calls, visits and customers.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/audit/new"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-600 px-6 text-base font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Start an audit
            </Link>
            <Link
              href="/audit/manual"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-semibold text-slate-800 hover:bg-slate-50"
            >
              Enter a business manually
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Try it with fictional demonstration businesses — no account or paid services required.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{s.n}</span>
              <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900">What we evaluate</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((a) => (
            <div key={a.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">{a.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{a.body}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <h3 className="font-semibold text-brand-900">Honest scoring</h3>
            <p className="mt-1 text-sm text-brand-800">
              We only score what we could actually evaluate. Anything incomplete is clearly labeled preliminary — never
              guessed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
