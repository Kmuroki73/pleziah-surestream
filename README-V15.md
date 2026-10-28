# SURESTREAM V15 — deployment candidate

## Included in this source package
- Live fixture integration through a Vercel serverless proxy (`/api/matches`) using football-data.org v4. The token stays server-side.
- Real match cards show actual teams, score, status, competition, and localized kickoff time; refreshes every 60 seconds. No fabricated fixture list is used for the fixture grid.
- ScoreBat feed proxy (`/api/scorebat`) for available highlight embeds only. It does not provide live full-match rights. The frontend still needs a highlight gallery integration if you want to display these results in a page.
- Seat tiers standardized to Standard KSh 50, VIP KSh 50, VVIP KSh 100, with per-event caps enforced by the supplied Supabase migration.
- Existing Penalty Rush canvas game, challenge links, local best scores, audio toggle and mobile responsive rendering retained.
- Existing Supabase reservation/auth concepts and protected-access gate retained from Phase 1–2.

## Vercel environment variables
Required for real fixture data:
- `FOOTBALL_DATA_API_KEY` — football-data.org token (server-side; do not prefix with `VITE_`).
- `VITE_SUPABASE_URL` — Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key.

Optional if ScoreBat API access is available:
- `SCOREBAT_API_URL` — defaults to `https://www.scorebat.com/video-api/v3/feed/`.
- `SCOREBAT_API_TOKEN` — ScoreBat token if your account/feed requires one.

`SUPABASE_SERVICE_ROLE_KEY`, PayPal secrets and M-PESA Daraja secrets must remain server-side and are not used by browser code. Do not place secret values in `VITE_*` variables.

## Deployment checks
1. Install dependencies and build.
2. Apply `supabase/migrations/202610250001_surestream_phase12.sql` in the intended Supabase project after reviewing it.
3. Set Vercel environment variables for Preview first, redeploy, then test `/api/matches` directly.
4. Confirm response contains real matches and inspect Vercel function logs for 401/403/429 errors. Available competitions depend on the provider's plan.
5. Test sign-in, seat reservation, payment-reference submission, capacity limits and access gating with test accounts.
6. Keep paid viewing disabled until payment is independently verified and an authorized playable video source is integrated.

## Honest limitations
This package does not make M-PESA automatic: manual payment references still require independent receipt verification. PayPal order/capture/webhook is not implemented. ScoreBat is only for clips/highlights the provider makes available and authorized; not full live match streaming. The 15-minute preview timer is not yet implemented. Match details, Fan Zone, teams, dashboard, and admin remain placeholder routes. These must not be advertised as complete.
