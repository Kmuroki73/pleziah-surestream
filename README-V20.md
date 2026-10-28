# SURESTREAM V20 — deployment candidate

## What changed
- Sportmonks API v3 is now the primary server-side football data source through `/api/matches`.
- `SPORTMONKS_API_KEY` stays on the server; it must be configured in Vercel and redeployed.
- Optional `FOOTBALL_DATA_API_KEY` fallback is used only when Sportmonks is not configured.
- Match cards show a **Stream now** action leading to the correct match route. The watch screen loads that match's provider data instead of showing a fake Arsenal/Liverpool score.
- The app explicitly states that no authorized video stream is connected; a data key does not grant broadcast rights.
- Penalty Rush is marked **Coming soon** until the game is tested and ready.
- Partners page includes the DAZN affiliate application link and accurately states that no partnership is claimed.
- SEO title, description, robots and canonical metadata updated.
- Additive Supabase migration creates profiles, expiring stories, follows and a points ledger with RLS. Points must be granted by trusted server logic, not client-side code.
- Existing seat prices and manual M-PESA reference submission remain: Standard KSh 50, VIP KSh 50, VVIP KSh 100; payment remains pending until verified.

## Required Vercel environment variables
Required for primary data:
- `SPORTMONKS_API_KEY` — server-side only
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:
- `FOOTBALL_DATA_API_KEY` — fallback if Sportmonks is not configured
- `SCOREBAT_API_URL` and `SCOREBAT_API_TOKEN` — only if authorised ScoreBat feed access is available
- payment provider secrets only after payment server endpoints and webhooks are implemented

Never prefix provider secrets with `VITE_`. Never put a service-role key in the browser.

## Deployment steps
1. Upload the extracted `project/` contents to the intended SURESTREAM GitHub repository (not Songa Flight Watch).
2. Add `SPORTMONKS_API_KEY` under Vercel Project Settings → Environment Variables for Preview first.
3. Deploy a Preview. Open `/api/matches` directly and confirm JSON contains actual provider fixtures and `provider: "Sportmonks"`.
4. Test match cards, Stream now route, missing/invalid key states, auth, seat reservation, manual reference submission and mobile layouts.
5. Review and apply `supabase/migrations/202610250020_surestream_v20_social.sql` to the correct Supabase project. Existing migration should also be reviewed/applied if not already.
6. Promote only after a successful build and Preview test.

## Explicitly not production-complete yet
- A Sportmonks key supplies football data, **not video streams**. No stream provider / broadcast rights are included. The 15-minute video preview must not start until a lawful playable source exists.
- DAZN application has not been submitted by this code; use the link on `/partners`, submit the application and await approval.
- Automatic email to `lamineyamalapp@gmail.com` needs a configured transactional email service and secure server-side integration; this package does not claim that emails are being delivered.
- M-PESA STK Push, PayPal checkout/capture/webhooks and payment verification automation are not activated. Manual M-PESA references are recorded for review only and must not unlock viewing.
- Social tables are provided, but profile/story/follow/points screens and trusted point-awarding rules still need UI/backend completion.
- Free-game rewards after four games are not activated; they need anti-abuse controls and server-side tracking.
- Age confirmation, server-enforced 15-minute preview expiry, and authorized stream playback still require implementation and testing.
- Sportmonks endpoints, includes and data coverage can vary by plan; test with your actual trial key. Do not assume every competition or field is included.

## Honest verification status
This is a source candidate, not a claim of a certified production build. Build and browser/device tests must pass with real credentials before public launch.
