# SURESTREAM V20 — honest release status

## Implemented in this source candidate
- `/api/matches` now prefers Sportmonks API v3 and keeps the key server-side. `FOOTBALL_DATA_API_KEY` is an optional fallback only when the Sportmonks key is absent.
- Match cards include a Stream now action and route to the selected fixture.
- Watch page attempts to load the selected fixture from the provider instead of hard-coded Arsenal/Liverpool data; it explicitly states when authorized video is not connected.
- Penalty Rush is marked Coming soon.
- Partner page links to DAZN's affiliate application and avoids claiming approval or broadcast rights.
- SEO metadata added/updated.
- Additive SQL migration for public profiles, expiring stories, follows and a points ledger with RLS. Point awards must be server-side.
- Existing seat tiers and manual M-PESA reference workflow retained.

## Syntax checks
- 18 TypeScript/TSX source files passed TypeScript `transpileModule` syntax checks with zero syntax diagnostics.
- `npm ci --ignore-scripts --no-audit --no-fund` timed out in this environment.
- Vite is not installed locally here, so `npm run build`, full TypeScript typecheck, lint and browser/device tests were not completed. This ZIP is **not certified production-ready**.

## Required before Vercel Preview
1. Set `SPORTMONKS_API_KEY` in Vercel (Preview first), then redeploy. Never use `VITE_SPORTMONKS_API_KEY`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the existing SURESTREAM Supabase project.
3. Open `/api/matches` and check returned fixtures, provider and update time with the actual trial key. Sportmonks access to specific endpoints/includes/leagues depends on plan.
4. Test mobile and desktop, all routes, reserve and manual reference submission, provider errors, and account flow.
5. Review and apply `supabase/migrations/202610250020_surestream_v20_social.sql` to the correct Supabase project.

## Not complete — do not market these as working yet
- **Streaming:** Sportmonks is match data, not a video provider. Stream now opens the match-viewing page; it does not start a real stream. An authorized stream provider and rights are still required.
- **15-minute preview:** not enabled; cannot safely run without an authorized playable video source and server-enforced expiry.
- **Email to lamineyamalapp@gmail.com:** automatic email delivery is not implemented. It needs a configured transactional email provider and secure server-side integration.
- **Payments:** manual M-PESA reference submission only; reference is not proof of payment. PayPal and automated M-PESA/STK/webhook verification are not complete.
- **DAZN:** application link is provided; application must be submitted by the owner and approved. No partnership is claimed.
- **Social features:** SQL foundation only; story/profile/follow UI, secure point awards, activity rewards, and four-game reward redemption are not fully implemented.
- **18+ confirmation:** not implemented as an enforced site-wide gate.

Do not overwrite Songa Flight Watch. Upload only to the intended SURESTREAM repository and deploy Preview before Production.
