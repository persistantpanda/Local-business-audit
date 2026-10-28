# Local Business Audit

A web application that audits a local business's online presence (Google Business Profile, website, local SEO, reviews,
name/address/phone consistency, photos and social presence, and customer conversion) and produces a scored,
customer-facing report with prioritized recommendations.

> **Status: MVP.** It runs on demonstration data and manual entry. Website checks use a real, server-side scan of the
> homepage. No paid APIs are used. Google Places integration is stubbed and disabled.

## Quick start

Requires Node.js 20.9+ (22 recommended, see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:3000
```

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Development server                         |
| `npm run build`     | Production build                           |
| `npm start`         | Serve the production build                 |
| `npm test`          | Unit and integration tests (Vitest)        |
| `npm run lint`      | ESLint                                     |
| `npm run typecheck` | TypeScript type check                      |

## How it works

```
Browser (Next.js pages)                    Server (route handlers)
───────────────────────                    ───────────────────────
/audit/new   search & select ── GET  /api/businesses ── demo provider (later: Google Places)
/audit/manual manual entry  ── POST /api/audits ─────── zod validation
                                                        → website scan (SSRF-safe fetch + HTML analysis)
                                                        → audit engine (pure TypeScript)
/reports/[id] report view  ◀── report JSON, saved in the browser (localStorage)
```

### Key directories

- `src/lib/audit/`: the **audit engine**. It's framework-free and fully unit-tested.
  - `types.ts`: facts in, report out. Every fact is optional, and a missing fact means **unknown**, never assumed.
  - `evaluators/`: one module per category. Each returns weighted checks with `pass`, `warn`, `fail` or `unknown` status.
  - `scoring.ts`: category and overall scoring, plus recommendation prioritization.
  - `nap.ts`: name, address and phone normalization and matching.
- `src/lib/providers/`: data sources behind a common `BusinessDataProvider` interface.
  - `demo-data.ts`: fictional demonstration businesses (reserved `555-01xx` phone numbers and `.example` domains).
  - `manual.ts`: manual-entry schema (zod) and its mapping to engine input.
  - `google-places.ts`: placeholder for the Google Places integration (server-only, disabled).
- `src/lib/website/`: the homepage fetcher (`fetch-page.ts`), the private-address guard (`address-guard.ts`) and the
  HTML analyzer (`analyze.ts`).
- `src/lib/server/`: server-only orchestration (`audit-service.ts`) and the rate limiter.
- `src/components/`: UI components (report, forms).

### Scoring rules

- A check scores 1 for pass, 0.5 for needs work and 0 for issue. A check with no data is **unknown**.
- A **category is scored only when every check has data**. Partially evaluated categories still show their findings,
  but they aren't scored.
- The **overall score** is a weighted average of the scored categories only. If any category is incomplete, the result
  is labeled **Preliminary**, along with the share of the audit it covers. If no category is complete, no score is shown.
- Recommendations come from failed and needs-work checks. Duplicates are merged, and the list is ranked by impact,
  severity, effort and how many checks a fix resolves.

## Security notes

- API keys are read only in server-only modules (`import "server-only"`) and must never use the `NEXT_PUBLIC_` prefix.
  See `.env.example`.
- The website scanner only allows http and https on standard ports. It rejects credentials in URLs, validates the
  resolved IP **inside the socket's DNS lookup** (which blocks private, loopback, link-local and metadata addresses
  and prevents DNS rebinding), re-checks every redirect, and caps time (10 s) and size (1.5 MB).
- Manual audits, which can trigger outbound requests, are rate limited per IP. The limiter is in memory, so replace it
  with a shared store before running multiple instances.
- Security headers, including CSP, frame denial and nosniff, are set in `next.config.ts`.

## Known limitations / next steps

- **Persistence:** reports are stored in the browser's localStorage, so they're per-device and there are no accounts
  yet. A database and authentication are needed before this becomes a paid product.
- **Google Places:** not implemented. See the plan in `src/lib/providers/google-places.ts`. It needs a billing-enabled
  Google Cloud key, so it requires owner approval first.
- **Website checks:** they analyze the homepage HTML as delivered by the server. They don't execute JavaScript or
  measure full page speed. A PageSpeed Insights integration could add real Core Web Vitals.
- **Facts the public APIs can't provide** (post frequency, owner response rate, claim status) still come from manual
  entry.
