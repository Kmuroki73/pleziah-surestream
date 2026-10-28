# SURESTREAM V30 — Vercel-ready source package

## Included
- Visual reference screenshots are included in `reference-designs/`; these are design references and are not required at runtime.
- Rebranded SURESTREAM app based on the previous V22.1 codebase.
- Match Stories rail uses actual fixture data returned by `/api/matches`; it never invents live scores.
- Match cards link to `/watch/:id` and `/match/:id`.
- Profile editor for display name, handle, bio, jersey number and original archetype avatar. Profile persistence uses existing `fan_profiles` table when Supabase is configured and user is authenticated.
- ScoreBat provider adapter via Supabase Edge Function `scorebat-feed`, with an interchangeable provider contract in `src/lib/videoProviders.ts`.
- Responsive shared styles and reduced-motion support for animation.
- Existing match, watch, seat, streamer studio and legal routes retained.

## Deploy to Vercel
1. Upload/import the project root (the folder containing `package.json` and `vercel.json`) to GitHub/Vercel.
2. Framework: Vite. Build command `npm run build`; output directory `dist`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel. These are browser public values; never put the service-role key in `VITE_` variables.
4. Add `SPORTMONKS_API_KEY` as a server-only Vercel environment variable for `/api/matches`.
5. Configure Supabase Edge Function secret: `supabase secrets set SCOREBAT_API_TOKEN=YOUR_TOKEN`. Optional `SCOREBAT_API_URL=https://www.scorebat.com/video-api/v3/feed/`. Never commit the token.
6. Deploy the Edge Function: `supabase functions deploy scorebat-feed`. Set project URL and public anon key in Vercel so the client can invoke it.
7. Run the existing Supabase migrations in `supabase/migrations/` against the intended project after reviewing them. Do not overwrite or replace the existing Supabase project.
8. Configure Supabase Auth redirect URLs for the deployed Vercel domain.

## Provider compatibility
`src/lib/videoProviders.ts` defines a provider-neutral feed result. Future authorised providers should be implemented as a new Supabase Edge Function adapter returning `{ provider, mode, items, note, error }`, without exposing secret tokens to the browser. ScoreBat free-feed is for older/limited highlights; this free plan does not grant the restricted live-stream endpoint or broadcast rights.

## Honest integration status
This package does not include API credentials, DAZN credentials, payment gateway secrets, licensed live broadcast URLs, or a completed paid-access entitlement backend. Video feeds depend on configured providers. ScoreBat free feed is not live match coverage. Reservation/payment production use must not be enabled until server-side verification, capacity locking, payment webhooks and commercial permissions are configured and tested.

## Validation
Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`. Vercel must deploy the project root. Build success alone does not verify live provider playback, auth callbacks, payment webhooks, database policies, or concurrency.
