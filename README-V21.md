# SURESTREAM V21 — source candidate

A React + Vite football fan platform with server-side Sportmonks data proxy, fixture browser, match centre, brand assets, responsive styling and an 18+ self-declaration gate.

## Local setup
1. Use Node.js 20.19+ or 22.12+.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and set the Supabase public URL/key for your existing SURESTREAM project.
4. Run `npm run dev`.
5. For production verification run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Vercel environment variables
- `SPORTMONKS_API_KEY` — server-side only. Never prefix it with `VITE_`.
- `VITE_SUPABASE_URL` — existing SURESTREAM Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` — existing project anon/publishable key.
- `FOOTBALL_DATA_API_KEY` — optional fallback; only used if Sportmonks is not configured.

Deploy to a Vercel Preview first. Test `/api/matches` before switching production traffic. Provider coverage, includes, rate limits, live update cadence and competition access depend on the Sportmonks plan.

## V21 additions
- Custom SVG favicon, brand mark, social sharing card and PWA icon declarations.
- Original local stadium artwork and YAMAL mascot concept asset.
- Local hero art replaces third-party hero-image dependencies.
- Live match browser reads `/api/matches`; filters and search operate only on provider-returned fixtures.
- Match detail page shows events, lineups and statistics only when supplied by the provider. Player Quality Index (QI) is displayed only if the provider returns an actual rating field; no invented ratings.
- A site-wide 18+ self-declaration modal. This is not identity or age verification.
- Penalty Rush remains Coming Soon.

## Important release limits
- Sportmonks supplies football data, not broadcast video. A Stream now button opens the match viewing page, but it cannot play a match until a separately licensed stream provider is configured.
- A provider API key does not grant commercial redistribution rights to every data field, badge, image or competition.
- Payment automation (M-PESA Daraja/PayPal), transactional email delivery, the server-enforced 15-minute video preview, DAZN affiliate approval, social story/follow UI, server-authoritative points, and four-game reward redemption still require implementation and end-to-end tests. Do not market them as complete.
- Do not trust manual M-PESA references as proof of payment; verify transaction callbacks or admin reconciliation before granting access.
- Apply SQL migrations only to the correct SURESTREAM Supabase project after reviewing them. Never use Songa Flight Watch credentials or repository.

## Deployment verification
This package was assembled in an environment where npm dependency installation timed out. Syntax transpilation checks can be run, but the Vite production build, full typecheck, lint and browser/device tests have **not** been certified here. Treat this as a source candidate for Preview testing, not a guaranteed production-ready release.
